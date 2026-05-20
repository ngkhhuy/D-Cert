from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer


MODEL_NAME = "bkai-foundation-models/vietnamese-bi-encoder"


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    """Lazy-load the Vietnamese retrieval embedding model."""
    return SentenceTransformer(MODEL_NAME)


def embed_texts(texts: list[str]) -> np.ndarray:
    """Encode a batch of texts into normalized float32 embeddings."""
    if not texts:
        return np.empty((0, 0), dtype=np.float32)

    embeddings = get_model().encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return np.asarray(embeddings, dtype=np.float32)


def embed_query(query: str) -> np.ndarray:
    """Encode one query into a normalized float32 embedding matrix."""
    if not query or not query.strip():
        raise ValueError("query không được rỗng")

    embeddings = get_model().encode(
        [query.strip()],
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return np.asarray(embeddings, dtype=np.float32)
