from datetime import date, datetime
import os
from typing import Optional

from app.schemas.ingest_schema import IngestRequest
from app.services.chunker import chunk_text
from app.services.embedder import embed_query, embed_texts
from app.services.pdf_loader import load_pdf_pages
from app.services.vector_store import add_vectors, remove_document, search_vectors


SUPPORTED_EXTENSIONS = {".pdf"}
RETRIEVAL_THRESHOLD = 0.35
TOP_K = 5
MAX_EXCERPT_LENGTH = 350
MAX_CONTEXT_PREVIEW_LENGTH = 900

FALLBACK_ANSWER = (
    "Mình chưa tìm thấy thông tin phù hợp trong các văn bản học vụ đã được "
    "nhà trường công khai trên hệ thống. Bạn nên theo dõi thông báo mới hoặc "
    "liên hệ phòng đào tạo để được xác nhận."
)


def _ensure_supported_file(file_path: str) -> str:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Không tìm thấy file: {file_path}")
    if os.path.splitext(file_path)[1].lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError("Hiện tại chỉ hỗ trợ index file PDF.")
    return file_path


def ingest_document(req: IngestRequest) -> dict:
    """Read a PDF, chunk text, embed chunks, and store them in FAISS."""
    _ensure_supported_file(req.file_path)

    pages = load_pdf_pages(req.file_path)
    if not pages:
        return {
            "success": False,
            "message": "Không trích xuất được nội dung từ PDF. Tài liệu có thể là PDF scan và cần OCR.",
            "data": {
                "document_id": req.document_id,
                "pages": 0,
                "chunks": 0,
            },
        }

    all_chunks: list[str] = []
    metadatas: list[dict] = []
    ingested_at = datetime.utcnow().isoformat()

    for page in pages:
        chunks = chunk_text(page["text"], chunk_size=1000, overlap=200)
        for chunk in chunks:
            chunk_index = len(all_chunks)
            all_chunks.append(chunk)
            metadatas.append({
                "document_id": req.document_id,
                "title": req.title,
                "type": req.type,
                "source_unit": req.source_unit,
                "issued_date": req.issued_date,
                "effective_from": req.effective_from,
                "effective_to": req.effective_to,
                "page": page["page"],
                "chunk_index": chunk_index,
                "content": chunk,
                "status": "PUBLISHED",
                "ingested_at": ingested_at,
            })

    if not all_chunks:
        return {
            "success": False,
            "message": "Không trích xuất được nội dung từ PDF. Tài liệu có thể là PDF scan và cần OCR.",
            "data": {
                "document_id": req.document_id,
                "pages": len(pages),
                "chunks": 0,
            },
        }

    remove_result = remove_document(req.document_id)
    embeddings = embed_texts(all_chunks)
    result = add_vectors(embeddings, metadatas)

    return {
        "success": True,
        "message": "Index tài liệu thành công.",
        "data": {
            "document_id": req.document_id,
            "title": req.title,
            "pages": len(pages),
            "chunks": len(all_chunks),
            "removed_old_chunks": remove_result["removed"],
            "vector_store": result,
        },
    }


def _parse_date(value) -> Optional[date]:
    """Parse common date/datetime values without raising on bad input."""
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        return None

    normalized = value.strip()
    if not normalized:
        return None
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"

    try:
        return datetime.fromisoformat(normalized).date()
    except ValueError:
        pass

    try:
        return date.fromisoformat(normalized[:10])
    except ValueError:
        return None


def _is_effective(item: dict) -> bool:
    """Return True when a document chunk is currently effective."""
    today = date.today()
    effective_from = _parse_date(item.get("effective_from"))
    effective_to = _parse_date(item.get("effective_to"))

    if effective_from and effective_from > today:
        return False
    if effective_to and effective_to < today:
        return False
    return True


def _safe_excerpt(text: str, max_len: int = MAX_EXCERPT_LENGTH) -> str:
    """Trim long text for source previews."""
    if not text:
        return ""

    excerpt = str(text).strip()
    if len(excerpt) <= max_len:
        return excerpt
    return excerpt[:max_len].rstrip() + "..."


def _sort_results(results: list[dict]) -> list[dict]:
    """Sort primarily by relevance, then by newer issued date."""
    def sort_key(item: dict):
        issued_date = _parse_date(item.get("issued_date")) or date.min
        return (float(item.get("score", 0) or 0), issued_date)

    return sorted(results, key=sort_key, reverse=True)


def _build_sources(results: list[dict]) -> list[dict]:
    """Build source payloads for the frontend."""
    sources: list[dict] = []

    for item in results:
        sources.append({
            "document_id": item.get("document_id"),
            "title": item.get("title"),
            "type": item.get("type"),
            "page": item.get("page"),
            "chunk_index": item.get("chunk_index"),
            "source_unit": item.get("source_unit"),
            "issued_date": item.get("issued_date"),
            "effective_from": item.get("effective_from"),
            "effective_to": item.get("effective_to"),
            "excerpt": _safe_excerpt(item.get("content", "")),
            "score": float(item.get("score", 0) or 0),
        })

    return sources


def _build_retrieval_only_answer(results: list[dict]) -> str:
    """Create a cautious retrieval-only response from the top result."""
    top = results[0]
    title = top.get("title") or "văn bản liên quan"
    page = top.get("page") or "không rõ"
    content_preview = _safe_excerpt(
        top.get("content", ""),
        max_len=MAX_CONTEXT_PREVIEW_LENGTH,
    )

    return (
        f"Mình tìm thấy thông tin liên quan trong văn bản \"{title}\", "
        f"trang {page}. Nội dung liên quan như sau:\n\n"
        f"\"{content_preview}\"\n\n"
        "Bạn có thể xem nguồn bên dưới để kiểm tra chi tiết."
    )


def answer_question(question: str, student_id: str | None = None) -> dict:
    """Return a grounded answer using retrieval plus optional local LLM."""
    if question is None or not question.strip():
        raise ValueError("Câu hỏi không được để trống.")

    question = question.strip()
    query_embedding = embed_query(question)
    raw_results = search_vectors(query_embedding, top_k=TOP_K)

    if not raw_results:
        return {
            "answer": FALLBACK_ANSWER,
            "sources": [],
            "fallback": True,
            "used_llm": False,
        }

    filtered: list[dict] = []
    for item in raw_results:
        score = float(item.get("score", 0) or 0)
        status = item.get("status")
        content = item.get("content")

        if score < RETRIEVAL_THRESHOLD:
            continue
        if status != "PUBLISHED":
            continue
        if not _is_effective(item):
            continue
        if not content or not str(content).strip():
            continue

        filtered.append(item)

    if not filtered:
        return {
            "answer": FALLBACK_ANSWER,
            "sources": [],
            "fallback": True,
            "used_llm": False,
        }

    sorted_results = _sort_results(filtered)
    sources = _build_sources(sorted_results)

    try:
        from app.services.llm_service import generate_answer_with_ollama

        llm_answer = generate_answer_with_ollama(question, sorted_results)
        return {
            "answer": llm_answer,
            "sources": sources,
            "fallback": False,
            "used_llm": True,
        }
    except Exception as exc:
        retrieval_answer = _build_retrieval_only_answer(sorted_results)
        return {
            "answer": retrieval_answer,
            "sources": sources,
            "fallback": False,
            "used_llm": False,
            "llm_error": str(exc),
        }
