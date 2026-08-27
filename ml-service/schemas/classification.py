from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class PredictRequest(BaseModel):
    rawText: str = Field(..., description="Raw gateway failure description or error message")
    gateway: Optional[str] = Field(None, description="Payment gateway (e.g. STRIPE, ADYEN)")
    issuingBank: Optional[str] = Field(None, description="Card issuing bank name")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Contextual payload metadata")

class PredictResponse(BaseModel):
    category: str
    isoCode: Optional[str] = None
    confidence: float
    source: str = "ML"
    modelVersion: str
    normalizedText: str

class BatchPredictRequest(BaseModel):
    items: List[PredictRequest]

class BatchPredictResponse(BaseModel):
    predictions: List[PredictResponse]
    count: int
