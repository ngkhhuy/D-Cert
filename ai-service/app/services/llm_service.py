import os
from typing import Any

import requests


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "dcert-qwen14b-vi")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "180"))

# Giữ nguyên theo yêu cầu: 5 nguồn, mỗi nguồn tối đa 1200 ký tự.
MAX_CONTEXTS = int(os.getenv("MAX_CONTEXTS", "5"))
MAX_CONTEXT_CONTENT_LENGTH = int(os.getenv("MAX_CONTEXT_CONTENT_LENGTH", "1200"))


SYSTEM_PROMPT = """Bạn là trợ lý học vụ tiếng Việt của hệ thống D-CERT.

QUY TẮC BẮT BUỘC:
- Luôn trả lời 100% bằng tiếng Việt có dấu.
- Không dùng tiếng Trung, tiếng Anh hoặc bất kỳ ngôn ngữ nào khác.
- Không chèn ký tự Hán, pinyin hoặc đoạn văn nước ngoài.
- Chỉ trả lời dựa trên NGỮ CẢNH được cung cấp.
- Không tự bịa quy định, ngày tháng, địa điểm, số liệu hoặc điều kiện.
- Không mở rộng sang quy định chung của trường khác, sở giáo dục hoặc đơn vị khác nếu ngữ cảnh không đề cập.
- Khi trả lời, ưu tiên dùng đúng tên văn bản, đơn vị ban hành, thời gian và thông tin trong nguồn.
- Không đưa ra quyết định học vụ cá nhân thay nhà trường.
- Nếu câu hỏi yêu cầu kết luận cá nhân như "em có đủ điều kiện không", hãy giải thích điều kiện chung và nói cần đối chiếu dữ liệu cá nhân với phòng đào tạo.
- Nếu ngữ cảnh không đủ thông tin, hãy nói: "Mình chưa tìm thấy thông tin này trong các văn bản đã được nhà trường công khai trên hệ thống."
- Cuối câu trả lời phải có mục "Nguồn tham khảo" nếu có nguồn phù hợp.
"""


def _value_or_unknown(value: Any) -> str:
    if value is None or value == "":
        return "Không rõ"
    return str(value)


def _clean_text(value: Any) -> str:
    """Normalize text for prompt context."""
    text = str(value or "").strip()
    return " ".join(text.split())


def _build_context_text(contexts: list[dict]) -> str:
    """Build cited context blocks for the LLM prompt."""
    blocks: list[str] = []

    for index, item in enumerate(contexts[:MAX_CONTEXTS], start=1):
        content = _clean_text(item.get("content"))

        if len(content) > MAX_CONTEXT_CONTENT_LENGTH:
            content = content[:MAX_CONTEXT_CONTENT_LENGTH].rstrip() + "..."

        blocks.append(
            f"[Nguồn {index}]\n"
            f"Tên văn bản: {_value_or_unknown(item.get('title'))}\n"
            f"Loại văn bản: {_value_or_unknown(item.get('type'))}\n"
            f"Đơn vị ban hành: {_value_or_unknown(item.get('source_unit'))}\n"
            f"Ngày ban hành: {_value_or_unknown(item.get('issued_date'))}\n"
            f"Trang: {_value_or_unknown(item.get('page'))}\n"
            "Nội dung:\n"
            f"{content}"
        )

    return "\n\n".join(blocks)


def _build_user_prompt(question: str, contexts: list[dict]) -> str:
    """Create user prompt with question and grounded context."""
    context_text = _build_context_text(contexts)

    return f"""CÂU HỎI CỦA SINH VIÊN:
{question}

NGỮ CẢNH ĐƯỢC TRUY XUẤT TỪ KHO VĂN BẢN:
{context_text}

Hãy trả lời sinh viên theo đúng cấu trúc sau:

Trả lời ngắn gọn:
...

Chi tiết:
...

Nguồn tham khảo:
- Tên văn bản, trang, đơn vị ban hành nếu có.
"""


def generate_answer_with_ollama(question: str, contexts: list[dict]) -> str:
    """Generate a grounded answer with local Ollama."""
    if not question or not question.strip():
        raise ValueError("question không được rỗng")

    if not contexts:
        raise ValueError("contexts không được rỗng")

    user_prompt = _build_user_prompt(question.strip(), contexts)

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        "stream": False,
        "options": {
            "temperature": 0.1,
            "top_p": 0.85,
            "num_ctx": 4096,
        },
    }

    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload,
            timeout=OLLAMA_TIMEOUT,
        )
        response.raise_for_status()

    except requests.Timeout as exc:
        raise RuntimeError(f"Ollama timeout sau {OLLAMA_TIMEOUT} giây") from exc

    except requests.ConnectionError as exc:
        raise RuntimeError(f"Không kết nối được Ollama tại {OLLAMA_BASE_URL}") from exc

    except requests.RequestException as exc:
        detail = ""
        if exc.response is not None:
            detail = exc.response.text[:500]
        raise RuntimeError(f"Ollama request thất bại: {detail or str(exc)}") from exc

    try:
        data = response.json()
        content = data["message"]["content"].strip()

    except (KeyError, TypeError, ValueError) as exc:
        raise RuntimeError("Ollama response không đúng định dạng") from exc

    if not content:
        raise ValueError("Ollama trả về nội dung rỗng")

    return content