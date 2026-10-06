from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
import os

class Base(DeclarativeBase):
    pass

# PostgreSQL in production (DB_CONN=postgresql://...); a local SQLite file
# when DB_CONN is not set, so the app runs without a database server.
DATABASE_URL = os.getenv("DB_CONN") or "sqlite:///./retailiq.db"

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=_connect_args)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)


def is_postgres() -> bool:
    return engine.dialect.name == "postgresql"


def truncate_table(session: Session, table_name: str):
    if is_postgres():
        session.execute(text(f"TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE;"))
    else:
        session.execute(text(f"DELETE FROM {table_name};"))


def init_db():
    import services.db_services.models
    Base.metadata.create_all(bind=engine)
