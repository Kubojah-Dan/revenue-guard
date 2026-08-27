import pytest
from app.services.conformance_engine import evaluate_conformance, conformance_score

DB_PATH = "data/final/revenue_leaks.db"

def test_evaluate_conformance_all():
    devs = evaluate_conformance(DB_PATH)
    assert isinstance(devs, list)
    assert len(devs) > 0

def test_gf02_acme():
    devs = evaluate_conformance(DB_PATH, customer_id="CUST-0042")
    rule_ids = [d["rule_id"] for d in devs]
    assert "GF02" in rule_ids
    gf02_dev = next(d for d in devs if d["rule_id"] == "GF02")
    assert gf02_dev["deviation_type"] == "MISSING_APPROVAL"
    assert gf02_dev["process_break_step"] == "DISCOUNT_APPLIED"

def test_gf05_vertex():
    devs = evaluate_conformance(DB_PATH, customer_id="CUST-0108")
    rule_ids = [d["rule_id"] for d in devs]
    assert "GF05" in rule_ids

def test_gf08_neon():
    devs = evaluate_conformance(DB_PATH, customer_id="CUST-0077")
    rule_ids = [d["rule_id"] for d in devs]
    assert "GF08" in rule_ids

def test_conformance_score():
    score = conformance_score(DB_PATH, "CUST-0042")
    assert 0.0 <= score <= 1.0
    assert score < 1.0
