from pathlib import Path
import re

import fitz


def _clean_page_text(text: str) -> str:
    text = text.strip()
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def load_pdf_pages(file_path: str) -> list[dict]:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Không tìm thấy file: {file_path}")
    if not path.is_file():
        raise FileNotFoundError(f"Đường dẫn không phải file: {file_path}")
    if path.suffix.lower() != ".pdf":
        raise ValueError("Chỉ hỗ trợ file PDF ở bước này")

    pages: list[dict] = []

    try:
        with fitz.open(path) as doc:
            for index, page in enumerate(doc, start=1):
                text = _clean_page_text(page.get_text("text") or "")
                if text:
                    pages.append({
                        "page": index,
                        "text": text,
                    })
    except FileNotFoundError:
        raise
    except Exception as exc:
        raise ValueError(f"Không đọc được PDF: {exc}") from exc

    return pages
