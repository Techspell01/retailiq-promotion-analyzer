"""Deterministic synthetic dataset for the mock source-of-truth API.

The original project pulled its data from a separate source system on
localhost:3000 that is not part of this repository. This module recreates a
cosmetics retailer's year of data (products, SKUs, customers, promotions,
stock deliveries and sales) with a fixed seed, so every run produces the same
numbers.

Promotions are given traits that shape their outcome, so the KPI tools have
real stories to find:

    clean_win    strong lift, revenue up
    vol_down     deep discount, more units but less revenue
    dud          little or no lift
    pull_forward strong lift, then sales sag after the promotion
    stockout     launched on thin stock, sells out before the end
    young_skew   redemptions skew to customers under 25
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from datetime import date, timedelta
from functools import lru_cache

SEED = 119
DATA_START = date(2025, 10, 1)
DATA_END = date(2026, 9, 30)
CUSTOMER_COUNT = 1200

# (name, brand, category, description, base price, variant kind, variants, product orders/day)
PRODUCTS = [
    ("Mattifying Pressed Powder", "Aurora Beauty", "Face", "Oil-control pressed powder with a soft matte finish.", 18.0, "color", ["Ivory", "Beige", "Honey", "Caramel"], 2.2),
    ("Luminous Liquid Foundation", "Velvet Lane", "Face", "Medium-coverage foundation with a dewy finish and SPF 15.", 32.0, "color", ["Porcelain", "Sand", "Golden", "Mocha"], 2.6),
    ("Full Cover Concealer", "Aurora Beauty", "Face", "Creamy, crease-proof concealer for dark circles and blemishes.", 14.0, "color", ["Light", "Medium", "Tan"], 1.6),
    ("Silk Setting Spray", "PureGlow Labs", "Face", "Lightweight mist that locks make-up in place for up to 16 hours.", 22.0, "size", ["50ml", "100ml"], 1.1),
    ("Blush Duo", "Velvet Lane", "Face", "Two complementary blush shades in one compact.", 19.0, "color", ["Peach Petal", "Rose Dust"], 0.9),
    ("Highlighter Stick", "Maison Iris", "Face", "Buildable cream highlighter for a lit-from-within glow.", 24.0, "color", ["Champagne", "Rose Gold"], 0.8),
    ("Volume Mascara", "Aurora Beauty", "Eyes", "Lengthening, clump-free mascara.", 12.0, "color", ["Black", "Brown"], 2.4),
    ("Precision Liquid Eyeliner", "Velvet Lane", "Eyes", "Felt-tip liner for sharp wings, smudge-proof all day.", 11.0, "color", ["Jet Black", "Espresso"], 1.5),
    ("Nude Eyeshadow Palette", "Maison Iris", "Eyes", "Twelve everyday nude shades in matte and shimmer.", 38.0, "size", ["12-pan"], 0.9),
    ("Brow Sculpting Gel", "PureGlow Labs", "Eyes", "Tinted gel that shapes and holds brows.", 13.0, "color", ["Clear", "Taupe", "Dark Brown"], 1.0),
    ("Kohl Kajal", "Herbal Roots", "Eyes", "Long-wear kajal enriched with almond oil.", 6.0, "color", ["Black"], 2.0),
    ("Velvet Matte Lipstick", "Velvet Lane", "Lips", "Comfort-matte bullet lipstick with rich pigment.", 16.0, "color", ["Ruby Red", "Mauve Muse", "Nude Crush", "Berry Bliss"], 2.8),
    ("Hydrating Lip Gloss", "Aurora Beauty", "Lips", "Non-sticky gloss with hyaluronic acid.", 10.0, "color", ["Clear", "Pink Shimmer", "Coral"], 1.7),
    ("Tinted Lip Balm", "Herbal Roots", "Lips", "Shea-butter balm with a sheer tint and SPF 10.", 7.0, "color", ["Cherry", "Rose", "Natural"], 1.9),
    ("Lip Liner", "Maison Iris", "Lips", "Creamy, long-wear lip liner.", 9.0, "color", ["Nude", "Plum"], 0.8),
    ("Vitamin C Brightening Serum", "Nova Skin", "Skincare", "15% vitamin C serum for dull, uneven skin.", 29.0, "size", ["15ml", "30ml"], 2.0),
    ("Hyaluronic Moisturizer", "Nova Skin", "Skincare", "Oil-free gel moisturiser with triple hyaluronic acid.", 21.0, "size", ["50ml", "100ml"], 2.1),
    ("Gentle Foaming Cleanser", "PureGlow Labs", "Skincare", "pH-balanced daily cleanser for all skin types.", 12.0, "size", ["150ml", "300ml"], 2.3),
    ("SPF 50 Sunscreen", "Nova Skin", "Skincare", "Broad-spectrum SPF 50 PA++++ with no white cast.", 17.0, "size", ["50ml", "100ml"], 2.0),
    ("Retinol Night Cream", "Maison Iris", "Skincare", "Encapsulated retinol night cream for fine lines.", 34.0, "size", ["50ml"], 0.9),
    ("Clay Face Mask", "Herbal Roots", "Skincare", "Kaolin and green tea mask that clears pores.", 15.0, "size", ["100g"], 1.0),
    ("Micellar Cleansing Water", "PureGlow Labs", "Skincare", "No-rinse make-up remover and cleanser.", 9.0, "size", ["200ml", "400ml"], 1.6),
    ("Argan Repair Shampoo", "Herbal Roots", "Haircare", "Sulphate-free shampoo with argan oil for damaged hair.", 14.0, "size", ["250ml", "500ml"], 1.8),
    ("Keratin Smooth Conditioner", "Herbal Roots", "Haircare", "Keratin conditioner that tames frizz.", 15.0, "size", ["250ml", "500ml"], 1.4),
    ("Heat Protect Spray", "PureGlow Labs", "Haircare", "Thermal protection up to 230°C.", 16.0, "size", ["150ml"], 0.8),
    ("Curl Defining Cream", "Nova Skin", "Haircare", "Leave-in cream for bouncy, defined curls.", 18.0, "size", ["200ml"], 0.7),
    ("Rose Oud Eau de Parfum", "Maison Iris", "Fragrance", "Warm rose and oud signature scent.", 48.0, "size", ["30ml", "50ml", "100ml"], 0.9),
    ("Citrus Bloom Eau de Toilette", "Aurora Beauty", "Fragrance", "Fresh bergamot, neroli and white musk.", 36.0, "size", ["50ml", "100ml"], 0.8),
    ("Vanilla Musk Body Mist", "Velvet Lane", "Fragrance", "Light, everyday vanilla body mist.", 14.0, "size", ["150ml"], 1.5),
]

SIZE_PRICE_STEP = {0: 1.0, 1: 1.65, 2: 2.4}

# (name, type, discount %, categories, earliest start, duration (end - start, days), sku count, traits, description)
PROMOTION_SPECS = [
    ("Diwali Glow Festival", "Seasonal Sale", 25, ["Face"], date(2025, 10, 12), 10, 4, {"clean_win"}, "Festive-season offer on complexion favourites for Diwali gifting and parties."),
    ("Festive Fragrance Week", "Percentage Off", 20, ["Fragrance"], date(2025, 10, 14), 7, 3, {"clean_win"}, "A week of savings on signature scents ahead of the festive gifting rush."),
    ("Lip Love Flash Sale", "Flash Sale", 40, ["Lips"], date(2025, 10, 22), 2, 3, {"vol_down"}, "72-hour flash pricing on best-selling lip colours."),
    ("BOGO Mascara Madness", "BOGO", None, ["Eyes"], date(2025, 11, 3), 7, 2, {"vol_down"}, "Buy one mascara, get one free."),
    ("Winter Hydration Edit", "Percentage Off", 15, ["Skincare"], date(2025, 11, 10), 13, 3, {"clean_win"}, "Moisture-boosting skincare for the dry winter months."),
    ("Black Friday Beauty Blast", "Flash Sale", 50, ["Face", "Skincare"], date(2025, 11, 27), 3, 5, {"pull_forward", "stockout"}, "Half price on hero products for the Black Friday weekend."),
    ("Cyber Monday Skincare Steals", "Flash Sale", 35, ["Skincare"], date(2025, 12, 1), 1, 3, {"pull_forward"}, "48-hour online-first deals on skincare staples."),
    ("Holiday Gift Sets", "Seasonal Sale", 20, ["Fragrance"], date(2025, 12, 10), 12, 3, {"clean_win"}, "Holiday gifting offer on fragrances."),
    ("Weekend Lipstick Flash", "Flash Sale", 30, ["Lips"], date(2025, 12, 20), 1, 2, set(), "Weekend-only flash price on matte lipsticks."),
    ("New Year Skin Reset", "Percentage Off", 20, ["Skincare"], date(2026, 1, 3), 10, 3, set(), "Start the year with a fresh routine: cleansers, serums and moisturisers on offer."),
    ("Hair Rescue Week", "BOGO", None, ["Haircare"], date(2026, 1, 12), 7, 2, set(), "Buy one, get one free on repair shampoo and conditioner."),
    ("Concealer Clearance", "Percentage Off", 45, ["Face"], date(2026, 1, 18), 10, 2, {"dud"}, "Clearance pricing on concealer shades ahead of a formula change."),
    ("Republic Day Flash", "Flash Sale", 26, ["Eyes", "Lips"], date(2026, 1, 24), 2, 3, set(), "Three-day Republic Day flash deal."),
    ("Valentine's Lip Love", "Seasonal Sale", 20, ["Lips"], date(2026, 2, 5), 8, 4, {"clean_win"}, "Valentine's offer on lip colour and gloss."),
    ("Galentine's Glam Flash", "Flash Sale", 35, ["Eyes"], date(2026, 2, 11), 2, 3, {"young_skew"}, "Glam-night eye make-up deals for Galentine's Day."),
    ("Self-Care Sunday BOGO", "BOGO", None, ["Skincare"], date(2026, 2, 20), 6, 2, {"clean_win"}, "Buy one, get one free on cleansing essentials."),
    ("Holi Colour-Safe Haircare", "Percentage Off", 25, ["Haircare"], date(2026, 2, 26), 7, 3, {"dud"}, "Protect and repair hair before and after Holi."),
    ("Spring Refresh Sale", "Seasonal Sale", 20, ["Face"], date(2026, 3, 14), 14, 4, set(), "Lighter textures for spring: foundations, sprays and blush."),
    ("Gen-Z Glow Drop", "Flash Sale", 35, ["Face", "Lips"], date(2026, 3, 20), 3, 3, {"young_skew", "clean_win"}, "Creator-led flash drop on trending glow products."),
    ("Brow & Liner Days", "Percentage Off", 30, ["Eyes"], date(2026, 4, 4), 7, 2, {"vol_down"}, "Brow gels and liners at 30% off."),
    ("SPF Season Kickoff", "Percentage Off", 15, ["Skincare:SPF"], date(2026, 4, 8), 10, 2, {"stockout"}, "Kick off summer with savings on SPF 50 sunscreen."),
    ("Fragrance Clearance", "Percentage Off", 40, ["Fragrance"], date(2026, 4, 18), 10, 3, {"dud"}, "Clearance on slower-moving fragrance sizes."),
    ("Curl Care Week", "Percentage Off", 20, ["Haircare"], date(2026, 4, 25), 7, 2, set(), "Savings on curl and heat-styling care."),
    ("Mother's Day Pamper Edit", "Seasonal Sale", 20, ["Skincare", "Fragrance"], date(2026, 5, 1), 9, 4, {"clean_win"}, "Pamper-worthy gifts for Mother's Day."),
    ("BOGO Lip Gloss", "BOGO", None, ["Lips"], date(2026, 5, 14), 7, 2, {"young_skew"}, "Buy one gloss, get one free."),
    ("Eye Palette Spotlight", "Percentage Off", 25, ["Eyes"], date(2026, 5, 24), 10, 2, {"clean_win"}, "Spotlight offer on the nude eyeshadow palette and brow gel."),
    ("Summer Skin Saver", "Seasonal Sale", 25, ["Skincare"], date(2026, 6, 1), 20, 4, {"pull_forward"}, "Three weeks of summer skincare savings."),
    ("Monsoon Frizz Fighters", "Percentage Off", 20, ["Haircare"], date(2026, 6, 18), 10, 3, {"clean_win"}, "Anti-frizz haircare for the monsoon season."),
    ("Mid-Year Mega Flash", "Flash Sale", 50, ["Face"], date(2026, 6, 25), 2, 4, {"vol_down", "pull_forward"}, "Half-price mid-year flash sale on face make-up."),
    ("Kajal & Kohl Week", "Percentage Off", 15, ["Eyes"], date(2026, 7, 4), 7, 2, {"dud"}, "Everyday kajal and kohl at 15% off."),
    ("Body Mist BOGO", "BOGO", None, ["Fragrance:Mist"], date(2026, 7, 8), 7, 1, {"young_skew"}, "Buy one body mist, get one free."),
    ("Back to Campus Glow", "Percentage Off", 25, ["Face", "Lips", "Eyes"], date(2026, 7, 24), 14, 4, {"young_skew", "clean_win"}, "Student offer on everyday make-up for the new semester."),
    ("BOGO Clay Mask Mania", "BOGO", None, ["Skincare:Mask"], date(2026, 8, 1), 7, 1, {"vol_down"}, "Buy one clay mask, get one free."),
    ("Onam Festive Glow", "Seasonal Sale", 20, ["Face"], date(2026, 8, 14), 10, 3, {"clean_win"}, "Festive glow offer for Onam celebrations."),
    ("Foundation Shade Match Week", "Percentage Off", 15, ["Face:Foundation"], date(2026, 8, 26), 7, 3, {"stockout"}, "In-store shade matching with 15% off foundation."),
    ("Night Repair Flash", "Flash Sale", 30, ["Skincare"], date(2026, 9, 4), 2, 2, set(), "Flash deal on night-time repair skincare."),
    ("Fragrance Discovery Days", "Percentage Off", 20, ["Fragrance"], date(2026, 9, 5), 7, 3, {"clean_win"}, "Discover new signature scents at 20% off."),
    ("Lip Liner Launch Offer", "Percentage Off", 15, ["Lips"], date(2026, 9, 10), 7, 2, set(), "Introductory offer on the lip liner range."),
]

REGULAR_QTY = ([1, 2, 3], [0.8, 0.17, 0.03])
PROMO_QTY = ([1, 2, 3], [0.66, 0.26, 0.08])
BOGO_QTY = ([2, 4], [0.78, 0.22])


def _mean(dist: tuple[list[int], list[float]]) -> float:
    return sum(q * w for q, w in zip(*dist))


QTY_RATIO = _mean(PROMO_QTY) / _mean(REGULAR_QTY)
BOGO_QTY_RATIO = _mean(BOGO_QTY) / _mean(REGULAR_QTY)

CHANNELS = {
    "Flash Sale": "App push notifications, email countdown and homepage takeover.",
    "Seasonal Sale": "In-store displays, email newsletter and social media.",
    "Percentage Off": "Email newsletter and in-store shelf talkers.",
    "BOGO": "In-store end-caps and app banners.",
}


@dataclass
class PromoPlan:
    spec_index: int
    name: str
    type: str
    discount: int | None
    start: date
    end: date
    sku_ids: list[int]
    traits: set[str]
    description: str
    lift: float = 1.0
    post_multiplier: float = 1.0
    young_share: float | None = None
    promotion_id: int = 0


@dataclass
class Dataset:
    products: list[dict] = field(default_factory=list)
    skus: list[dict] = field(default_factory=list)
    customers: list[dict] = field(default_factory=list)
    promotions: list[dict] = field(default_factory=list)
    fulfillment_history: list[dict] = field(default_factory=list)
    sales: list[dict] = field(default_factory=list)
    profiles: list[dict] = field(default_factory=list)


def _days(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def _poisson(rng: random.Random, lam: float) -> int:
    if lam <= 0:
        return 0
    limit, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= limit:
            return k
        k += 1


def _orders(rng: random.Random, lam: float) -> int:
    """Daily order count with mean `lam` and about half the variance of a
    Poisson draw, so short promotion windows aren't dominated by noise."""
    half = lam / 2
    fixed = int(half) + (1 if rng.random() < half - int(half) else 0)
    return fixed + _poisson(rng, half)


