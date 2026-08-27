from typing import Optional
from fastapi import APIRouter, Query
from app.services.conformance_engine import evaluate_conformance
from app.services.detection_rules import evaluate_rules
from app.services.counterfactual_engine import calculate_recoverable_paise

router = APIRouter()
DB_PATH = "data/final/revenue_leaks.db"

@router.get("/api/recoverable-summary")
def get_recoverable_summary(
    period: Optional[str] = Query("30d"),
    group_by: Optional[str] = Query("leak_type")
):
    raw_rule = evaluate_rules(DB_PATH)
    raw_conf = evaluate_conformance(DB_PATH)

    combined = []
    seen = set()
    for item in raw_rule + raw_conf:
        key = (item["customer_id"], item["rule_id"])
        if key not in seen:
            seen.add(key)
            combined.append(item)

    total_leak_paise = sum(item["leak_amount_paise"] for item in combined)
    total_rec_paise = sum(calculate_recoverable_paise(item["leak_type"], item["leak_amount_paise"]) for item in combined)

    total_leak_rs = float(total_leak_paise) / 100.0
    total_rec_rs = float(total_rec_paise) / 100.0

    # Group by leak type
    by_type_map = {}
    for item in combined:
        lt = item["leak_type"]
        leak_p = item["leak_amount_paise"]
        rec_p = calculate_recoverable_paise(lt, leak_p)
        
        if lt not in by_type_map:
            by_type_map[lt] = {"leakage_paise": 0, "recoverable_paise": 0, "count": 0}
        by_type_map[lt]["leakage_paise"] += leak_p
        by_type_map[lt]["recoverable_paise"] += rec_p
        by_type_map[lt]["count"] += 1

    by_leak_type = []
    for lt, stats in by_type_map.items():
        by_leak_type.append({
            "leak_type": lt,
            "leakage_rs": float(stats["leakage_paise"]) / 100.0,
            "recoverable_rs": float(stats["recoverable_paise"]) / 100.0,
            "count": stats["count"]
        })

    return {
        "total_leakage_rs": total_leak_rs,
        "total_recoverable_rs": total_rec_rs,
        "active_alerts": len(combined),
        "avg_risk_score": 64,
        "by_leak_type": by_leak_type
    }
