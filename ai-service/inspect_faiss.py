"""
inspect_faiss.py
Xem dữ liệu từ faiss.index và metadata.json trong thư mục storage/.
"""

import json
import sys
from pathlib import Path

import faiss
import numpy as np

# ── Đường dẫn ──────────────────────────────────────────────────────────────
STORAGE_DIR = Path(__file__).resolve().parent / "app" / "storage"
INDEX_PATH   = STORAGE_DIR / "faiss.index"
META_PATH    = STORAGE_DIR / "metadata.json"


def load_index():
    if not INDEX_PATH.exists():
        print(f"[ERROR] Không tìm thấy file: {INDEX_PATH}")
        sys.exit(1)
    index = faiss.read_index(str(INDEX_PATH))
    return index


def load_metadata() -> list[dict]:
    if not META_PATH.exists():
        print(f"[WARN] Không tìm thấy metadata: {META_PATH}")
        return []
    with META_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def print_index_info(index):
    print("=" * 60)
    print("THÔNG TIN FAISS INDEX")
    print("=" * 60)
    print(f"  Loại index       : {type(index).__name__}")
    print(f"  Số vector (ntotal): {index.ntotal}")
    print(f"  Dimension        : {index.d}")
    print(f"  Metric type      : {'Inner Product (IP)' if index.metric_type == faiss.METRIC_INNER_PRODUCT else 'L2'}")
    is_trained = getattr(index, "is_trained", True)
    print(f"  Đã train         : {is_trained}")


def print_metadata_summary(metadata: list[dict]):
    print()
    print("=" * 60)
    print(f"METADATA  ({len(metadata)} chunks)")
    print("=" * 60)

    if not metadata:
        print("  (trống)")
        return

    # Tổng hợp theo doc_id / source
    sources: dict[str, int] = {}
    for item in metadata:
        key = item.get("doc_id") or item.get("source") or item.get("filename") or "unknown"
        sources[key] = sources.get(key, 0) + 1

    print("  Số chunk theo tài liệu:")
    for src, cnt in sorted(sources.items()):
        print(f"    {src}: {cnt} chunk(s)")


def print_sample_vectors(index, n: int = 3):
    print()
    print("=" * 60)
    print(f"MẪU VECTOR (tối đa {n} vector đầu tiên)")
    print("=" * 60)

    if index.ntotal == 0:
        print("  (index rỗng, không có vector)")
        return

    # Lấy vector bằng reconstruct (chỉ hỗ trợ IndexFlat*)
    count = min(n, index.ntotal)
    for i in range(count):
        try:
            vec = index.reconstruct(i)
            norm = float(np.linalg.norm(vec))
            preview = ", ".join(f"{v:.4f}" for v in vec[:6])
            print(f"  Vector [{i}]  norm={norm:.4f}  dim={len(vec)}")
            print(f"    [{preview} ...]")
        except Exception as e:
            print(f"  [WARN] Không đọc được vector {i}: {e}")
            break


def print_sample_metadata(metadata: list[dict], n: int = 5):
    if not metadata:
        return
    print()
    print("=" * 60)
    print(f"MẪU METADATA (tối đa {n} chunk đầu tiên)")
    print("=" * 60)
    for i, item in enumerate(metadata[:n]):
        print(f"\n  --- Chunk {i} ---")
        for k, v in item.items():
            val_str = str(v)
            if len(val_str) > 120:
                val_str = val_str[:120] + "..."
            print(f"    {k}: {val_str}")


def search_demo(index, metadata: list[dict], top_k: int = 3):
    """Thử search bằng một vector ngẫu nhiên để kiểm tra index."""
    if index.ntotal == 0:
        return
    print()
    print("=" * 60)
    print(f"THỬ SEARCH  (vector ngẫu nhiên, top-{top_k})")
    print("=" * 60)

    rng = np.random.default_rng(42)
    query = rng.random((1, index.d), dtype=np.float32)
    # Normalize để phù hợp với IndexFlatIP
    query /= np.linalg.norm(query, axis=1, keepdims=True)

    scores, ids = index.search(query, min(top_k, index.ntotal))
    for rank, (score, idx) in enumerate(zip(scores[0], ids[0])):
        if idx < 0:
            continue
        meta = metadata[idx] if idx < len(metadata) else {}
        source = meta.get("doc_id") or meta.get("source") or meta.get("filename") or "?"
        print(f"  Rank {rank+1}: id={idx}  score={score:.4f}  source={source}")


# ── Main ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    index    = load_index()
    metadata = load_metadata()

    print_index_info(index)
    print_metadata_summary(metadata)
    print_sample_vectors(index, n=3)
    print_sample_metadata(metadata, n=5)
    search_demo(index, metadata, top_k=3)

    print()
    print("Hoàn tất.")
