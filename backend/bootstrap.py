"""First-run setup, called by main.py before the server starts.

1. Create the database tables.
2. Create the demo login (DEMO_USERNAME / DEMO_PASSWORD).
3. If the database has no promotions yet, run the ETL pipeline once against
   the source API (the same thing POST /api/v1/data/reload does).
4. Index the sales guidebook and promotion profiles into Qdrant if they are
   not indexed yet.

Each step logs and carries on if it fails, so the API still starts.
"""

import hashlib
import json
import logging
import os
import time
from pathlib import Path

import httpx

from api.user_services.create_user import create_user
from services.db_services.promotions_db import count_promotions
from services.db_services.session import init_db
from services.db_services.user_db import get_user_by_username

logger = logging.getLogger("bootstrap")

GUIDEBOOK_PATH = Path("documents") / "sales_guidebook.md"
PROFILES_PATH = Path("documents") / "promotion_profiles.pdf"
INDEX_STATE_PATH = Path(".cache") / "rag_index.json"


def ensure_demo_user():
    username = os.getenv("DEMO_USERNAME", "admin")
    password = os.getenv("DEMO_PASSWORD", "admin123")
    if get_user_by_username(username) is None:
        create_user(username, password)
        logger.info("created login user %r", username)


def ensure_data():
    if count_promotions() > 0:
        return
    from services.api_services.api import SERVER_URI
    from services.pipeline_services.pipe import reload_data

    logger.info("database is empty, loading data from the source API at %s ...", SERVER_URI)
    try:
        for attempt in range(10):
            try:
                reload_data()
                break
            except httpx.TransportError:
                # the source API may still be starting (e.g. under docker compose)
                if attempt == 9:
                    raise
                time.sleep(3)
        logger.info("loaded %d promotions", count_promotions())
    except Exception as e:
        logger.warning(
            "could not load data from %s (%s). Start the source API with "
            "`uv run python -m mock_source_api`, then use Refresh Data in the app.",
            SERVER_URI, e,
        )


def ensure_rag_index():
    from services.rag_services.document_loader import load_document_as_chunks
    from services.rag_services.embedding_services import embed_chunks
    from services.rag_services.markdown_loader import chunk_markdown_by_heading
    from services.rag_services.qdrant_services import (
        PROMOTION_GUIDEBOOK_COLLECTION_NAME,
        PROMOTION_PROFILE_COLLECTION_NAME,
        collection_point_count,
        get_qdrant_client,
        load_to_qdrant,
    )

    sources = [
        (PROMOTION_GUIDEBOOK_COLLECTION_NAME, GUIDEBOOK_PATH, lambda: chunk_markdown_by_heading(str(GUIDEBOOK_PATH)), "sales_guidebook"),
        (PROMOTION_PROFILE_COLLECTION_NAME, PROFILES_PATH, load_document_as_chunks, "promotion_profiles"),
    ]
    # Remembers which version of each document is indexed, so editing a
    # document re-indexes it on the next start.
    try:
        indexed = json.loads(INDEX_STATE_PATH.read_text())
    except (OSError, ValueError):
        indexed = {}
    for collection, path, chunker, cache_name in sources:
        try:
            if not path.exists():
                logger.warning("%s is missing, skipping the %s index", path, collection)
                continue
            chunks = chunker()
            digest = hashlib.sha256("\x00".join(c["text"] for c in chunks).encode()).hexdigest()[:16]
            if collection_point_count(collection) > 0 and indexed.get(collection) == digest:
                continue
            logger.info("indexing %s into Qdrant collection %r ...", path, collection)
            client = get_qdrant_client()
            if client.collection_exists(collection):
                client.delete_collection(collection)
            load_to_qdrant(embed_chunks(chunks, f"{cache_name}_{digest}"), collection=collection)
            indexed[collection] = digest
        except Exception as e:
            logger.warning("could not build the %s index: %s", collection, e)
    INDEX_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_STATE_PATH.write_text(json.dumps(indexed, indent=2))


def bootstrap():
    init_db()
    ensure_demo_user()
    ensure_data()
    ensure_rag_index()
