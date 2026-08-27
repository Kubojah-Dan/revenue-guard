import pytest
import sqlite3
from app.services.detection_rules import evaluate_rules

DB_PATH = "data/final/revenue_leaks.db"

def test_evaluate_rules_all():
    alerts = evaluate_rules(DB_PATH)
    assert isinstance(alerts, list)
    assert len(alerts) > 0

def test_rule_r03_seed_acme():
    alerts = evaluate_rules(DB_PATH, customer_id="CUST-0042")
    rule_ids = [a["rule_id"] for a in alerts]
    assert "R03" in rule_ids
    acme_alert = next(a for a in alerts if a["rule_id"] == "R03")
    assert acme_alert["severity"] == "critical"
    assert acme_alert["leak_amount_paise"] >= 30000000  # >= ₹3L

def test_rule_r02_seed_vertex():
    alerts = evaluate_rules(DB_PATH, customer_id="CUST-0108")
    rule_ids = [a["rule_id"] for a in alerts]
    assert "R02" in rule_ids

def test_rule_r09_seed_neon():
    alerts = evaluate_rules(DB_PATH, customer_id="CUST-0077")
    rule_ids = [a["rule_id"] for a in alerts]
    assert "R09" in rule_ids

def test_rule_r11_seed_bluestar():
    alerts = evaluate_rules(DB_PATH, customer_id="CUST-0031")
    rule_ids = [a["rule_id"] for a in alerts]
    assert "R11" in rule_ids
