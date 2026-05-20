from fastapi import APIRouter, HTTPException

from app.schemas.knowledge_schema import ArchiveKnowledgeRequest
from app.services.vector_store import archive_document_metadata, rebuild_index_from_published_metadata


router = APIRouter()


@router.post("/archive")
def archive_knowledge(req: ArchiveKnowledgeRequest):
    try:
        result = archive_document_metadata(req.document_id)
        return {
            "success": True,
            "message": "Đã cập nhật trạng thái ARCHIVED trong metadata AI.",
            "data": result,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Archive metadata thất bại: {str(exc)}",
        ) from exc


@router.post("/rebuild-index")
def rebuild_index():
    try:
        result = rebuild_index_from_published_metadata()
        return {
            "success": True,
            "message": "Rebuild FAISS index thành công.",
            "data": result,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Rebuild index thất bại: {str(exc)}",
        ) from exc
