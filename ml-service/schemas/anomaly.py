from pydantic import BaseModel, Field
from typing import Optional, List

class AnomalyScoreRequest(BaseModel):
    amount: float = Field(..., ge=0, description="Payment transaction amount in USD")
    gateway: str = Field(default="STRIPE", description="Payment Gateway name")
    failureRateWindow: float = Field(default=0.0, ge=0.0, le=100.0, description="Recent 15-min failure rate % for this merchant/gateway")
    retryCount: int = Field(default=0, ge=0, description="Number of attempts on same card/idempotency key")
    hourOfDay: int = Field(default=12, ge=0, le=23, description="Hour of the transaction (0-23)")
    merchantDailyVolume: Optional[float] = Field(default=5000.0, ge=0, description="Merchant average daily volume in USD")

class AnomalyScoreResponse(BaseModel):
    isAnomaly: bool
    anomalyScore: float = Field(..., description="Normalized anomaly score between 0.0 (Normal) and 1.0 (Highly Anomalous)")
    alertLevel: str = Field(..., description="Alert severity: LOW, MEDIUM, HIGH, CRITICAL")
    explanation: str
    riskFlags: List[str]
    modelVersion: str