def _build_catalog(rng: random.Random, ds: Dataset) -> dict[int, dict]:
    sku_meta: dict[int, dict] = {}
    sku_id = 1
    for product_id, (name, brand, category, desc, price, kind, variants, rate) in enumerate(PRODUCTS, start=1):
        ds.products.append({
            "product_id": product_id,
            "product_name": name,
            "product_description": desc,
            "product_brand": brand,
            "product_category": category,
        })
        weights = [rng.uniform(0.6, 1.4) for _ in variants]
        total = sum(weights)
        for i, variant in enumerate(variants):
            sku_price = round(price * SIZE_PRICE_STEP.get(i, 1.0), 2) if kind == "size" else price
            ds.skus.append({
                "sku_id": sku_id,
                "product_id": product_id,
                "sku_name": f"{name} - {variant}",
                "size": variant if kind == "size" else None,
                "color": variant if kind == "color" else None,
                "price": sku_price,
            })
            sku_meta[sku_id] = {
                "category": category,
                "product": name,
                "price": sku_price,
                "rate": 3.5 * rate * weights[i] / total * (1.0 if kind == "color" else 1.0 / (1 + 0.25 * i)),
            }
            sku_id += 1
    return sku_meta


def _build_customers(rng: random.Random, ds: Dataset):
    age_bands = [((18, 24), 0.22), ((25, 34), 0.31), ((35, 44), 0.22), ((45, 54), 0.15), ((55, 70), 0.10)]
    genders = [("Female", 0.72), ("Male", 0.23), ("Non-binary", 0.05)]
    ethnicities = [("Asian", 0.46), ("White", 0.2), ("Black", 0.11), ("Hispanic", 0.1), ("Middle Eastern", 0.07), ("Mixed", 0.06)]

    def pick(options):
        return rng.choices([o for o, _ in options], weights=[w for _, w in options])[0]

    for customer_id in range(1, CUSTOMER_COUNT + 1):
        lo, hi = pick(age_bands)
        ds.customers.append({
            "customer_id": customer_id,
            "customer_age": rng.randint(lo, hi),
            "customer_gender": pick(genders),
            "ethnicity": pick(ethnicities),
        })


