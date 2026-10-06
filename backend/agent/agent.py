from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Optional

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import START, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_openai import ChatOpenAI

from agent.agent_graph_state import AgentState
from agent.agent_prompt import build_kickoff_instruction, build_system_prompt
from agent.agent_persistance import (
    load_lc_history,
    save_assistant_message,
    save_user_message,
)

from agent import offline_agent
from tools.tools import tools
TOOLS = tools

logger = logging.getLogger(__name__)

# LLM_PROVIDER=openai talks to any OpenAI-compatible endpoint; the defaults
# are the original setup (gpt-oss-120b on Cerebras). LLM_PROVIDER=gemini uses
# Google's own client, which Gemini 3 needs for tool calling. See .env.example.
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").lower()
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.cerebras.ai/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "gemini-3.5-flash" if LLM_PROVIDER == "gemini" else "gpt-oss-120b")
# Optional second model on the same provider, tried when a turn fails on the
# main one (free tiers rate-limit per model, so this doubles the headroom).
LLM_FALLBACK_MODEL = os.getenv("LLM_FALLBACK_MODEL") or None


def llm_api_key() -> str | None:
    if LLM_PROVIDER == "gemini":
        return os.getenv("LLM_API_KEY") or os.getenv("GOOGLE_API_KEY")
    return os.getenv("LLM_API_KEY") or os.getenv("CEREBRAS_API_KEY")


def llm_enabled() -> bool:
    return bool(llm_api_key())


def _chat_model(model_name: str):
    # With a fallback configured, give up on the main model quickly.
    retries = 1 if LLM_FALLBACK_MODEL and model_name == LLM_MODEL else 2
    if LLM_PROVIDER == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=llm_api_key(),
            timeout=120,
            max_retries=retries,
        )
    headers = {"X-Cerebras-3rd-Party-Integration": "langgraph"} if "cerebras" in LLM_BASE_URL else None
    return ChatOpenAI(
        model=model_name,
        api_key=llm_api_key(),
        base_url=LLM_BASE_URL,
        default_headers=headers,
        timeout=120,
        max_retries=retries,
    )


async def _run_agent(state: AgentState) -> str:
    """One agent turn on the main model, retried from scratch on the fallback
    model if that fails. History is stored as plain text, so a turn can move
    between models safely."""
    try:
        return _final_text(await get_graph().ainvoke(state, {"recursion_limit": 40}))
    except Exception:
        if not LLM_FALLBACK_MODEL:
            raise
        logger.warning("main model %s failed, retrying the turn on %s", LLM_MODEL, LLM_FALLBACK_MODEL, exc_info=True)
        fresh = {**state, "messages": list(state["messages"])}
        return _final_text(await get_graph(LLM_FALLBACK_MODEL).ainvoke(fresh, {"recursion_limit": 40}))


@lru_cache(maxsize=2)
def get_graph(model_name: str = LLM_MODEL):
    """Build & compile the graph once per model, then reuse it across all sockets."""
    model_with_tools = _chat_model(model_name).bind_tools(TOOLS)

    async def agent_node(state: AgentState) -> dict:
        response = await model_with_tools.ainvoke(state["messages"])
        return {"messages": [response]}

    builder = StateGraph(AgentState)
    builder.add_node("agent", agent_node)
    builder.add_node("tools", ToolNode(TOOLS))

    builder.add_edge(START, "agent")
    builder.add_conditional_edges("agent", tools_condition)
    builder.add_edge("tools", "agent")

    return builder.compile()


def _coerce_int(value, field: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be an integer, got {value!r}") from exc


def _coerce_optional_int(value) -> Optional[int]:
    if value in (None, "", "null", "None"):
        return None
    return _coerce_int(value, "promotion_id")


def _build_initial_state(
    user_id: int,
    conversation_id: int,
    promotion_id: Optional[int],
    history: list,
    message: str,
) -> AgentState:
    return {
        "messages": [
            SystemMessage(build_system_prompt(promotion_id)),
            *history,
            HumanMessage(message),
        ],
        "user_id": user_id,
        "conversation_id": conversation_id,
        "promotion_id": promotion_id,
    }


async def process_message(
    user_id,
    conversation_id,
    message: str,
    promotion_id,
) -> str:
    """Run one turn and return the assistant's final answer as a string."""
    user_id = _coerce_int(user_id, "user_id")
    conversation_id = _coerce_int(conversation_id, "conversation_id")
    promotion_id = _coerce_optional_int(promotion_id)

    history = await load_lc_history(conversation_id)
    await save_user_message(conversation_id, message)

    if llm_enabled():
        try:
            state = _build_initial_state(user_id, conversation_id, promotion_id, history, message)
            answer = await _run_agent(state)
        except Exception as e:
            logger.exception("LLM agent failed, answering from the KPI tools instead")
            answer = await offline_agent.answer_async(message, promotion_id, llm_error=e)
    else:
        answer = await offline_agent.answer_async(message, promotion_id)

    await save_assistant_message(conversation_id, answer)
    return answer


async def generate_initial_analysis(
    user_id,
    conversation_id,
    promotion_id,
) -> str:
    user_id = _coerce_int(user_id, "user_id")
    conversation_id = _coerce_int(conversation_id, "conversation_id")
    promotion_id = _coerce_optional_int(promotion_id)
    if promotion_id is None:
        raise ValueError("generate_initial_analysis requires a promotion_id")

    state: AgentState = {
        "messages": [
            SystemMessage(build_system_prompt(promotion_id)),
            HumanMessage(build_kickoff_instruction(promotion_id)),
        ],
        "user_id": user_id,
        "conversation_id": conversation_id,
        "promotion_id": promotion_id,
    }
    if llm_enabled():
        try:
            answer = await _run_agent(state)
        except Exception as e:
            logger.exception("LLM agent failed, building the briefing from the KPI tools instead")
            answer = await offline_agent.briefing_async(promotion_id, llm_error=e)
    else:
        answer = await offline_agent.briefing_async(promotion_id)

    await save_assistant_message(conversation_id, answer)
    return answer


def _final_text(result: dict) -> str:
    final = result["messages"][-1]
    content = final.content
    if isinstance(content, list):
        # some providers return content blocks rather than a plain string
        content = "".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in content)
    if not content or not str(content).strip():
        raise ValueError("the model returned an empty answer")
    return str(content)