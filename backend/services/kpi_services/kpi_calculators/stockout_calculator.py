from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from services.db_services.models import FulfillmentHistory, Sale, Promotion
from services.db_services.session import SessionLocal
from services.db_services.promotions_db import get_promotion_by_id
from services.kpi_services.kpi_calculators.models import StockoutTrace, SkuInventoryTrace
    
def stockout_inventory_trace_calculator(session: Session, promotion: Promotion) -> StockoutTrace:

    sku_ids = [sku_link.sku_id for sku_link in promotion.sku_links]

    sku_traces = []
    for sku_id in sku_ids:
        received_before = session.execute(
            select(func.sum(FulfillmentHistory.quantity_received)).where(
                FulfillmentHistory.sku_id == sku_id,
                FulfillmentHistory.fulfillment_date < promotion.start_date,
            )
        ).scalar() or 0

        sold_before = session.execute(
            select(func.sum(Sale.quantity)).where(
                Sale.sku_id == sku_id,
                Sale.sale_date < promotion.start_date,
            )
        ).scalar() or 0

        opening_stock = received_before - sold_before

        sold_by_day = dict(session.execute(
            select(Sale.sale_date, func.sum(Sale.quantity)).where(
                Sale.sku_id == sku_id,
                Sale.sale_date >= promotion.start_date,
                Sale.sale_date <= promotion.end_date,
            ).group_by(Sale.sale_date)
        ).tuples().all())

        received_by_day = dict(session.execute(
            select(FulfillmentHistory.fulfillment_date, func.sum(FulfillmentHistory.quantity_received)).where(
                FulfillmentHistory.sku_id == sku_id,
                FulfillmentHistory.fulfillment_date >= promotion.start_date,
                FulfillmentHistory.fulfillment_date <= promotion.end_date,
            ).group_by(FulfillmentHistory.fulfillment_date)
        ).tuples().all())

        # Walk the window day by day. A stockout is the shelf running empty
        # with promotion days still left to sell.
        running_stock = opening_stock
        stockout_date = None
        day = promotion.start_date
        while day <= promotion.end_date:
            running_stock += received_by_day.get(day, 0)
            running_stock -= sold_by_day.get(day, 0)
            if running_stock <= 0 and stockout_date is None and day < promotion.end_date:
                stockout_date = day
            day += timedelta(days=1)
        closing_stock = running_stock
        units_sold = sum(sold_by_day.values())

        missed_units_estimate = 0.0
        if stockout_date is not None:
            pre_stockout_units = sum(q for d, q in sold_by_day.items() if d <= stockout_date)
            pre_stockout_days = (stockout_date - promotion.start_date).days + 1
            pre_stockout_rate = pre_stockout_units / pre_stockout_days

            post_stockout_units = sum(q for d, q in sold_by_day.items() if d > stockout_date)
            remaining_days = (promotion.end_date - stockout_date).days
            projected_units = pre_stockout_rate * remaining_days
            missed_units_estimate = round(max(0.0, projected_units - post_stockout_units), 1)

        next_restock_date = session.execute(
            select(func.min(FulfillmentHistory.fulfillment_date)).where(
                FulfillmentHistory.sku_id == sku_id,
                FulfillmentHistory.fulfillment_date > promotion.end_date,
            )
        ).scalar()

        sku_traces.append(SkuInventoryTrace(
            sku_id=sku_id,
            opening_stock=opening_stock,
            units_sold=units_sold,
            closing_stock=closing_stock,
            stockout=stockout_date is not None,
            stockout_date=stockout_date,
            next_restock_date=next_restock_date,
            missed_units_estimate=missed_units_estimate,
        ))

    return StockoutTrace(
        promotion_id=promotion.promotion_id,
        any_stockout=any(t.stockout for t in sku_traces),
        total_missed_units_estimate=round(sum(t.missed_units_estimate for t in sku_traces), 1),
        sku_traces=sku_traces,
    )

def get_stockout_trace(promotion_id: int) -> StockoutTrace:
    session = SessionLocal()
    try:
        promotion = get_promotion_by_id(promotion_id)
        post_promo_dip = stockout_inventory_trace_calculator(session, promotion)
        return post_promo_dip
    except Exception as e:
        raise e
    finally:
        session.close()