def _candidate_skus(categories: list[str], sku_meta: dict[int, dict]) -> list[int]:
    out = []
    for cat in categories:
        cat, _, keyword = cat.partition(":")
        for sku_id, meta in sku_meta.items():
            if meta["category"] != cat:
                continue
            if keyword and keyword.lower() not in meta["product"].lower():
                continue
            out.append(sku_id)
    return out


def _plan_promotions(rng: random.Random, sku_meta: dict[int, dict]) -> list[PromoPlan]:
    # Each SKU keeps a list of "reserved" intervals: a promotion plus an
    # equal-length baseline before it and post period after it. Promotions
    # never share a reserved interval on the same SKU, so every baseline and
    # post-period comparison is clean.
    reserved: dict[int, list[tuple[date, date]]] = {sku_id: [] for sku_id in sku_meta}

    def free(sku_id: int, lo: date, hi: date) -> bool:
        return all(hi < a or lo > b for a, b in reserved[sku_id])

    plans: list[PromoPlan] = []
    for idx, (name, ptype, discount, cats, earliest, duration, n_skus, traits, desc) in enumerate(PROMOTION_SPECS):
        candidates = _candidate_skus(cats, sku_meta)
        # popular SKUs first so promotions target meaningful volume
        candidates.sort(key=lambda s: -sku_meta[s]["rate"])
        placed = False
        for shift in range(0, 25):
            start = earliest + timedelta(days=shift)
            end = start + timedelta(days=duration)
            lo = start - timedelta(days=duration + 1)
            hi = end + timedelta(days=duration + 1)
            if lo < DATA_START + timedelta(days=10) or hi > DATA_END:
                continue
            pool = [s for s in candidates if free(s, lo, hi)]
            if len(pool) < n_skus:
                continue
            top = pool[: max(n_skus + 2, n_skus)]
            chosen = sorted(rng.sample(top, n_skus))
            for s in chosen:
                reserved[s].append((lo, hi))
            plans.append(PromoPlan(idx, name, ptype, discount, start, end, chosen, set(traits), desc))
            placed = True
            break
        if not placed:
            raise RuntimeError(f"could not place promotion {name!r}")

    # Lifts are set from the revenue (or unit) ratio each trait should produce.
    # Promotion orders are bigger than regular ones (QTY_RATIO, or about 2x for
    # BOGO pairs), so the order-rate lift is backed out from the target ratio.
    for plan in plans:
        bogo = plan.type == "BOGO"
        qty_ratio = BOGO_QTY_RATIO if bogo else QTY_RATIO
        paid_share = 0.5 if bogo else 1 - plan.discount / 100

        def for_revenue(lo: float, hi: float) -> float:
            return rng.uniform(lo, hi) / (qty_ratio * paid_share)

        if "vol_down" in plan.traits:
            plan.lift = for_revenue(0.72, 0.86)
        elif "dud" in plan.traits:
            plan.lift = rng.uniform(0.8, 0.95) / qty_ratio
        elif "clean_win" in plan.traits or "pull_forward" in plan.traits:
            plan.lift = for_revenue(1.35, 1.8)
        else:
            plan.lift = for_revenue(1.1, 1.45)
        if "stockout" in plan.traits:
            plan.lift = max(plan.lift, for_revenue(1.7, 2.0))
        if "pull_forward" in plan.traits:
            plan.post_multiplier = rng.uniform(0.42, 0.58)
        else:
            plan.post_multiplier = rng.uniform(0.92, 1.03)
        if "young_skew" in plan.traits:
            plan.young_share = rng.uniform(0.55, 0.66)

    plans.sort(key=lambda p: (p.start, p.spec_index))
    for i, plan in enumerate(plans, start=1):
        plan.promotion_id = i
    return plans


