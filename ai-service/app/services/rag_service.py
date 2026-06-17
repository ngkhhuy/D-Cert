from datetime import date, datetime
import logging
import os
import re
import tempfile
from typing import Optional
import unicodedata
from urllib.parse import urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import requests

from app.schemas.ingest_schema import IngestRequest
from app.services.chunker import chunk_text
from app.services.embedder import embed_query, embed_texts
from app.services.generated_chunks import build_generated_chunks
from app.services.pdf_loader import load_pdf_pages
from app.services.vector_store import add_vectors, load_metadata, remove_document, search_vectors


SUPPORTED_EXTENSIONS = {".pdf"}
DOWNLOAD_TIMEOUT_SECONDS = 60
RETRIEVAL_THRESHOLD = 0.30
TOP_K = 12
FINAL_CONTEXTS = 5
RECENCY_SCORE_DELTA = 0.05
MAX_EXCERPT_LENGTH = 350
MAX_CONTEXT_PREVIEW_LENGTH = 900
APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Asia/Ho_Chi_Minh")

logger = logging.getLogger(__name__)

KEYWORD_STOPWORDS = {
    "la",
    "gi",
    "bao",
    "nhieu",
    "thi",
    "co",
    "duoc",
    "khong",
    "cua",
    "trong",
    "nhu",
    "the",
    "nao",
    "bi",
    "va",
    "voi",
    "cho",
    "cac",
    "mot",
    "nhung",
    "sinh",
    "vien",
    "ve",
    "de",
    "tu",
    "den",
}

IMPORTANT_KEYWORD_PHRASES = (
    "điểm rèn luyện",
    "xếp loại",
    "kém",
    "yếu",
    "xuất sắc",
    "chương trình đại trà",
    "tiếng anh",
    "đầu ra",
    "toeic",
    "chuẩn cntt",
    "mô-đun",
    "tiết học",
)

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


def _download_pdf(file_url: str) -> str:
    parsed = urlparse(file_url)
    extension = os.path.splitext(parsed.path)[1].lower() or ".pdf"
    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError("Hiện tại chỉ hỗ trợ index file PDF.")

    response = requests.get(file_url, timeout=DOWNLOAD_TIMEOUT_SECONDS)
    response.raise_for_status()

    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=extension)
    try:
        tmp_file.write(response.content)
        return tmp_file.name
    finally:
        tmp_file.close()


def _resolve_ingest_file(req: IngestRequest) -> tuple[str, bool]:
    if req.file_url:
        return _download_pdf(req.file_url), True
    if req.file_path:
        return _ensure_supported_file(req.file_path), False
    raise ValueError("Thiếu file_url hoặc file_path để index tài liệu.")


