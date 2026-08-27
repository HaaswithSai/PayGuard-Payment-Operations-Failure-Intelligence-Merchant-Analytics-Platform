import numpy as np
from typing import List, Dict, Any

def extract_anomaly_features(
    amount: float,
    failure_rate_window: float,
    retry_count: int,
    hour_of_day: int,
    merchant_daily_volume: float = 5000.0
) -> np.ndarray:
    """
    Extracts and scales numeric feature vector for IsolationForest anomaly scoring.
    Features:
    0: log(amount + 1)
    1: failure_rate_ratio (0.0 to 1.0)
    2: retry_count (scaled)
    3: is_night_hour (1.0 if between 00:00 - 05:00, else 0.0)
    4: amount_to_daily_vol_ratio
    """
    log_amount = np.log1p(max(0.0, amount))
    fail_rate_scaled = min(1.0, max(0.0, failure_rate_window / 100.0))
    retry_scaled = min(10.0, max(0.0, float(retry_count)))
    is_night = 1.0 if (0 <= hour_of_day <= 5) else 0.0
    vol_ratio = min(10.0, amount / (merchant_daily_volume + 1.0))

    return np.array([[log_amount, fail_rate_scaled, retry_scaled, is_night, vol_ratio]])

def explain_risk_flags(
    amount: float,
    failure_rate_window: float,
    retry_count: int,
    hour_of_day: int,
    anomaly_score: float
) -> List[str]:
    """Generates human-readable risk flags based on feature deviations"""
    flags = []
    if amount > 5000:
        flags.append("HIGH_TRANSACTION_VALUE")
    if failure_rate_window > 25.0:
        flags.append("ELEVATED_FAILURE_RATE_SPIKE")
    if retry_count >= 3:
        flags.append("HIGH_RETRY_FREQUENCY")
    if 0 <= hour_of_day <= 5:
        flags.append("OFF_HOURS_TRANSACTION_ACTIVITY")
    if anomaly_score > 0.75:
        flags.append("MULTIDIMENSIONAL_STATISTICAL_OUTLIER")
        
    return flags