def _seasonality(day: date, meta: dict) -> float:
    m = 1.0
    if day.weekday() >= 5:
        m *= 1.22
    if day.month in (11, 12):
        m *= 1.12
    if meta["category"] == "Skincare" and "SPF" in meta["product"] and day.month in (4, 5, 6):
        m *= 1.3
    if meta["category"] == "Haircare" and day.month in (6, 7, 8):
        m *= 1.15
    return m


def generate() -> Dataset:
    rng = random.Random(SEED)
    ds = Dataset()
    sku_meta = _build_catalog(rng, ds)
    _build_customers(rng, ds)
    plans = _plan_promotions(rng, sku_meta)

    young = [c["customer_id"] for c in ds.customers if c["customer_age"] < 25]
    older = [c["customer_id"] for c in ds.customers if c["customer_age"] >= 25]
    base_young_share = len(young) / len(ds.customers)

    promo_by_sku_day: dict[tuple[int, date], PromoPlan] = {}
    post_by_sku_day: dict[tuple[int, date], PromoPlan] = {}
    for plan in plans:
        span = (plan.end - plan.start).days
        for sku_id in plan.sku_ids:
            for d in _days(plan.start, plan.end):
                promo_by_sku_day[(sku_id, d)] = plan
            for d in _days(plan.end + timedelta(days=1), plan.end + timedelta(days=span + 1)):
                post_by_sku_day[(sku_id, d)] = plan

    all_days = list(_days(DATA_START, DATA_END))

    # Phase 1: unconstrained demand (what customers would buy with unlimited stock).
    demand: dict[int, dict[date, list[tuple[int, int | None]]]] = {}
    for sku_id, meta in sku_meta.items():
        per_day: dict[date, list[tuple[int, int | None]]] = {}
        for d in all_days:
            plan = promo_by_sku_day.get((sku_id, d))
            post = post_by_sku_day.get((sku_id, d))
            lam = meta["rate"] * _seasonality(d, meta)
            if plan:
                lam *= plan.lift
            elif post:
                lam *= post.post_multiplier
            orders = []
            for _ in range(_orders(rng, lam)):
                dist = BOGO_QTY if plan and plan.type == "BOGO" else PROMO_QTY if plan else REGULAR_QTY
                qty = rng.choices(dist[0], weights=dist[1])[0]
                customer_id: int | None = None
                if rng.random() > 0.08:
                    share = plan.young_share if plan and plan.young_share else base_young_share
                    customer_id = rng.choice(young) if rng.random() < share else rng.choice(older)
                orders.append((qty, customer_id))
            per_day[d] = orders
        demand[sku_id] = per_day

    # Phase 2+3: replenishment plan and inventory-constrained sales.
    sales_rows: list[dict] = []
    receipts: list[dict] = []
    sku_state: dict[int, dict] = {}
    for sku_id, meta in sku_meta.items():
        cycle = rng.choice([14, 21, 28])
        offset = rng.randint(0, cycle - 1)
        receipt_days = {DATA_START} | {d for d in all_days if (d - DATA_START).days % cycle == offset}
        stockout_plans = [p for p in plans if "stockout" in p.traits and sku_id in p.sku_ids]
        for p in stockout_plans:
            # Supplier delay: the regular delivery before launch is replaced by
            # a small one, and the next delivery lands only after the promotion.
            last_before = p.start - timedelta(days=rng.randint(4, 7))
            restock = p.end + timedelta(days=rng.randint(1, 3))
            receipt_days = {d for d in receipt_days if not (p.start - timedelta(days=cycle) < d <= restock)}
            receipt_days |= {last_before, restock}
        ordered_receipts = sorted(receipt_days)

        def units(lo: date, hi: date) -> int:
            return sum(q for d in _days(lo, hi) for q, _ in demand[sku_id].get(d, []))

        stock = 0
        for i, d in enumerate(all_days):
            if d in receipt_days:
                nxt_idx = ordered_receipts.index(d) + 1
                nxt = ordered_receipts[nxt_idx] if nxt_idx < len(ordered_receipts) else DATA_END + timedelta(days=1)
                target = None
                for p in stockout_plans:
                    if d < p.start <= nxt:
                        target = units(d, p.start - timedelta(days=1)) + 0.42 * units(p.start, p.end)
                    elif nxt < p.start <= nxt + timedelta(days=cycle):
                        # the delivery before the short one: no safety stock left over
                        target = float(units(d, nxt - timedelta(days=1)))
                if target is None:
                    target = units(d, nxt - timedelta(days=1)) * 1.3 + meta["rate"] * 5 + 6
                qty = int(math.ceil(max(0.0, target - stock) / 6.0) * 6)
                if qty > 0:
                    receipts.append({"sku_id": sku_id, "fulfillment_date": d, "quantity_received": qty})
                    stock += qty
            for qty, customer_id in demand[sku_id][d]:
                if stock <= 0:
                    break
                sold = min(qty, stock)
                plan = promo_by_sku_day.get((sku_id, d))
                price = meta["price"]
                regular = round(price * sold, 2)
                if plan is None:
                    final = regular
                elif plan.type == "BOGO":
                    final = round(price * math.ceil(sold / 2), 2)
                else:
                    final = round(regular * (1 - plan.discount / 100), 2)
                sales_rows.append({
                    "sku_id": sku_id,
                    "promotion_id": plan.promotion_id if plan else None,
                    "regular_price": regular,
                    "final_price": final,
                    "customer_id": customer_id,
                    "quantity": sold,
                    "sale_date": d,
                })
                stock -= sold
        sku_receipts = [r for r in receipts if r["sku_id"] == sku_id]
        last = max(r["fulfillment_date"] for r in sku_receipts)
        sku_state[sku_id] = {
            "in_stock": stock,
            "last_fulfillment_date": last,
            "next_fulfillment_date": last + timedelta(days=cycle),
        }

    for sku in ds.skus:
        sku.update(sku_state[sku["sku_id"]])

    receipts.sort(key=lambda r: (r["fulfillment_date"], r["sku_id"]))
    for i, r in enumerate(receipts, start=1):
        ds.fulfillment_history.append({"fulfillment_id": i, **r})

    sales_rows.sort(key=lambda r: (r["sale_date"], r["sku_id"]))
    for i, r in enumerate(sales_rows, start=1):
        ds.sales.append({"sales_id": i, **r})

    sku_names = {s["sku_id"]: s["sku_name"] for s in ds.skus}
    for plan in plans:
        ds.promotions.append({
            "promotion_id": plan.promotion_id,
            "promotion_name": plan.name,
            "promotion_description": plan.description,
            "promotion_type": plan.type,
            "discount_percent": plan.discount,
            "start_date": plan.start,
            "end_date": plan.end,
            "target_skus": plan.sku_ids,
        })
        ds.profiles.append(_profile(plan, sku_names))
    return ds


