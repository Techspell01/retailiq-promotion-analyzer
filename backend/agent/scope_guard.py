"""Keeps the assistant a specialist: retail promotion analysis only.

Three layers, cheapest first:
1. `is_out_of_scope` catches obvious off-topic requests (writing code,
   creative writing, general trivia) before any LLM call, so they cost no quota.
2. The system prompt tells the model to reply OUT_OF_SCOPE to anything else
   outside the domain (agent_prompt.py).
3. `enforce` swaps the marker, or an answer that contains program code, for
   the standard refusal.
"""

from __future__ import annotations

import re

OUT_OF_SCOPE_MARKER = "OUT_OF_SCOPE"

REFUSAL = (
    "I'm RetailIQ's promotion performance analyst, so I can only help with retail "
    "promotion analysis: this promotion's sales uplift, discount efficiency, stockouts, "
    "pull-forward, customer demographics, comparisons with other promotions, and "
    "recommendations for the next one.\n\n"
    "Try asking: **Which SKUs underperformed and why?**"
)

SMALL_TALK_REPLY = (
    "Hello! Ask me anything about this promotion's performance, for example its "
    "uplift, stockouts, the customers it reached, or what to change next time."
)

# Kept deliberately narrow so real retail questions never trip it: words that
# also mean something in retail ("Ruby Red", "Spring Refresh Sale", "how did
# customers react", "loyalty program", "promo code") are left out or excluded.
_LANGUAGES = r"java|javascript|typescript|python|c\+\+|c#|golang|kotlin|php|perl|scala|html|css|powershell|matlab"
_RETAIL_CODES = re.compile(
    r"\b(?:promo|promotion|promotional|discount|coupon|voucher|offer|sku|product|bar|qr)\s+codes?\b"
    r"|\bcodes?\b(?=[^.?!]{0,30}\b(?:promo|promotion|discount|coupon|voucher|offer)s?\b)",
    re.I,
)
_OFF_TOPIC = [
    re.compile(rf"(?<![\w+#])(?:{_LANGUAGES})(?![\w+#])", re.I),
    re.compile(r"\bhello[\s,]*world\b", re.I),
    re.compile(r"\b(?:write|create|generate|build|make|give me|show me)\b(?:\s+\S+){0,4}?\s+(?:code|script|snippet|algorithm|website|webpage|app)\b", re.I),
    re.compile(r"(?<!loyalty )(?<!rewards )(?<!reward )(?<!referral )(?<!membership )\bprogram (?:in|to|that|which|for printing)\b", re.I),
    re.compile(r"\b(?:poem|poetry|haiku|lyrics|song|joke|riddle|limerick)\b", re.I),
    re.compile(r"\b(?:recipe|weather|horoscope|capital of|prime minister|world cup|cricket score|movie|netflix)\b", re.I),
]
_SMALL_TALK = re.compile(
    r"^\s*(?:hi|hii+|hello|hey|hai|good (?:morning|afternoon|evening)|thanks|thank you|thank u|ok|okay|cool|great|nice)[\s!.,]*$",
    re.I,
)

_CODE_FENCE = re.compile(r"```([\w+#-]*)[^\n]*\n(.*?)```", re.S)
_ALLOWED_FENCES = {"", "sql", "text", "markdown", "md", "csv", "plaintext"}
_CODE_MARKERS = re.compile(
    r"public\s+static\s+void\s+main|System\.out\.print|#include\s*<|console\.log\(|"
    r"^\s*def\s+\w+\(|^\s*function\s+\w+\(|^\s*import\s+java\.|^\s*print\(\s*[\"']",
    re.I | re.M,
)


def is_out_of_scope(message: str) -> bool:
    text = _RETAIL_CODES.sub(" ", message)
    return any(p.search(text) for p in _OFF_TOPIC)


def is_small_talk(message: str) -> bool:
    return bool(_SMALL_TALK.match(message))


def contains_program_code(answer: str) -> bool:
    for lang, body in _CODE_FENCE.findall(answer):
        if lang.lower() not in _ALLOWED_FENCES or _CODE_MARKERS.search(body):
            return True
    return bool(_CODE_MARKERS.search(answer))


def enforce(answer: str) -> str:
    """Returns the refusal instead of an answer that left the domain."""
    if OUT_OF_SCOPE_MARKER in answer or contains_program_code(answer):
        return REFUSAL
    return answer
