from typing import Optional

from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    document_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    file_path: str = Field(..., min_length=1)
    source_unit: Optional[str] = None
    issued_date: Optional[str] = None
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None
