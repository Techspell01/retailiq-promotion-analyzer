from functools import lru_cache
from pathlib import Path
import json
import os

from fastembed import SparseTextEmbedding, SparseEmbedding, TextEmbedding

# Dense embeddings come from a Hugging Face text-embeddings-inference server
# when EMBEDDING_SERVER_URL is set (the original setup used one on
# http://127.0.0.1:8080), otherwise from a small fastembed model that runs
# in-process on the CPU.
EMBEDDING_SERVER_URL = os.getenv("EMBEDDING_SERVER_URL")
DENSE_MODEL_NAME = os.getenv("DENSE_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
SPARSE_MODEL_NAME = "Qdrant/bm25"
MODEL_CACHE_DIR = os.getenv("FASTEMBED_CACHE_DIR", str(Path(".cache") / "fastembed"))
VECTOR_CACHE_DIR = Path("__embedded_vector_cache")


@lru_cache(maxsize=1)
def _dense_model() -> TextEmbedding:
    return TextEmbedding(DENSE_MODEL_NAME, cache_dir=MODEL_CACHE_DIR)


@lru_cache(maxsize=1)
def _sparse_model() -> SparseTextEmbedding:
    return SparseTextEmbedding(SPARSE_MODEL_NAME, cache_dir=MODEL_CACHE_DIR)


def _embedding_source() -> str:
    return EMBEDDING_SERVER_URL or DENSE_MODEL_NAME


def embed_text(text: str) -> list:
    if EMBEDDING_SERVER_URL:
        from huggingface_hub import InferenceClient
        embedded_text = InferenceClient(base_url=EMBEDDING_SERVER_URL).feature_extraction(text)
        return embedded_text[0].tolist()
    return next(iter(_dense_model().query_embed(text))).tolist()


@lru_cache(maxsize=1)
def dense_dimension() -> int:
    return len(embed_text("dimension probe"))


def embed_chunks(chunks: list[dict], name: str, force_invalidate_cache = False) -> list[dict]:
    if not force_invalidate_cache:
        embedded_chunks = load_from_cache(name)
        if embedded_chunks is not None:
            return embedded_chunks

    if EMBEDDING_SERVER_URL:
        vectors = [embed_text(chunk["text"]) for chunk in chunks]
    else:
        vectors = [v.tolist() for v in _dense_model().passage_embed([c["text"] for c in chunks])]

    embedded_chunks = []
    for chunk, vector in zip(chunks, vectors):
        embedded_chunks.append({**chunk, "embedding": vector})
    print(f"embedded {len(embedded_chunks)} chunks for {name}")

    save_cache(embedded_chunks, name)
    return embedded_chunks

def _cache_path(name: str) -> Path:
    model_tag = _embedding_source().replace("/", "_").replace(":", "_")
    return VECTOR_CACHE_DIR / f"__embedded_vector_{name}_{model_tag}.json"

def save_cache(chunks: list[dict], name: str):
    VECTOR_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with open(_cache_path(name), "w", encoding="utf-8") as file:
        json.dump({"embedded_chunk": chunks}, file)

def load_from_cache(name: str) -> list[dict] | None:
    file_path = _cache_path(name)
    if not file_path.exists():
        return None
    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)
        return data["embedded_chunk"]

def embed_sparse(chunks: list[dict]) -> list[dict]:
    sparse_vecs = list(_sparse_model().embed([c["text"] for c in chunks]))
    for chunk, sparse_vec in zip(chunks, sparse_vecs):
        chunk["sparse_embeddings"] = sparse_vec
    return chunks

def sparse_embed_text(text: str) -> SparseEmbedding:
    return next(iter(_sparse_model().query_embed(text)))
