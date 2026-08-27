from pydantic import BaseModel
from typing import Dict, List, Optional

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    modelsLoaded: Dict[str, bool]

class ModelInfoResponse(BaseModel):
    service: str
    classifierVersion: str
    anomalyModelVersion: str
    supportedCategories: List[str]
    isClassifierReady: bool
    isAnomalyDetectorReady: bool
