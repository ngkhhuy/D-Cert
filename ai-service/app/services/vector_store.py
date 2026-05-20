import json
from pathlib import Path

import faiss
import numpy as np


STORAGE_DIR = Path(__file__).resolve().parents[1] / "storage"
INDEX_PATH = STORAGE_DIR / "faiss.index"
METADATA_PATH = STORAGE_DIR / "metadata.json"


def ensure_storage_dir() -> None:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def load_metadata() -> list[dict]:
    """Load chunk metadata; corrupted or empty files are treated as empty."""
    ensure_storage_dir()
    if not METADATA_PATH.exists():
        return []

    try:
        if METADATA_PATH.stat().st_size == 0:
            return []
        with METADATA_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return []

    if not isinstance(data, list):
        return []
    return data


def save_metadata(metadata: list[dict]) -> None:
    """Persist metadata as UTF-8 JSON."""
    ensure_storage_dir()
    with METADATA_PATH.open("w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)


def load_index(dimension: int | None = None):
    """Load FAISS index or create a new IndexFlatIP when dimension is known."""
    ensure_storage_dir()
    if INDEX_PATH.exists() and INDEX_PATH.stat().st_size > 0:
        return faiss.read_index(str(INDEX_PATH))
    if dimension is None:
        raise ValueError("Cần dimension để tạo FAISS index mới")
    return faiss.IndexFlatIP(dimension)


def save_index(index) -> None:
    """Persist FAISS index to disk."""
    ensure_storage_dir()
    faiss.write_index(index, str(INDEX_PATH))


def add_vectors(embeddings: np.ndarray, metadatas: list[dict]) -> dict:
    """Add normalized embeddings and matching metadata to the vector store."""
    if embeddings.ndim != 2:
        raise ValueError("embeddings phải là mảng 2 chiều")
    if embeddings.shape[0] != len(metadatas):
        raise ValueError("Số vector phải bằng số metadata")
    if embeddings.shape[0] == 0:
        raise ValueError("embeddings không được rỗng")

    vectors = np.asarray(embeddings, dtype=np.float32)
    dimension = int(vectors.shape[1])
    index = load_index(dimension)

    if index.d != dimension:
        raise ValueError(
            f"FAISS index dimension mismatch: index={index.d}, embeddings={dimension}"
        )

    metadata = load_metadata()
    index.add(vectors)
    metadata.extend(metadatas)

    save_index(index)
    save_metadata(metadata)

    return {
        "added": len(metadatas),
        "total": len(metadata),
    }


def search_vectors(query_embedding: np.ndarray, top_k: int = 5) -> list[dict]:
    """Search FAISS and attach similarity scores to metadata copies."""
    ensure_storage_dir()
    if top_k <= 0:
        return []
    if not INDEX_PATH.exists() or INDEX_PATH.stat().st_size == 0:
        return []

    metadata = load_metadata()
    if not metadata:
        return []

    query = np.asarray(query_embedding, dtype=np.float32)
    if query.ndim == 1:
        query = query.reshape(1, -1)
    if query.ndim != 2 or query.shape[0] != 1:
        raise ValueError("query_embedding phải có shape (dimension,) hoặc (1, dimension)")

    index = load_index()
    if index.d != query.shape[1]:
        raise ValueError(
            f"FAISS index dimension mismatch: index={index.d}, query={query.shape[1]}"
        )

    scores, indices = index.search(query, top_k)
    results: list[dict] = []

    for score, idx in zip(scores[0], indices[0]):
        idx = int(idx)
        if idx == -1 or idx >= len(metadata):
            continue
        item = dict(metadata[idx])
        item["score"] = float(score)
        results.append(item)

    return results


def remove_document(document_id: str) -> dict:
    """Remove one document by rebuilding FAISS from remaining metadata.

    This is a simple demo-friendly strategy. Larger systems should use a vector
    database with efficient delete/update support.
    """
    metadata = load_metadata()
    remaining_metadata = [
        item for item in metadata
        if item.get("document_id") != document_id
    ]
    removed = len(metadata) - len(remaining_metadata)

    if removed == 0:
        return {"removed": 0, "remaining": len(metadata)}

    if not remaining_metadata:
        if INDEX_PATH.exists():
            INDEX_PATH.unlink()
        save_metadata([])
        return {"removed": removed, "remaining": 0}

    from app.services.embedder import embed_texts

    texts = [item.get("content", "") for item in remaining_metadata]
    embeddings = embed_texts(texts)
    if embeddings.ndim != 2 or embeddings.shape[0] == 0:
        raise ValueError("Không thể rebuild FAISS index từ metadata còn lại")

    vectors = np.asarray(embeddings, dtype=np.float32)
    index = faiss.IndexFlatIP(int(vectors.shape[1]))
    index.add(vectors)

    save_index(index)
    save_metadata(remaining_metadata)

    return {"removed": removed, "remaining": len(remaining_metadata)}


def archive_document_metadata(document_id: str) -> dict:
    """Mark all chunks belonging to document_id as ARCHIVED in metadata.json.

    The FAISS index is left unchanged.  answer_question already filters out
    chunks whose status != 'PUBLISHED', so archived chunks are silently
    skipped without requiring an index rebuild.
    """
    from datetime import datetime

    metadata = load_metadata()
    archived_count = 0
    archived_at = datetime.utcnow().isoformat()

    for item in metadata:
        if item.get("document_id") == document_id:
            item["status"] = "ARCHIVED"
            item["archived_at"] = archived_at
            archived_count += 1

    if archived_count > 0:
        save_metadata(metadata)

    return {
        "document_id": document_id,
        "archived": archived_count,
        "total": len(metadata),
    }


def rebuild_index_from_published_metadata() -> dict:
    """Rebuild the FAISS index using only PUBLISHED chunks.

    NOTE (demo version): This overwrites metadata.json to contain only
    PUBLISHED chunks, discarding ARCHIVED entries from the AI index.
    A production system should use a vector database with native
    delete/update support instead.
    """
    metadata = load_metadata()
    published_items = [
        item for item in metadata
        if item.get("status") == "PUBLISHED" and str(item.get("content", "")).strip()
    ]

    if not published_items:
        if INDEX_PATH.exists():
            INDEX_PATH.unlink()
        save_metadata([])
        return {
            "rebuilt": True,
            "vectors": 0,
            "message": "Không còn chunk PUBLISHED nào. Đã reset index.",
        }

    from app.services.embedder import embed_texts

    texts = [item["content"] for item in published_items]
    embeddings = embed_texts(texts)

    if embeddings.ndim != 2 or embeddings.shape[0] == 0:
        raise ValueError("Không thể tạo embeddings từ các chunk PUBLISHED")

    vectors = np.asarray(embeddings, dtype=np.float32)
    index = faiss.IndexFlatIP(int(vectors.shape[1]))
    index.add(vectors)

    save_index(index)
    save_metadata(published_items)

    return {
        "rebuilt": True,
        "vectors": len(published_items),
    }
