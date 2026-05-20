from fastapi import APIRouter, HTTPException

from app.schemas.ingest_schema import IngestRequest
from app.services.rag_service import ingest_document


router = APIRouter()


@router.post("")
def ingest(req: IngestRequest):
    try:
        return ingest_document(req)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Index tài liệu thất bại: {str(exc)}",
        ) from exc
