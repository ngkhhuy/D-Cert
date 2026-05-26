import re
import unicodedata
from typing import Any, Callable


TRAINING_SCORE_SUMMARY = """PHÂN LOẠI ĐIỂM RÈN LUYỆN SINH VIÊN:
Xuất sắc: từ 90 đến 100 điểm.
Tốt: từ 80 đến dưới 90 điểm.
Khá: từ 65 đến dưới 80 điểm.
Trung bình: từ 50 đến dưới 65 điểm.
Yếu: từ 35 đến dưới 50 điểm.
Kém: dưới 35 điểm."""

ENGLISH_OUTCOME_SUMMARY = """CHUẨN TIẾNG ANH ĐẦU RA CHƯƠNG TRÌNH ĐẠI TRÀ:
Sinh viên chương trình đại trà phải đạt yêu cầu về trình độ tiếng Anh đầu ra từ bậc 3/6 trở lên theo Khung năng lực ngoại ngữ 6 bậc dành cho Việt Nam hoặc tương đương. Theo phụ lục, TOEIC 450 tương ứng đạt chuẩn tiếng Anh sau năm thứ 4 và đạt chuẩn tiếng Anh đầu ra."""

CLASS_PERIOD_SUMMARY = """THỜI GIAN TIẾT HỌC:
Tiết 1: 07h00-07h50
Tiết 2: 08h00-08h50
Tiết 3: 09h00-09h50
Tiết 4: 10h00-10h50
Tiết 5: 11h00-11h50
Tiết 6: 12h30-13h20
Tiết 7: 13h30-14h20
Tiết 8: 14h30-15h20
Tiết 9: 15h30-16h20
Tiết 10: 16h30-17h20
Tiết 11: 17h30-18h15
Tiết 12: 18h15-19h00
Tiết 13: 19h10-19h55
Tiết 14: 19h55-20h40"""

SCHOLARSHIP_SUMMARY = """HỌC BỔNG KHUYẾN KHÍCH HỌC TẬP:
Học bổng khuyến khích học tập có 3 loại: loại khá / loại C, loại giỏi / loại B và loại xuất sắc / loại A.

1. Học bổng loại khá / loại C:
- Điều kiện điểm học tập: điểm trung bình chung học tập từ 7.00 đến 7.99 theo thang điểm 10.
- Điều kiện điểm rèn luyện: đạt loại khá trở lên, tức từ 65 điểm trở lên.
- Mức học bổng: bằng 100% mức học phí hiện hành của chương trình đào tạo mà sinh viên phải đóng đối với các học phần học lần đầu trong học kỳ lấy điểm xét học bổng.

2. Học bổng loại giỏi / loại B:
- Điều kiện điểm học tập: điểm trung bình chung học tập từ 8.00 đến 8.99 theo thang điểm 10.
- Điều kiện điểm rèn luyện: đạt loại tốt trở lên, tức từ 80 điểm trở lên.
- Mức học bổng: bằng 120% mức học bổng loại khá / loại C.

3. Học bổng loại xuất sắc / loại A:
- Điều kiện điểm học tập: điểm trung bình chung học tập từ 9.00 trở lên theo thang điểm 10.
- Điều kiện điểm rèn luyện: đạt loại xuất sắc, tức từ 90 điểm trở lên.
- Mức học bổng: bằng 150% mức học bổng loại khá / loại C."""


def _normalize_text(value: Any) -> str:
    text = unicodedata.normalize("NFD", str(value or "").casefold())
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.replace("đ", "d").replace("Ä‘", "d")
    text = re.sub(r"[^0-9a-z]+", " ", text)
    return " ".join(text.split())


def _page_text(page: dict) -> str:
    return str(page.get("text") or "")


def _page_number(page: dict) -> int | None:
    value = page.get("page")
    return value if isinstance(value, int) else None


def _first_matching_page(pages: list[dict], needles: list[str]) -> int | None:
    normalized_needles = [_normalize_text(needle) for needle in needles]
    for page in pages:
        normalized_text = _normalize_text(_page_text(page))
        if any(needle and needle in normalized_text for needle in normalized_needles):
            return _page_number(page)
    return _page_number(pages[0]) if pages else None


def _best_scored_page(
    pages: list[dict],
    score_page: Callable[[str], int],
) -> int | None:
    best_page: int | None = None
    best_score = 0

    for page in pages:
        score = score_page(_normalize_text(_page_text(page)))
        if score > best_score:
            best_score = score
            best_page = _page_number(page)

    return best_page


def _training_score_page(pages: list[dict]) -> int | None:
    labels = (
        "xuat sac",
        "tot",
        "kha",
        "trung binh",
        "yeu",
        "kem",
    )

    def score_page(text: str) -> int:
        score = sum(2 for label in labels if label in text)
        score += text.count("diem")
        if "phan loai ket qua ren luyen" in text:
            score += 4
        if "tu 90 den 100" in text or "duoi 35" in text:
            score += 6
        return score

    return _best_scored_page(pages, score_page)


