import re

from services.db_services.session import engine, SessionLocal, is_postgres
from sqlalchemy import inspect
from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase

# App tables (logins, chat history) are not part of the retail data and are
# hidden from the agent's schema description and SQL tool.
_PRIVATE_TABLES = ("users", "conversations", "messages")

def describe_schema_for_agent() -> str:
    insp = inspect(engine)
    lines = []
    for table_name in insp.get_table_names():
        if table_name in _PRIVATE_TABLES:
            continue
        cols = insp.get_columns(table_name)
        fks = insp.get_foreign_keys(table_name)
        fk_by_col = {fk["constrained_columns"][0]: fk for fk in fks if fk["constrained_columns"]}
 
        col_descs = []
        for c in cols:
            piece = f"{c['name']} {c['type']}"
            if c["name"] in fk_by_col:
                fk = fk_by_col[c["name"]]
                piece += f" -> {fk['referred_table']}.{fk['referred_columns'][0]}"
            col_descs.append(piece)
        lines.append(f"{table_name}({', '.join(col_descs)})")
 
    schema_text = "\n".join(lines)
    return (
        "DATABASE SCHEMA:\n" + schema_text + "\n\n"
        "IMPORTANT: each row in sales is an order line. final_price is the line total "
        "actually paid after any discount and regular_price is the line total at list "
        "price, so revenue is SUM(final_price). Do not compute revenue as "
        "quantity * skus.price -- it ignores promotional discounts entirely and will "
        "be wrong for any promoted period. sales.promotion_id is set on lines sold "
        "under a promotion. customer_id is NULL for guest checkouts: filter out NULLs "
        "when counting or grouping customers. For anything involving revenue, uplift, "
        "stockouts, or promotion classification, use the dedicated KPI tools instead "
        "of writing SQL directly. This tool is for lookups, counts, and filters only."
    )
 
_ALLOWED_PREFIXES = ("select", "with")
 
def is_read_only(sql: str) -> bool:
    cleaned = sql.strip().rstrip(";").strip().lower()
    if ";" in cleaned:
        return False  # no stacked statements
    return cleaned.startswith(_ALLOWED_PREFIXES)


def touches_private_table(sql: str) -> bool:
    return any(re.search(rf"\b{t}\b", sql, re.IGNORECASE) for t in _PRIVATE_TABLES)
 
 
def run_sql_query(sql: str, max_rows: int = 200) -> dict:
    if not is_read_only(sql):
        return {
            "error": "Only single SELECT (or WITH ... SELECT) statements are "
                      "permitted through this tool.",
            "rejected_sql": sql,
        }
    if touches_private_table(sql):
        return {
            "error": "That table is not part of the retail dataset.",
            "rejected_sql": sql,
        }

    session = SessionLocal()
    try:
        # Enforced by the database too, so a data-modifying CTE can't slip through.
        if is_postgres():
            session.execute(text("SET TRANSACTION READ ONLY"))
        else:
            session.execute(text("PRAGMA query_only = ON"))
        try:
            result = session.execute(text(sql))
            columns = list(result.keys())
            rows = result.fetchmany(max_rows)
        except Exception as e:
            return {"error": f"The query failed: {e.__class__.__name__}: {str(e).splitlines()[0]}", "rejected_sql": sql}
        return {
            "columns": columns,
            "rows": [dict(zip(columns, row)) for row in rows],
            "truncated": len(rows) == max_rows,
        }
    finally:
        if not is_postgres():
            session.execute(text("PRAGMA query_only = OFF"))
        session.rollback()
        session.close()


def add_to_db(models : list[DeclarativeBase]):
    session = SessionLocal()
    try:
        session.add_all(models)
        session.commit()
    except Exception as e:
        raise e
    finally:
        session.close()