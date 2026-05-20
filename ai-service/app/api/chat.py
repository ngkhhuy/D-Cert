from fastapi import APIRouter, HTTPException

from app.schemas.chat_schema import ChatRequest
from app.services.rag_service import answer_question


router = APIRouter()


@router.post("")
def chat(req: ChatRequest):
    try:
        return answer_question(req.question, req.student_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Chat retrieval thất bại: {str(exc)}",
        ) from exc
