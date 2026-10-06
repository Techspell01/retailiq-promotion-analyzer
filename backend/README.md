# Retail Promotions Performance Analyzer — Backend

> Part of the combined RetailIQ project. For the one-command setup (no
> PostgreSQL, Qdrant or embedding server needed) see the [root README](../README.md).

A FastAPI backend that ingests retail sales/promotions data, stores it in a relational
database, and exposes it through a REST + WebSocket API. A LangGraph-powered AI agent sits
on top of the data, using dedicated KPI tools, SQL lookups, and a RAG-indexed sales
guidebook/promotion profiles to answer natural-language questions about promotion
performance in a chat interface.

## Features

- **Data pipeline** — pulls product, customer, SKU, sales, fulfillment, bundle, and
  promotions data from external APIs and loads it into the database (`services/pipeline_services`).
- **REST API** — authenticated endpoints for promotions, SKUs, conversations, and manual
  data reloads (`api/routes`).
- **AI analysis agent** — a LangGraph agent (`agent/agent.py`) backed by an OSS model served
  via Cerebras, with tool access to:
  - KPI calculators: incremental uplift, discount efficiency, post-promo dip, stockout
    tracing, redemption demographics (`tools/kpi_tools`)
  - Read-only SQL query execution and ID lookups (`tools/query_tools`)
  - RAG retrieval over the sales guidebook and promotion profiles, embedded and indexed in
    Qdrant (`tools/rag_tools`, `services/rag_services`)
- **Chat over WebSockets** — real-time conversation with the agent per promotion, with
  persisted message history (`api/websockets/conversation_socket.py`).
- **JWT authentication** — username/password login issuing bearer tokens, enforced via
  middleware on protected routes (`api/user_services`, `api/utils/jwt_utils.py`).

## Tech stack

- **Framework:** FastAPI + Uvicorn
- **Database:** SQLAlchemy ORM (PostgreSQL via `psycopg2`)
- **Agent / LLM orchestration:** LangGraph, LangChain, OpenAI-compatible client pointed at
  Cerebras (`gpt-oss-120b`)
- **Vector store:** Qdrant (for the RAG-indexed sales guidebook and promotion profiles)
- **Auth:** `python-jose` (JWT), `passlib[bcrypt]` (password hashing)
- **Package/dependency management:** [`uv`](https://docs.astral.sh/uv/)
- **Python:** 3.12

## Project structure

```
api/                    FastAPI app, routes, middleware, request/response models
agent/                  LangGraph agent, prompts, and conversation persistence
services/
  api_services/         Clients for external source-of-truth APIs
  db_services/          SQLAlchemy models and DB access functions
  pipeline_services/    ETL pipelines that load external API data into the DB
  rag_services/         Document loading, chunking, embedding, Qdrant indexing
  kpi_services/         Historic KPI calculation logic
tools/
  kpi_tools/            Agent-callable KPI tools (uplift, discount efficiency, etc.)
  query_tools/          Agent-callable SQL/lookup tools
  rag_tools/            Agent-callable RAG retrieval tool
documents/              Source documents for RAG (sales guidebook, promotion profiles)
main.py                 App entrypoint
```

## Getting started

### Prerequisites

- Python 3.12
- [`uv`](https://docs.astral.sh/uv/) installed
- Optional: a PostgreSQL database (defaults to a local SQLite file)
- Optional: a Qdrant instance (defaults to embedded Qdrant in `.qdrant/`)
- Optional: an LLM API key, e.g. Cerebras (without one the chat answers from the KPI tools)

### Setup

1. Install dependencies:

   ```bash
   uv sync
   ```

2. Copy `.env.example` to `.env` and fill in what you need (every setting is optional).

3. Run the app:

   ```bash
   uv run main.py
   ```

   On startup this initializes the database schema, creates the default user
   (`admin` / `admin123`, see `bootstrap.py`), loads the data from the source API if the
   database is empty, and indexes the RAG documents. Start the source API first with
   `uv run python -m mock_source_api`.

### Loading data

- **Initial/manual pipeline run:** trigger `POST /api/v1/data/reload` (authenticated) to
  pull the latest data from the external source APIs into the database.
- **RAG index:** the sales guidebook and promotion profiles in `documents/` are chunked,
  embedded and loaded into Qdrant automatically on startup (`bootstrap.py`), and re-indexed
  when they change.

## API overview

All routes are mounted under `/api/v1`. Except for `/user/login`, all routes require a
`Bearer` JWT obtained from login.

| Method | Path | Description |
|---|---|---|
| POST | `/user/login` | Authenticate and receive a JWT access token |
| GET | `/promotions?page=` | Paginated list of promotions |
| GET | `/skus` | List all SKUs |
| POST | `/data/reload` | Re-run the ETL pipeline from external APIs into the DB |
| POST | `/conversation` | Start a new agent conversation for a promotion |
| GET | `/conversations` | List the current user's conversations |
| WS | `/ws/conversation/{conversation_id}/{promotion_id}` | Real-time chat with the analysis agent (token passed as `?token=`) |

## Development notes

- Interactive API docs are available at `/docs` (Swagger UI) and `/redoc` once the server
  is running.
- CORS allows the Vite dev server (`http://localhost:5173`); override with `CORS_ORIGINS`.
  When `../frontend/dist` exists the backend also serves the built frontend at `/`.
