from qdrant_client import QdrantClient
from qdrant_client.models import ( 
    VectorParams, 
    Distance, 
    SparseVectorParams, 
    Modifier, 
    PointStruct,
    SparseVector,
    Prefetch,
    FusionQuery,
    Fusion
)
from functools import lru_cache
from services.rag_services.embedding_services import embed_text, sparse_embed_text, embed_sparse, dense_dimension

import atexit
import os
import uuid
PROMOTION_PROFILE_COLLECTION_NAME = "promotion_profile.pdf"
PROMOTION_GUIDEBOOK_COLLECTION_NAME = "sales_guidebook.md"
SPARSE_MODEL_NAME = "Qdrant/bm25"

def stable_point_id(chunk: dict):
     return str(uuid.uuid5(uuid.NAMESPACE_URL, str(chunk["id"])))

@lru_cache(maxsize=1)
def get_qdrant_client(): 
    qdrant_api_key = os.getenv("QDRANT_API_KEY")
    qdrant_url = os.getenv("QDRANT_URL")

    if qdrant_url:
        return QdrantClient(api_key=qdrant_api_key or None, url=qdrant_url)
    # No Qdrant server configured: use Qdrant's embedded (on-disk) mode.
    client = QdrantClient(path=os.getenv("QDRANT_PATH", ".qdrant"))
    atexit.register(client.close)
    return client

def ensure_collection(client: QdrantClient, dense_dim: int, collection: str = PROMOTION_PROFILE_COLLECTION_NAME):
    if not client.collection_exists(collection):
        client.create_collection(
            collection_name=collection,
            vectors_config={"dense": VectorParams(size=dense_dim, distance=Distance.COSINE)},
            sparse_vectors_config= {"bm25" : SparseVectorParams(modifier=Modifier.IDF)}
        )


def upsert(client: QdrantClient, chunks: list[dict], collection: str = PROMOTION_PROFILE_COLLECTION_NAME):
    # print(chunks[0]["embedding"])
    points = [
        PointStruct(
            id = stable_point_id(c),
            vector={
                "dense" : c["embedding"],
                "bm25" : SparseVector(
                    indices=c["sparse_embeddings"].indices.tolist(),
                    values=c["sparse_embeddings"].values.tolist()
                )
             },
             payload={
                "id": c["id"],
                "text" : c["text"],
                **c["meta_data"]
             }
        )
        for c in chunks
    ]   
    batch_size = 100
    for i in range(0, len(points), batch_size):
        client.upsert(collection_name=collection, points=points[i: i+batch_size])
    print(f"upserted {len(points)} hybrid points into '{collection}'")

def load_to_qdrant(chunks: list[dict], collection: str):
    client = get_qdrant_client()
    if client is None:
        raise Exception("unable to fetch qdrant_client")
    dense_dim = len(chunks[0]["embedding"]) if chunks else dense_dimension()
    if client.collection_exists(collection):
        existing = client.get_collection(collection).config.params.vectors["dense"].size
        if existing != dense_dim:
            client.delete_collection(collection)
    ensure_collection(client=client, dense_dim=dense_dim, collection=collection)
    sparse_chunks = embed_sparse(chunks=chunks)
    upsert(client, sparse_chunks, collection)

def search_query(query: str, top_k: int=5, prefetch_limit:int = 20, collection: str = PROMOTION_PROFILE_COLLECTION_NAME):
    client = get_qdrant_client()
    if client is None:
        raise Exception("failed to fetch Qdrant Client")
    embedded_query = embed_text(query)
    sparse_embed = sparse_embed_text(query)

    query_results = client.query_points(
        collection_name=collection,
        prefetch=[
            Prefetch(query=embedded_query, using="dense", limit=prefetch_limit),
            Prefetch(
                query=SparseVector(
                    indices=sparse_embed.indices.tolist(), 
                    values=sparse_embed.values.tolist(),
                ),
                using="bm25",
                limit=prefetch_limit,
            ),
        ],
        query=FusionQuery(fusion=Fusion.RRF),
        limit=top_k,
    ).points
    extracted_texts = []
    for query_result in query_results:
        if (query_result is None) or (query_result.payload is None) :
            raise Exception("vector db query returned None")
        extracted_texts.append(query_result.payload["text"])
    return extracted_texts


def collection_point_count(collection: str) -> int:
    client = get_qdrant_client()
    if not client.collection_exists(collection):
        return 0
    return client.count(collection_name=collection).count
