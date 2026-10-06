"""Tool-only answers, used when no LLM is configured or the LLM call fails.

The briefing and follow-up answers are assembled directly from the same KPI
calculators and RAG searches the LangGraph agent uses, so every number still
comes from the data. What is lost without an LLM is free-form reasoning:
follow-up questions are routed to tools by keyword.
"""

from __future__ import annotations

import asyncio
import re
from datetime import timedelta
from typing import Optional

from sqlalchemy import func, select

from services.db_services.models import Promotion, Sale, Sku
from services.db_services.promotions_db import get_all_promotions, get_promotion_by_id
from services.db_services.session import SessionLocal
from services.kpi_services.kpi_calculators.discount_efficiency_calculator import get_discount_efficiency
from services.kpi_services.kpi_calculators.post_promo_dip_calculator import get_post_promo_dip
from services.kpi_services.kpi_calculators.redemption_demographics_calculator import get_redemption_demographic
from services.kpi_services.kpi_calculators.stockout_calculator import get_stockout_trace
from services.kpi_services.kpi_calculators.uplift_calculator import get_incremental_uplift
from services.rag_services.qdrant_services import (
    PROMOTION_GUIDEBOOK_COLLECTION_NAME,
    PROMOTION_PROFILE_COLLECTION_NAME,
    search_query,
)
from tools.kpi_tools.discount_efficiency_tool import _format_discount_efficiency
from tools.kpi_tools.incremental_uplift_calculator_tool import _format_uplift
from tools.kpi_tools.post_promo_dip_tool import _format_post_promo_dip
from tools.kpi_tools.redemption_demographic_tool import _format_redemption_demographics
from tools.kpi_tools.stockout_tracer_tool import _format_stockout_trace
from tools.query_tools.query_by_id import _format_promotion

ALL_TOOLS = (
    "get_promotion_by_id, get_incremental_sales_uplift, get_discount_efficiency, "
    "get_post_promo_dip, get_stockout_inventory_trace, get_redemption_demographics, "
    "search_promotion_profiles, search_sales_guidebook"
)

INTENTS = [
    ("discount_levels", ["discount level", "maximise roi", "maximize roi", "best discount", "optimal discount", "how deep"]),
    ("stockout", ["stockout", "stock-out", "stock out", "inventory", "supply", "sold out", "sell out", "ran out", "run out", "restock"]),
    ("dip", ["pull-forward", "pull forward", "dip", "post-promo", "post promo", "after the promo", "hangover", "stockpil"]),
    ("demographics", ["age", "young", "demograph", "under 25", "under-25", "audience", "who bought", "gen z", "student"]),
    ("compare", ["compare", "similar", "past promotion", "other promotion", "previous", "versus", " vs", "rank"]),
    ("skus", ["sku", "underperform", "which product", "which item", "best seller", "worst"]),
    ("efficiency", ["discount", "efficien", "roi", "margin", "cost", "worth", "profit"]),
    ("brief", ["objective", "goal", "brief", "channel", "mechanic", "planned", "planning"]),
    ("guide", ["what is", "what does", "define", "definition", "meaning", "explain", "how do i", "how is", "playbook", "recommend", "should", "improve", "next time"]),
    ("uplift", ["uplift", "lift", "sales", "revenue", "performance", "did it work", "success", "result"]),
]


# ── public API ────────────────────────────────────────────────────────────────

async def briefing_async(promotion_id: int, llm_error: Exception | None = None) -> str:
    return await asyncio.to_thread(briefing, promotion_id, llm_error)


async def answer_async(question: str, promotion_id: Optional[int], llm_error: Exception | None = None) -> str:
    return await asyncio.to_thread(answer, question, promotion_id, llm_error)