def _profile(plan: PromoPlan, sku_names: dict[int, str]) -> dict:
    if plan.type == "BOGO":
        mechanic = "Buy one, get one free on the targeted SKUs (effective 50% off per pair)."
    elif plan.type == "Flash Sale":
        mechanic = f"Time-boxed flash pricing at {plan.discount}% off for {(plan.end - plan.start).days + 1} day(s)."
    else:
        mechanic = f"{plan.discount}% off the targeted SKUs for the full promotion window."

    if "young_skew" in plan.traits:
        audience = ("Students and first-jobbers aged 18-24, reached through Instagram Reels, "
                    "creator collaborations and campus ambassadors.")
    elif plan.type == "Seasonal Sale":
        audience = "Festive and gifting shoppers across all age groups, plus existing loyalty members."
    else:
        audience = "Existing loyalty members and regular shoppers of the category."

    if "vol_down" in plan.traits:
        objective = "Drive store and app traffic with an eye-catching price point; margin dilution accepted by the category manager."
    elif "dud" in plan.traits:
        objective = "Clear ageing or slow-moving stock with minimal media support."
    elif "pull_forward" in plan.traits:
        objective = "Maximise short-term volume during a high-traffic shopping window."
    else:
        objective = "Grow incremental sales of the targeted SKUs without eroding full-price revenue."

    notes = []
    if "stockout" in plan.traits:
        notes.append("Supply chain flagged a delay on the replenishment shipment for the targeted SKUs. "
                     "The team chose to launch on existing stock rather than postpone, with the next "
                     "delivery expected shortly after the promotion ends.")
    if "pull_forward" in plan.traits:
        notes.append("Heavy countdown messaging. The targeted products are easy to stockpile, so "
                     "customers may buy ahead; finance asked for the weeks after the event to be monitored.")
    if "dud" in plan.traits:
        notes.append("No paid media and no in-store display space were allocated.")
    if "young_skew" in plan.traits:
        notes.append("Creative was built with campus creators; success metric is new-to-brand customers under 25.")
    if not notes:
        notes.append("Standard calendar promotion supported through the usual owned channels.")

    return {
        "promotion_id": plan.promotion_id,
        "title": plan.name,
        "type": plan.type,
        "start": plan.start.isoformat(),
        "end": plan.end.isoformat(),
        "objective": objective,
        "audience": audience,
        "mechanic": mechanic,
        "channels": CHANNELS[plan.type],
        "targeted": [sku_names[s] for s in plan.sku_ids],
        "notes": notes,
    }


@lru_cache(maxsize=1)
def dataset() -> Dataset:
    return generate()


if __name__ == "__main__":
    ds = dataset()
    print(f"products={len(ds.products)} skus={len(ds.skus)} customers={len(ds.customers)} "
          f"promotions={len(ds.promotions)} receipts={len(ds.fulfillment_history)} sales={len(ds.sales)}")
