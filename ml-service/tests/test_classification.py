import pytest
from utils.text_normalization import normalize_text, extract_iso_code
from services.classification_service import classification_service
from schemas.classification import PredictRequest

def test_text_normalization():
    assert normalize_text("CARD_DECLINED_INSUFFICIENT_FUNDS-51!") == "card declined insufficient funds 51"
    assert normalize_text("3DS/Authentication-Failed") == "3ds authentication failed"
    assert normalize_text("") == ""

def test_extract_iso_code():
    code, cat = extract_iso_code("card declined insufficient funds 51")
    assert code == "51"
    assert cat == "INSUFFICIENT_FUNDS"

    code54, cat54 = extract_iso_code("iso 54 expired card")
    assert code54 == "54"
    assert cat54 == "CARD_EXPIRED"

    no_code, no_cat = extract_iso_code("gateway timeout waiting for response")
    assert no_code is None
    assert no_cat is None

def test_classify_insufficient_funds():
    req = PredictRequest(rawText="card_declined_insufficient_funds")
    res = classification_service.classify_failure(req)
    assert res.category == "INSUFFICIENT_FUNDS"
    assert res.confidence >= 0.70

def test_classify_card_expired():
    req = PredictRequest(rawText="card validity has expired 54")
    res = classification_service.classify_failure(req)
    assert res.category == "CARD_EXPIRED"
    assert res.isoCode == "54"

def test_classify_auth_failed():
    req = PredictRequest(rawText="3ds authentication challenge failure")
    res = classification_service.classify_failure(req)
    assert res.category == "AUTHENTICATION_FAILED"

def test_classify_fraud():
    req = PredictRequest(rawText="high risk suspected fraud block")
    res = classification_service.classify_failure(req)
    assert res.category == "FRAUD_SUSPECTED"

def test_classify_timeout():
    req = PredictRequest(rawText="gateway upstream timeout 504")
    res = classification_service.classify_failure(req)
    assert res.category == "NETWORK_TIMEOUT"

def test_metadata_iso_override():
    req = PredictRequest(rawText="generic decline", metadata={"isoCode": "51"})
    res = classification_service.classify_failure(req)
    assert res.category == "INSUFFICIENT_FUNDS"
    assert res.isoCode == "51"
    assert res.confidence == 1.0