def ingest_document(req: IngestRequest) -> dict:
    """Read a PDF, chunk text, embed chunks, and store them in FAISS."""
    file_path, is_temp_file = _resolve_ingest_file(req)
    try:
        pages = load_pdf_pages(file_path)
    finally:
        if is_temp_file:
            try:
                os.unlink(file_path)
            except OSError:
                logger.warning("Không thể xóa file tạm: %s", file_path)

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
    base_metadata = {
        "document_id": req.document_id,
        "title": req.title,
        "type": req.type,
        "source_unit": req.source_unit,
        "issued_date": req.issued_date,
        "effective_from": req.effective_from,
        "effective_to": req.effective_to,
        "status": "PUBLISHED",
    }

    for page in pages:
        chunks = chunk_text(page["text"], chunk_size=1000, overlap=200)
        for chunk in chunks:
            chunk_index = len(all_chunks)
            all_chunks.append(chunk)
            metadatas.append({
                **base_metadata,
                "page": page["page"],
                "chunk_index": chunk_index,
                "content": chunk,
                "ingested_at": ingested_at,
            })

    generated_chunks = build_generated_chunks(
        pages,
        {
            **base_metadata,
            "chunk_index_start": len(all_chunks),
        },
    )
    for generated_chunk in generated_chunks:
        all_chunks.append(generated_chunk["content"])
        metadatas.append({
            **generated_chunk,
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
            "generated_chunks": len(generated_chunks),
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


def _today() -> date:
    try:
        return datetime.now(ZoneInfo(APP_TIMEZONE)).date()
    except ZoneInfoNotFoundError:
        logger.warning("Timezone không hợp lệ: %s. Fallback sang ngày hệ thống.", APP_TIMEZONE)
        return date.today()


def _is_effective(item: dict) -> bool:
    """Return True when a document chunk is currently effective."""
    today = _today()
    effective_from = _parse_date(item.get("effective_from"))
    effective_to = _parse_date(item.get("effective_to"))

    if effective_from and effective_from > today:
        return False
    if effective_to and effective_to < today:
        return False
    return True


def _is_usable_source_item(item: dict) -> bool:
    """Return True when a chunk can be used as answer context."""
    content = item.get("content")
    if item.get("status") != "PUBLISHED":
        return False
    if not _is_effective(item):
        return False
    if not content or not str(content).strip():
        return False
    return True


def _normalize_keyword_text(value: str) -> str:
    """Normalize Vietnamese text for accent-insensitive keyword matching."""
    text = unicodedata.normalize("NFD", str(value or "").casefold())
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.replace("đ", "d")
    text = re.sub(r"[^0-9a-z]+", " ", text)
    return " ".join(text.split())


def _extract_keywords(question: str) -> list[str]:
    """Extract weighted phrases and useful terms from a student question."""
    normalized_question = _normalize_keyword_text(question)
    keywords: list[str] = []

    for phrase in IMPORTANT_KEYWORD_PHRASES:
        normalized_phrase = _normalize_keyword_text(phrase)
        if normalized_phrase and normalized_phrase in normalized_question:
            keywords.append(normalized_phrase)

    for token in normalized_question.split():
        if len(token) <= 1 or token in KEYWORD_STOPWORDS:
            continue
        keywords.append(token)

    return list(dict.fromkeys(keywords))


def _score_keyword_match(item: dict, keywords: list[str]) -> tuple[int, list[str]]:
    """Score a metadata chunk by the number and weight of matched keywords."""
    if not keywords:
        return 0, []

    content_text = _normalize_keyword_text(item.get("content", ""))
    title_text = _normalize_keyword_text(item.get("title", ""))
    haystack = f"{title_text} {content_text}".strip()
    score = 0
    matches: list[str] = []

    for keyword in keywords:
        if keyword not in haystack:
            continue

        matches.append(keyword)
        score += 3 if " " in keyword else 1
        if keyword in title_text:
            score += 1

    return score, matches


def _keyword_fallback_search(question: str) -> list[dict]:
    """Search metadata.json by keywords when semantic search misses table text."""
    keywords = _extract_keywords(question)
    if not keywords:
        return []

    candidates: list[dict] = []
    for item in load_metadata():
        if not _is_usable_source_item(item):
            continue

        keyword_score, matches = _score_keyword_match(item, keywords)
        if keyword_score <= 0:
            continue

        candidate = dict(item)
        candidate["_keyword_score"] = keyword_score
        candidate["_keyword_matches"] = matches
        candidate["score"] = min(0.99, 0.30 + (keyword_score * 0.05))
        candidates.append(candidate)

    return sorted(
        candidates,
        key=lambda item: (
            int(item.get("_keyword_score", 0) or 0),
            _parse_date(item.get("issued_date")) or date.min,
        ),
        reverse=True,
    )


def _result_rank_score(item: dict) -> float:
    return float(item.get("_keyword_score", item.get("score", 0)) or 0)


def _summarize_results(results: list[dict]) -> list[dict]:
    """Build compact debug payloads without logging full document chunks."""
    summary: list[dict] = []
    for item in results:
        summary.append({
            "document_id": item.get("document_id"),
            "title": item.get("title"),
            "page": item.get("page"),
            "chunk_index": item.get("chunk_index"),
            "score": item.get("score"),
            "keyword_score": item.get("_keyword_score"),
            "keyword_matches": item.get("_keyword_matches"),
            "status": item.get("status"),
        })
    return summary


def _safe_excerpt(text: str, max_len: int = MAX_EXCERPT_LENGTH) -> str:
    """Trim long text for source previews."""
    if not text:
        return ""

    excerpt = str(text).strip()
    if len(excerpt) <= max_len:
        return excerpt
    return excerpt[:max_len].rstrip() + "..."


def _sort_results(results: list[dict]) -> list[dict]:
    """Sort by relevance, then by recency within close-score groups.

    Items whose scores differ by at most RECENCY_SCORE_DELTA from the
    group's top score are treated as equally relevant; within each group
    the most recently issued document comes first.  Items with clearly
    lower scores are never promoted above higher-scoring ones.
    """
    if not results:
        return []

    # Step A: sort all items by score descending
    sorted_by_score = sorted(
        results,
        key=_result_rank_score,
        reverse=True,
    )

    # Step B: group consecutive items within RECENCY_SCORE_DELTA of each
    # group's top score, then sort each group by issued_date descending
    grouped: list[list[dict]] = []
    current_group: list[dict] = []

    for item in sorted_by_score:
        if not current_group:
            current_group.append(item)
        else:
            group_top_score = _result_rank_score(current_group[0])
            item_score = _result_rank_score(item)
            if group_top_score - item_score <= RECENCY_SCORE_DELTA:
                current_group.append(item)
            else:
                grouped.append(current_group)
                current_group = [item]

    if current_group:
        grouped.append(current_group)

    # Flatten with recency sort within each group
    final: list[dict] = []
    for group in grouped:
        sorted_group = sorted(
            group,
            key=lambda item: _parse_date(item.get("issued_date")) or date.min,
            reverse=True,
        )
        final.extend(sorted_group)

    return final


def _build_sources(results: list[dict]) -> list[dict]:
    """Build source payloads for the frontend, deduplicated by (document_id, page)."""
    sources: list[dict] = []
    seen: set[tuple] = set()

    for item in results:
        doc_id = item.get("document_id")
        page = item.get("page")
        key = (doc_id, page)
        if key in seen:
            continue
        seen.add(key)
        sources.append({
            "document_id": doc_id,
            "title": item.get("title"),
            "type": item.get("type"),
            "page": page,
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
    logger.debug("raw semantic results: %s", _summarize_results(raw_results))

    filtered: list[dict] = []
    for item in raw_results:
        score = float(item.get("score", 0) or 0)

        if score < RETRIEVAL_THRESHOLD:
            continue
        if not _is_usable_source_item(item):
            continue

        filtered.append(item)

    logger.debug("filtered semantic results: %s", _summarize_results(filtered))

    keyword_results: list[dict] = []
    if not filtered:
        keyword_results = _keyword_fallback_search(question)
    logger.debug("keyword fallback results: %s", _summarize_results(keyword_results))

    retrieval_results = filtered or keyword_results
    if not retrieval_results:
        return {
            "answer": FALLBACK_ANSWER,
            "sources": [],
            "fallback": True,
            "used_llm": False,
        }

    sorted_results = _sort_results(retrieval_results)
    final_results = sorted_results[:FINAL_CONTEXTS]
    sources = _build_sources(final_results)

    try:
        from app.services.llm_service import generate_answer_with_ollama

        llm_answer = generate_answer_with_ollama(question, final_results)
        return {
            "answer": llm_answer,
            "sources": sources,
            "fallback": False,
            "used_llm": True,
        }
    except Exception as exc:
        retrieval_answer = _build_retrieval_only_answer(final_results)
        return {
            "answer": retrieval_answer,
            "sources": sources,
            "fallback": False,
            "used_llm": False,
            "llm_error": str(exc),
        }
