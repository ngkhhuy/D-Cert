from typing import Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    student_id: Optional[str] = None


class SourceItem(BaseModel):
    document_id: str
    title: str
    type: str
    page: int
    chunk_index: Optional[int] = None
    source_unit: Optional[str] = None
    issued_date: Optional[str] = None
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None
    excerpt: str
    score: float


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    fallback: bool = False
    used_llm: bool = False
