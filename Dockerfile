# Production-style image: the built React app served by the FastAPI backend.
# Used by docker-compose.yml (PostgreSQL + Qdrant). For local demos, start.bat
# / run.py is simpler and needs no Docker.

FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:0.8 /uv /usr/local/bin/uv
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-install-project
COPY backend/ ./
COPY --from=web /web/dist /app/frontend/dist
ENV PATH="/app/backend/.venv/bin:$PATH" \
    PYTHONUTF8=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0
EXPOSE 8000
CMD ["python", "main.py"]
