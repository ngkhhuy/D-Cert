import re

SENTENCE_BOUNDARIES = (".", "!", "?", "。", ":", ";", "\n")


def clean_text(text: str) -> str:
    """Normalize whitespace while preserving paragraph boundaries."""
    text = text.replace("\x00", " ")
    text = text.strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    return text.strip()


def _find_sentence_boundary(chunk: str, lookback: int = 200) -> int:
    search_start = max(len(chunk) - lookback, 0)
    tail = chunk[search_start:]
    candidates = [tail.rfind(boundary) for boundary in SENTENCE_BOUNDARIES]
    split_at = max(candidates)
    if split_at == -1:
        return -1
    return search_start + split_at + 1


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks, preferring sentence boundaries."""
    if chunk_size <= 0:
        raise ValueError("chunk_size phải lớn hơn 0")
    if overlap < 0:
        raise ValueError("overlap không được âm")
    if overlap >= chunk_size:
        raise ValueError("overlap phải nhỏ hơn chunk_size")

    cleaned = clean_text(text)
    if not cleaned:
        return []
    if len(cleaned) <= chunk_size:
        return [cleaned]

    chunks: list[str] = []
    start = 0

    while start < len(cleaned):
        end = min(start + chunk_size, len(cleaned))
        chunk = cleaned[start:end]

        if end < len(cleaned):
            split_at = _find_sentence_boundary(chunk)
            if split_at != -1:
                end = start + split_at
                chunk = cleaned[start:end]

        chunk = chunk.strip()
        if chunk:
            chunks.append(chunk)

        if end >= len(cleaned):
            break
        start = max(end - overlap, 0)

    return chunks
