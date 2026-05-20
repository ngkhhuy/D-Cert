from fastapi import FastAPI
from dotenv import load_dotenv

from app.api.chat import router as chat_router
from app.api.ingest import router as ingest_router

load_dotenv()

app = FastAPI(
    title="D-CERT AI Service",
    version="1.0.0"
)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "d-cert-ai-service"
    }

app.include_router(chat_router, prefix="/chat", tags=["Chat"])
app.include_router(ingest_router, prefix="/ingest", tags=["Ingest"])
