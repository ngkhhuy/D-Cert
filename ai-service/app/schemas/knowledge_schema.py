from pydantic import BaseModel, Field


class ArchiveKnowledgeRequest(BaseModel):
    document_id: str = Field(..., min_length=1)


class RebuildIndexResponse(BaseModel):
    success: bool
    message: str
    data: dict | None = None
