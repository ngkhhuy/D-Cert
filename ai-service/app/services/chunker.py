import re


SENTENCE_BOUNDARIES = (".", "!", "?", ":", ";", "\n")
LIST_MARKER_RE = re.compile(r"^(?:\d+\.\s*|[a-zA-Z]\.\s*|[•+\-]\s*)")
SENTENCE_RE = re.compile(r".+?(?:[.!?:;](?=\s|$)|\n|$)", re.DOTALL)


def clean_text(text: str) -> str:
    """Normalize whitespace while keeping meaningful line boundaries."""
    if not text:
        return ""

    normalized = text.replace("\x00", " ").replace("\r\n", "\n").replace("\r", "\n")
    lines: list[str] = []
    previous_blank = False

    for raw_line in normalized.split("\n"):
        line = re.sub(r"[ \t\f\v]+", " ", raw_line).strip()
        if not line:
            if lines and not previous_blank:
                lines.append("")
            previous_blank = True
            continue

        lines.append(line)
        previous_blank = False

    while lines and not lines[-1]:
        lines.pop()

    return "\n".join(lines)


def _is_list_line(paragraph: str) -> bool:
    """Return True for numbered, lettered, or bullet administrative lines."""
    return bool(LIST_MARKER_RE.match(paragraph))


def _split_paragraphs(text: str) -> list[str]:
    """Split normalized text into non-empty paragraph lines."""
    return [line for line in text.split("\n") if line.strip()]


def _group_blocks(paragraphs: list[str]) -> list[str]:
    """Group consecutive list items so related clauses stay together."""
    blocks: list[str] = []
    list_lines: list[str] = []

    for paragraph in paragraphs:
        if _is_list_line(paragraph):
            list_lines.append(paragraph)
            continue

        if list_lines:
            blocks.append("\n".join(list_lines))
            list_lines = []
        blocks.append(paragraph)

    if list_lines:
        blocks.append("\n".join(list_lines))

    return blocks


def _split_sentences(block: str) -> list[str]:
    """Split a long block on sentence and line boundaries."""
    sentences = [match.group(0).strip() for match in SENTENCE_RE.finditer(block)]
    return [sentence for sentence in sentences if sentence]


def _last_boundary_before(text: str, limit: int) -> int:
    """Find a readable split point before limit, preferring sentence endings."""
    candidate = text[:limit]
    boundary = max(candidate.rfind(marker) for marker in SENTENCE_BOUNDARIES)
    if boundary != -1:
        return boundary + 1

    whitespace = candidate.rfind(" ")
    if whitespace != -1:
        return whitespace + 1

    return limit


def _split_oversized_sentence(sentence: str, chunk_size: int) -> list[str]:
    """Split text with no usable sentence boundary without returning empties."""
    pieces: list[str] = []
    remaining = sentence.strip()

    while len(remaining) > chunk_size:
        split_at = _last_boundary_before(remaining, chunk_size)
        piece = remaining[:split_at].strip()
        if not piece:
            split_at = chunk_size
            piece = remaining[:split_at].strip()
        if piece:
            pieces.append(piece)
        remaining = remaining[split_at:].strip()

    if remaining:
        pieces.append(remaining)

    return pieces


def _split_long_block(block: str, chunk_size: int) -> list[str]:
    """Split an oversized block into sentence-aware parts."""
    if len(block) <= chunk_size:
        return [block]

    parts: list[str] = []
    current: list[str] = []

    for sentence in _split_sentences(block):
        sentence_parts = (
            _split_oversized_sentence(sentence, chunk_size)
            if len(sentence) > chunk_size
            else [sentence]
        )

        for sentence_part in sentence_parts:
            candidate = "\n".join([*current, sentence_part]) if current else sentence_part
            if current and len(candidate) > chunk_size:
                parts.append("\n".join(current))
                current = [sentence_part]
            else:
                current.append(sentence_part)

    if current:
        parts.append("\n".join(current))

    return parts


def _join_blocks(blocks: list[str]) -> str:
    """Join block text while avoiding empty chunk content."""
    return "\n".join(block.strip() for block in blocks if block.strip()).strip()


def _sentence_aligned_tail(text: str, overlap: int) -> str:
    """Return a short overlap tail that starts near a readable boundary."""
    if overlap <= 0:
        return ""
    if len(text) <= overlap:
        return text.strip()

    start = len(text) - overlap
    tail = text[start:]
    candidates = [tail.find(marker) for marker in SENTENCE_BOUNDARIES]
    boundaries = [position for position in candidates if position != -1]

    if boundaries:
        return tail[min(boundaries) + 1 :].strip()

    whitespace = tail.find(" ")
    if whitespace != -1:
        return tail[whitespace + 1 :].strip()

    return tail.strip()


def _overlap_blocks(blocks: list[str], overlap: int) -> list[str]:
    """Select whole ending blocks for overlap, falling back to a readable tail."""
    if overlap <= 0 or not blocks:
        return []

    selected: list[str] = []
    for block in reversed(blocks):
        candidate = [block, *selected]
        if len(_join_blocks(candidate)) > overlap:
            break
        selected = candidate

    if selected:
        return selected

    tail = _sentence_aligned_tail(blocks[-1], overlap)
    return [tail] if tail else []


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Chunk Vietnamese administrative text by blocks with readable overlap."""
    if chunk_size <= 0:
        raise ValueError("chunk_size phải lớn hơn 0")
    if overlap < 0:
        raise ValueError("overlap không được âm")
    if overlap >= chunk_size:
        raise ValueError("overlap phải nhỏ hơn chunk_size")

    cleaned = clean_text(text)
    if not cleaned:
        return []

    blocks: list[str] = []
    for block in _group_blocks(_split_paragraphs(cleaned)):
        blocks.extend(_split_long_block(block, chunk_size))

    chunks: list[str] = []
    current_blocks: list[str] = []

    for block in blocks:
        candidate_blocks = [*current_blocks, block]
        if current_blocks and len(_join_blocks(candidate_blocks)) > chunk_size:
            chunk = _join_blocks(current_blocks)
            if chunk:
                chunks.append(chunk)

            current_blocks = _overlap_blocks(current_blocks, overlap)
            candidate_blocks = [*current_blocks, block]
            if current_blocks and len(_join_blocks(candidate_blocks)) > chunk_size:
                current_blocks = []

        current_blocks.append(block)

    final_chunk = _join_blocks(current_blocks)
    if final_chunk:
        chunks.append(final_chunk)

    return chunks
