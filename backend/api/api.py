import os
from pathlib import Path

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from api.routes.user_routes import user_router
from api.routes.promotion_routes import promotions_router
from api.routes.conversation_routes import conversation_router
from api.routes.data_routes import data_router
from api.routes.sku_routes import sku_router
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="RetailIQ Promotion Performance Analyzer")

# The Vite dev server. In the one-command setup the backend serves the built
# frontend itself, so the browser never makes a cross-origin call.
origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app_v1 = APIRouter(prefix="/api/v1")
app_v1.include_router(user_router)
app_v1.include_router(promotions_router)
app_v1.include_router(conversation_router)
app_v1.include_router(data_router)
app_v1.include_router(sku_router)

app.include_router(app_v1)

@app.get(path="/api/health")
def health():
    from agent.agent import LLM_MODEL, llm_enabled
    return {
        "status": "ok",
        "agent": f"llm:{LLM_MODEL}" if llm_enabled() else "tools-only (no LLM key)",
    }


FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST", Path(__file__).resolve().parents[2] / "frontend" / "dist"))
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
else:
    @app.get(path="/")
    def hello_world():
        return {
            "hello": "world",
            "frontend": "not built - run `npm run build` in frontend/ or use the Vite dev server",
        }


def get_app() -> FastAPI:
    return app
