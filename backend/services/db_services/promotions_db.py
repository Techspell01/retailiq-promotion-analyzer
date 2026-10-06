from services.db_services.session import SessionLocal, truncate_table
from  services.db_services.models import Promotion, PromotionSku
from  sqlalchemy import func, select, text

def add_promotions(promotions: list[Promotion]):
    session = SessionLocal()

    try:
        session.add_all(promotions)
        session.commit()
    except Exception as e:
        raise e
    finally:
        session.close()

def get_promotion_by_id(promotion_id: int) -> Promotion:
    session = SessionLocal()
    try:
        statement = select(Promotion).where(Promotion.promotion_id == promotion_id)
        result = session.scalar(statement)
        if result is None:
            raise Exception(f"could'nt find promotion with promotion_id : {promotion_id}")
        _ = result.sku_links
        return result
    except Exception as e:
        raise e
    finally:
        session.close()

def get_all_promotions() -> list[Promotion]:
    session = SessionLocal()
    try:
        statement = select(Promotion).order_by(Promotion.promotion_id)
        promotion = session.scalars(statement).all()
        return list(promotion)
    except Exception as e:
        raise e
    finally:
        session.close()

def count_promotions() -> int:
    session = SessionLocal()
    try:
        return session.scalar(select(func.count(Promotion.promotion_id))) or 0
    finally:
        session.close()

def get_promotions_as_page(pageNo: int, page_length: int) ->  list[Promotion]:
    session = SessionLocal()
    try:
        statement = (
            select(Promotion)
            .order_by(Promotion.start_date.desc(), Promotion.promotion_id.desc())
            .limit(page_length)
            .offset((pageNo-1)* page_length)
        )
        promotions_db =  session.scalars(statement).all()
        return list(promotions_db)
    except Exception as e:
        print(e)
        raise e
    finally:
        session.close()



def delete_all_promotions():
    session = SessionLocal()
    try:
        truncate_table(session, "promotion_sku")
        truncate_table(session, "promotions")
        session.commit()
    except Exception as e:
        print(e)
        raise e
    finally:
        session.close()

    