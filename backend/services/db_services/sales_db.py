from services.db_services.session import SessionLocal, truncate_table
from  services.db_services.models import Sale
from  sqlalchemy import select, text

def add_sales(sales: list[Sale]):
    session = SessionLocal()

    try:
        session.add_all(sales)
        session.commit()
    except Exception as e:
        raise e
    finally:
        session.close()

def delete_all_sales():
    session = SessionLocal() 
    try:
        truncate_table(session, "sales")
        session.commit()
    except Exception as e:
        print(e)
        raise e
    finally:
        session.close()