def _class_period_page(pages: list[dict]) -> int | None:
    def score_page(text: str) -> int:
        score = 0
        if "thoi gian tiet hoc" in text:
            score += 4
        score += len(re.findall(r"\btiet\s+\d+\b", text))
        score += len(re.findall(r"\b\d{2}h\d{2}\b", text))
        return score

    return _best_scored_page(pages, score_page)


def _scholarship_page(pages: list[dict]) -> int | None:
    def score_page(text: str) -> int:
        phrases = (
            "hoc bong khuyen khich hoc tap",
            "hoc bong loai kha",
            "hoc bong loai gioi",
            "hoc bong loai xuat sac",
            "loai c",
            "loai b",
            "loai a",
        )
        score = sum(4 for phrase in phrases if phrase in text)
        score += text.count("hoc bong")
        score += text.count("diem ren luyen")
        score += text.count("diem trung binh chung hoc tap")
        if "120" in text and "loai kha" in text:
            score += 4
        if "150" in text and "loai kha" in text:
            score += 4
        return score

    return _best_scored_page(pages, score_page)


def _make_chunk(
    base_metadata: dict,
    content: str,
    page: int | None,
    chunk_index: int,
) -> dict:
    return {
        "document_id": base_metadata.get("document_id"),
        "title": base_metadata.get("title"),
        "type": base_metadata.get("type"),
        "source_unit": base_metadata.get("source_unit"),
        "issued_date": base_metadata.get("issued_date"),
        "effective_from": base_metadata.get("effective_from"),
        "effective_to": base_metadata.get("effective_to"),
        "status": base_metadata.get("status", "PUBLISHED"),
        "page": page,
        "chunk_index": chunk_index,
        "content": content,
        "is_generated_summary": True,
        "source_strategy": "table_to_text",
    }


def _has_training_score_table(normalized_text: str) -> bool:
    labels = (
        "xuat sac",
        "tot",
        "kha",
        "trung binh",
        "yeu",
        "kem",
    )
    label_hits = sum(1 for label in labels if label in normalized_text)
    return (
        "phan loai ket qua ren luyen" in normalized_text
        or "diem ren luyen" in normalized_text and label_hits >= 4
        or label_hits >= 5
    )


def _has_english_outcome_rule(normalized_text: str) -> bool:
    return (
        "yeu cau ve trinh do tieng anh khi tot nghiep" in normalized_text
        and "chuong trinh dai tra" in normalized_text
    )


def _has_class_period_table(normalized_text: str) -> bool:
    return "thoi gian tiet hoc" in normalized_text


def _has_scholarship_table(normalized_text: str) -> bool:
    scholarship_phrases = (
        "hoc bong khuyen khich hoc tap",
        "hoc bong loai kha",
        "hoc bong loai gioi",
        "hoc bong loai xuat sac",
    )
    phrase_hits = sum(1 for phrase in scholarship_phrases if phrase in normalized_text)
    return (
        phrase_hits >= 1
        and (
            "diem trung binh chung hoc tap" in normalized_text
            or "diem ren luyen" in normalized_text
            or "muc hoc bong" in normalized_text
            or phrase_hits >= 2
        )
    )


def build_generated_chunks(pages: list[dict], base_metadata: dict) -> list[dict]:
    """Build rule-based summary chunks for important PDF tables."""
    if not pages:
        return []

    full_text = "\n".join(_page_text(page) for page in pages)
    normalized_text = _normalize_text(full_text)
    chunk_index = int(base_metadata.get("chunk_index_start", 0) or 0)
    generated_chunks: list[dict] = []

    if _has_training_score_table(normalized_text):
        generated_chunks.append(_make_chunk(
            base_metadata,
            TRAINING_SCORE_SUMMARY,
            _training_score_page(pages),
            chunk_index + len(generated_chunks),
        ))

    if _has_english_outcome_rule(normalized_text):
        generated_chunks.append(_make_chunk(
            base_metadata,
            ENGLISH_OUTCOME_SUMMARY,
            _first_matching_page(
                pages,
                ["Yêu cầu về trình độ tiếng Anh khi tốt nghiệp"],
            ),
            chunk_index + len(generated_chunks),
        ))

    if _has_class_period_table(normalized_text):
        generated_chunks.append(_make_chunk(
            base_metadata,
            CLASS_PERIOD_SUMMARY,
            _class_period_page(pages),
            chunk_index + len(generated_chunks),
        ))

    if _has_scholarship_table(normalized_text):
        generated_chunks.append(_make_chunk(
            base_metadata,
            SCHOLARSHIP_SUMMARY,
            _scholarship_page(pages),
            chunk_index + len(generated_chunks),
        ))

    return generated_chunks
