import os

import requests


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b-instruct")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "120"))
MAX_CONTEXTS = 5
MAX_CONTEXT_CONTENT_LENGTH = 1200


def _value_or_unknown(value) -> str:
    if value is None or value == "":
        return "Không rõ"
    return str(value)


def _build_context_text(contexts: list[dict]) -> str:
    """Build cited context blocks for the LLM prompt."""
    blocks: list[str] = []

    for index, item in enumerate(contexts[:MAX_CONTEXTS], start=1):
        content = str(item.get("content") or "").strip()
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


def _build_prompt(question: str, contexts: list[dict]) -> str:
    """Create a grounded Vietnamese prompt for academic QA."""
    context_text = _build_context_text(contexts)
    return f"""Bạn là trợ lý học vụ của hệ thống D-CERT.

Nhiệm vụ:
- Trả lời câu hỏi của sinh viên dựa trên NGỮ CẢNH được cung cấp.
- Chỉ sử dụng thông tin trong NGỮ CẢNH.
- Không tự bịa quy định, ngày tháng, địa điểm hoặc điều kiện nếu ngữ cảnh không nêu.
- Không đưa ra quyết định học vụ cá nhân thay nhà trường.
- Nếu câu hỏi yêu cầu kết luận cá nhân như "em có đủ điều kiện tốt nghiệp chưa", hãy giải thích điều kiện chung và nói cần đối chiếu dữ liệu cá nhân với phòng đào tạo.
- Nếu ngữ cảnh không đủ thông tin, hãy nói: "Mình chưa tìm thấy thông tin này trong các văn bản đã được nhà trường công khai trên hệ thống."
- Trả lời bằng tiếng Việt, rõ ràng, ngắn gọn, dễ hiểu.
- Cuối câu trả lời nên có mục "Nguồn tham khảo" liệt kê tên văn bản và trang liên quan.

CÂU HỎI:
{question}

NGỮ CẢNH:
{context_text}

Hãy trả lời sinh viên theo cấu trúc:
- Trả lời ngắn gọn:
- Chi tiết:
- Nguồn tham khảo:
"""


def generate_answer_with_ollama(question: str, contexts: list[dict]) -> str:
    """Generate a grounded answer with local Ollama."""
    if not question or not question.strip():
        raise ValueError("question không được rỗng")
    if not contexts:
        raise ValueError("contexts không được rỗng")

    prompt = _build_prompt(question.strip(), contexts)
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
        "stream": False,
        "options": {
            "temperature": 0.2,
            "top_p": 0.9,
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