def briefing(promotion_id: int, llm_error: Exception | None = None) -> str:
    promotion = get_promotion_by_id(promotion_id)
    uplift = get_incremental_uplift(promotion_id)
    efficiency = get_discount_efficiency(promotion_id)
    dip = get_post_promo_dip(promotion_id)
    stock = get_stockout_trace(promotion_id)
    demo = get_redemption_demographic(promotion_id)
    profile = _profile(promotion)
    diagnoses = _diagnoses(uplift, dip, stock)

    drivers = []
    if profile.get("Objective"):
        drivers.append(f"Brief: {profile['Objective']}")
    if stock.any_stockout:
        out = [t for t in stock.sku_traces if t.stockout]
        first = min(t.stockout_date for t in out)
        drivers.append(
            f"Supply capped the result: {len(out)} of {len(stock.sku_traces)} targeted SKU(s) sold out, "
            f"the first on {first:%d %b %Y}, with about {stock.total_missed_units_estimate:g} units of demand missed. "
            "The measured uplift understates true demand."
        )
    if uplift.sales_up_revenue_down:
        drivers.append(
            f"The discount outran the demand it created: units rose {uplift.unit_sales_uplift:.1f}% "
            f"but revenue moved {uplift.revenue_uplift:+.1f}%."
        )
    elif "dud" in diagnoses:
        drivers.append("The offer did not move shoppers: units and revenue were flat or down against the baseline.")
    elif uplift.clean_win and uplift.revenue_uplift < 5:
        drivers.append(
            f"Units rose {uplift.unit_sales_uplift:.1f}% but revenue barely moved ({uplift.revenue_uplift:+.1f}%): "
            "the discount absorbed almost all of the extra volume."
        )
    elif uplift.clean_win:
        drivers.append(
            f"Demand responded strongly: units {uplift.unit_sales_uplift:+.1f}% and revenue "
            f"{uplift.revenue_uplift:+.1f}% against the baseline."
        )
    if dip.pull_forward_dip:
        drivers.append(
            f"Part of the lift was borrowed from later weeks: the post-promotion period ran at "
            f"{dip.post_period_ratio:.2f}x baseline."
        )
    if demo.over_indexed_under_25:
        drivers.append(
            f"Redemptions skewed young: {demo.under_25_share * 100:.0f}% of promoted sales were by under-25s "
            f"against {demo.customer_base_under_25_share * 100:.0f}% of the customer base."
        )
    if profile.get("Planning notes"):
        drivers.append(f"Planning note: {profile['Planning notes']}")

    recommendations = []
    for diagnosis in diagnoses[:2]:
        recommendations += _playbook(diagnosis)[:3]
    if not recommendations:
        recommendations = ["Repeat the mechanic and test a slightly shallower discount to protect margin."]

    sections = [
        "**Promotion Overview**",
        _format_promotion(promotion),
        "**Performance Highlights**",
        _bullets([
            _format_uplift(uplift),
            _format_discount_efficiency(efficiency),
            _format_post_promo_dip(dip),
            _format_stockout_trace(stock),
            _format_redemption_demographics(demo),
        ]),
        "**Key Drivers**",
        _bullets(drivers),
        "**Recommendations**",
        _bullets(recommendations),
        "**Tools Used**",
        _bullets([ALL_TOOLS]),
        "Ask about stockouts, pull-forward, the audience, discount levels, similar promotions or the SKU breakdown to dig deeper.",
        _note(llm_error),
    ]
    return "\n\n".join(sections)


def answer(question: str, promotion_id: Optional[int], llm_error: Exception | None = None) -> str:
    if promotion_id is None:
        return "Open a promotion from the library first so I know which one to analyse.\n\n" + _note(llm_error)

    # INTENTS is ordered from most to least specific; answer with the first match.
    q = f" {question.lower()} "
    intent = next((name for name, words in INTENTS if any(w in q for w in words)), None)

    if intent is None:
        parts = [
            _uplift(promotion_id, question),
            _efficiency(promotion_id, question),
            "I can answer questions about stockouts, pull-forward, the audience, discount efficiency, "
            "discount levels, similar promotions, the SKU breakdown, or KPI definitions from the guidebook.",
        ]
    else:
        parts = [HANDLERS[intent](promotion_id, question)]
        asks_definition = any(p in q for p in (" what is ", " what does ", " define", " meaning", " explain"))
        if asks_definition and intent not in ("guide", "dip"):
            parts.append(_guide(promotion_id, question))
    parts.append(_note(llm_error))
    return "\n\n".join(parts)


# ── intent handlers ──────────────────────────────────────────────────────────

def _uplift(promotion_id: int, _q: str) -> str:
    return "**Incremental uplift**\n\n" + _format_uplift(get_incremental_uplift(promotion_id))


def _efficiency(promotion_id: int, _q: str) -> str:
    return "**Discount efficiency**\n\n" + _format_discount_efficiency(get_discount_efficiency(promotion_id))


def _stockout(promotion_id: int, _q: str) -> str:
    trace = get_stockout_trace(promotion_id)
    lines = ["**Stock during the promotion**", _format_stockout_trace(trace)]
    if trace.any_stockout:
        lines.append(_bullets(_playbook("stockout")[:3]))
    return "\n\n".join(lines)


def _dip(promotion_id: int, _q: str) -> str:
    dip = get_post_promo_dip(promotion_id)
    lines = ["**After the promotion**", _format_post_promo_dip(dip)]
    excerpt = _guidebook_section("post-promotion dip and pull-forward")
    if excerpt:
        lines.append("From the sales guidebook:\n\n" + excerpt)
    return "\n\n".join(lines)


