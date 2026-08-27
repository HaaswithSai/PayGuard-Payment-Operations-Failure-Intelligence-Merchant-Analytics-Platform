import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from services.model_loader import model_loader
from services.classification_service import classification_service
from services.anomaly_service import anomaly_service
from schemas.common import HealthResponse, ModelInfoResponse
from schemas.classification import PredictRequest, PredictResponse, BatchPredictRequest, BatchPredictResponse
from schemas.anomaly import AnomalyScoreRequest, AnomalyScoreResponse
from utils.trainer import train_models

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
)
logger = logging.getLogger("PayGuard-ML")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing PayGuard ML Microservice...")
    model_loader.load_or_train()
    logger.info("ML Models ready for inference.")
    yield
    logger.info("Shutting down PayGuard ML Microservice.")

app = FastAPI(
    title="PayGuard AI & Failure Classification Microservice",
    description="Provides NLP failure reason categorization, ISO 8583 normalization, and IsolationForest operational anomaly scoring for PayGuard.",
    version=settings.SERVICE_VERSION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Health Telemetry Endpoints
@app.get("/health", response_model=HealthResponse, tags=["Telemetry"])
@app.get("/api/v1/health", response_model=HealthResponse, tags=["Telemetry"])
def health_check():
    return HealthResponse(
        status="healthy",
        service=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        modelsLoaded={
            "classifier": model_loader.classifier is not None,
            "vectorizer": model_loader.vectorizer is not None,
            "anomaly_detector": model_loader.anomaly_detector is not None,
        },
    )

# 2. Model Metadata
@app.get("/model/info", response_model=ModelInfoResponse, tags=["Metadata"])
def get_model_info():
    return ModelInfoResponse(
        service=settings.SERVICE_NAME,
        classifierVersion=settings.MODEL_VERSION,
        anomalyModelVersion=settings.ANOMALY_MODEL_VERSION,
        supportedCategories=settings.FAILURE_CATEGORIES,
        isClassifierReady=model_loader.classifier is not None,
        isAnomalyDetectorReady=model_loader.anomaly_detector is not None,
    )

# 3. Main Classification Endpoint (Supports both Node backend bridge contract and direct REST)
@app.post("/api/v1/predict", response_model=PredictResponse, tags=["Inference"])
@app.post("/classify/failure", response_model=PredictResponse, tags=["Inference"])
def classify_failure(request: PredictRequest):
    try:
        result = classification_service.classify_failure(request)
        return result
    except Exception as e:
        logger.error(f"Inference error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification inference failed: {str(e)}",
        )

# 4. Batch Classification
@app.post("/classify/batch", response_model=BatchPredictResponse, tags=["Inference"])
def batch_classify_failures(request: BatchPredictRequest):
    predictions = [classification_service.classify_failure(item) for item in request.items]
    return BatchPredictResponse(predictions=predictions, count=len(predictions))

# 5. Anomaly Detection & Operational Alert Scoring
@app.post("/anomaly/score", response_model=AnomalyScoreResponse, tags=["Anomaly Detection"])
def score_anomaly(request: AnomalyScoreRequest):
    try:
        return anomaly_service.score_anomaly(request)
    except Exception as e:
        logger.error(f"Anomaly scoring error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Anomaly scoring failed: {str(e)}",
        )

# 6. Retraining Trigger (Dev / Ops Admin)
@app.post("/train/models", tags=["Training"])
def trigger_retraining():
    try:
        train_models()
        model_loader.load_or_train()
        return {"success": True, "message": "ML models successfully retrained and reloaded into memory."}
    except Exception as e:
        logger.error(f"Retraining error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retraining failed: {str(e)}",
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=settings.HOST, port=settings.PORT, reload=True)