def _demographics(promotion_id: int, _q: str) -> str:
    text = _format_redemption_demographics(get_redemption_demographic(promotion_id))
    profile = _profile(get_promotion_by_id(promotion_id))
    lines = ["**Who redeemed it**", text]
    if profile.get("Target audience"):
        lines.append(f"The brief targeted: {profile['Target audience']}")
    return "\n\n".join(lines)


def _brief(promotion_id: int, _q: str) -> str:
    promotion = get_promotion_by_id(promotion_id)
    profile = _profile(promotion)
    if not profile:
        return "**Promotion brief**\n\nNo profile was found for this promotion in the promotion profiles."
    return "**Promotion brief** (from the promotion profiles)\n\n" + _bullets(
        [f"{k}: {v}" for k, v in profile.items()]
    )


def _guide(_promotion_id: int, question: str) -> str:
    try:
        texts = search_query(question, top_k=2, collection=PROMOTION_GUIDEBOOK_COLLECTION_NAME)
    except Exception as e:
        return f"**Sales guidebook**\n\nThe guidebook search failed: {e}"
    if not texts:
        return "**Sales guidebook**\n\nNothing relevant was found in the guidebook."
    return "**From the sales guidebook**\n\n" + _clean_markdown(texts[0])


def _compare(promotion_id: int, _q: str) -> str:
    current = get_promotion_by_id(promotion_id)
    peers = [p for p in get_all_promotions() if p.promotion_type == current.promotion_type]
    rows = []
    for p in peers:
        u = get_incremental_uplift(p.promotion_id)
        e = get_discount_efficiency(p.promotion_id)
        rows.append((p, u, e))
    rows.sort(key=lambda r: -(r[2].discount_efficiency_ratio if r[2].discount_efficiency_ratio is not None else -99))
    rank = next(i for i, r in enumerate(rows, 1) if r[0].promotion_id == promotion_id)
    lines = [
        f"**Compared with the other {current.promotion_type} promotions**",
        f"'{current.promotion_name}' ranks {rank} of {len(rows)} {current.promotion_type} promotions by discount efficiency.",
    ]
    bullets = []
    for p, u, e in rows:
        marker = " (this promotion)" if p.promotion_id == promotion_id else ""
        uplift = "no baseline" if u.unit_sales_uplift is None else f"units {u.unit_sales_uplift:+.0f}%, revenue {u.revenue_uplift:+.0f}%"
        eff = "n/a" if e.discount_efficiency_ratio is None else f"{e.discount_efficiency_ratio:.2f}x"
        bullets.append(f"**{p.promotion_name}**{marker}: {uplift}, efficiency {eff}")
    lines.append(_bullets(bullets))
    return "\n\n".join(lines)


def _discount_levels(promotion_id: int, _q: str) -> str:
    buckets: dict[str, list[float]] = {}
    for p in get_all_promotions():
        if p.promotion_type == "BOGO" or p.discount_percent is None:
            label = "BOGO (effective 50%)"
        elif p.discount_percent <= 20:
            label = "10-20% off"
        elif p.discount_percent <= 30:
            label = "21-30% off"
        else:
            label = "31-50% off"
        ratio = get_discount_efficiency(p.promotion_id).discount_efficiency_ratio
        if ratio is not None:
            buckets.setdefault(label, []).append(ratio)
    order = ["10-20% off", "21-30% off", "31-50% off", "BOGO (effective 50%)"]
    bullets = [
        f"**{label}**: average efficiency {sum(v) / len(v):.2f}x across {len(v)} promotion(s)"
        for label in order if (v := buckets.get(label))
    ]
    best = max((k for k in buckets), key=lambda k: sum(buckets[k]) / len(buckets[k]))
    current = get_discount_efficiency(promotion_id)
    lines = [
        "**Discount efficiency by discount level** (incremental revenue per $1 of discount, all promotions)",
        _bullets(bullets),
        f"Across the calendar, **{best}** returned the most incremental revenue per dollar of discount.",
        "This promotion: " + _format_discount_efficiency(current),
    ]
    return "\n\n".join(lines)


def _skus(promotion_id: int, _q: str) -> str:
    promotion = get_promotion_by_id(promotion_id)
    trace = {t.sku_id: t for t in get_stockout_trace(promotion_id).sku_traces}
    span = promotion.end_date - promotion.start_date
    base_end = promotion.start_date - timedelta(days=1)
    base_start = base_end - span
    session = SessionLocal()
    try:
        rows = []
        for link in promotion.sku_links:
            sku = session.get(Sku, link.sku_id)
            base = session.execute(select(func.coalesce(func.sum(Sale.quantity), 0)).where(
                Sale.sku_id == link.sku_id, Sale.sale_date >= base_start, Sale.sale_date <= base_end)).scalar()
            promo = session.execute(select(func.coalesce(func.sum(Sale.quantity), 0)).where(
                Sale.sku_id == link.sku_id, Sale.promotion_id == promotion_id)).scalar()
            rows.append((sku, int(base), int(promo)))
    finally:
        session.close()

    def change(base: int, promo: int) -> float | None:
        return None if base == 0 else (promo - base) / base * 100

    rows.sort(key=lambda r: change(r[1], r[2]) if change(r[1], r[2]) is not None else 9e9)
    bullets = []
    for sku, base, promo in rows:
        c = change(base, promo)
        pct = "no baseline sales" if c is None else f"{c:+.0f}%"
        why = ""
        t = trace.get(sku.sku_id)
        if t and t.stockout:
            why = f" Sold out on {t.stockout_date:%d %b}, about {t.missed_units_estimate:g} units missed."
        elif c is not None and c < 20:
            why = " Weak response to the offer."
        bullets.append(f"**SKU {sku.sku_id} {sku.sku_name}**: {base} -> {promo} units ({pct}).{why}")
    return "**SKU breakdown** (baseline vs promotion units, weakest first)\n\n" + _bullets(bullets)


HANDLERS = {
    "uplift": _uplift,
    "efficiency": _efficiency,
    "stockout": _stockout,
    "dip": _dip,
    "demographics": _demographics,
    "brief": _brief,
    "guide": _guide,
    "compare": _compare,
    "discount_levels": _discount_levels,
    "skus": _skus,
}


# ── helpers ──────────────────────────────────────────────────────────────────

def _diagnoses(uplift, dip, stock) -> list[str]:
    out = []
    if stock.any_stockout:
        out.append("stockout")
    if uplift.sales_up_revenue_down:
        out.append("volume up, revenue down")
    elif uplift.unit_sales_uplift is not None and uplift.unit_sales_uplift <= 0 and uplift.revenue_uplift <= 0:
        out.append("dud")
    if dip.pull_forward_dip:
        out.append("pull-forward")
    if uplift.clean_win and not out:
        out.append("clean win")
    return out


def _profile(promotion: Promotion) -> dict[str, str]:
    try:
        texts = search_query(promotion.promotion_name, top_k=3, collection=PROMOTION_PROFILE_COLLECTION_NAME)
    except Exception:
        return {}
    text = next((t for t in texts if t.startswith(promotion.promotion_name + ".")), None)
    if text is None:
        return {}
    labels = ["Objective", "Target audience", "Mechanic", "Channels", "Targeted SKUs", "Planning notes"]
    pattern = "(" + "|".join(re.escape(l) for l in labels) + "):"
    pieces = re.split(pattern, text)
    fields = {}
    for i in range(1, len(pieces) - 1, 2):
        fields[pieces[i]] = " ".join(pieces[i + 1].split()).strip()
    return fields


def _playbook(diagnosis: str) -> list[str]:
    section = _guidebook_raw(f"Diagnostic playbook: {diagnosis}", must_start=f"Diagnostic playbook: {diagnosis}")
    if not section:
        return []
    return [line[2:].strip() for line in section.splitlines() if line.startswith("- ")]


def _guidebook_section(heading: str) -> str:
    raw = _guidebook_raw(heading, must_start=heading)
    return _clean_markdown(raw) if raw else ""


def _guidebook_raw(query: str, must_start: str) -> str:
    try:
        texts = search_query(query, top_k=5, collection=PROMOTION_GUIDEBOOK_COLLECTION_NAME)
    except Exception:
        return ""
    for t in texts:
        if t.lower().startswith(must_start.lower()):
            return t
    return ""


def _clean_markdown(text: str) -> str:
    """Turns a guidebook chunk into the markdown subset the chat UI renders."""
    lines = text.splitlines()
    out = [f"**{lines[0].strip()}**"] if lines else []
    for line in lines[1:]:
        s = line.strip()
        if s.startswith("#"):
            continue
        if s.startswith("|"):
            cells = [c.strip() for c in s.strip("|").split("|")]
            if all(set(c) <= set("-: ") for c in cells):
                continue
            s = "• " + " · ".join(cells)
        out.append(s)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()


def _bullets(items: list[str]) -> str:
    return "\n".join(f"• {i}" for i in items if i)


def _note(llm_error: Exception | None) -> str:
    if llm_error is None:
        return ("Note: no LLM API key is configured, so this answer was assembled directly from the "
                "KPI and search tools. Add a key in backend/.env to enable the conversational agent.")
    reason = str(llm_error).splitlines()[0][:140] if str(llm_error) else llm_error.__class__.__name__
    return ("Note: the AI model could not be reached (" + reason + "), so this answer was assembled "
            "directly from the KPI and search tools.")
