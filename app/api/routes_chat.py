from fastapi import APIRouter, Body
from app.db.connection import get_connection
from app.services.narrator import narrator

router = APIRouter()

@router.post("/api/chat")
def chat_endpoint(payload: dict = Body(...)):
    query = payload.get("query", "").strip()
    
    with get_connection() as conn:
        # Search for customer in DB matching query (by customer_id or name)
        cursor = conn.cursor()
        
        # 1. Check if query contains any customer_id or customer name
        all_custs = cursor.execute("SELECT customer_id, name FROM customers").fetchall()
        matched_cust = None
        for row in all_custs:
            cid, name = row["customer_id"], row["name"]
            if (cid.lower() in query.lower()) or (name and name.lower() in query.lower()):
                matched_cust = row
                break
        
        if matched_cust:
            cust_id = matched_cust["customer_id"]
            cust_name = matched_cust["name"]
            
            # Fetch alerts for this customer
            alert_rows = cursor.execute(
                "SELECT * FROM alerts WHERE customer_id = ? ORDER BY leak_amount_paise DESC",
                (cust_id,)
            ).fetchall()
            
            if alert_rows:
                top_alert = alert_rows[0]
                total_leak = sum(r["leak_amount_paise"] for r in alert_rows)
                total_rec = sum(r["recoverable_paise"] for r in alert_rows)
                
                evidence = {
                    "customer_id": cust_id,
                    "customer_name": cust_name,
                    "rule_id": top_alert["rule_id"],
                    "leak_type": top_alert["leak_type"],
                    "severity": top_alert["severity"],
                    "leak_amount_paise": total_leak,
                    "recoverable_paise": total_rec,
                    "process_break_step": top_alert["process_break_step"] or "DISCOUNT_APPLIED without DISCOUNT_APPROVED",
                    "expected_next": top_alert["expected_next"],
                    "actual_next": top_alert["actual_next"],
                    "connected_entities": [r["alert_id"] for r in alert_rows[:3]],
                    "recommended_action": top_alert["recommended_action"] or "Review invoice approval ledger",
                    "alert_count": len(alert_rows)
                }
            else:
                evidence = {
                    "customer_id": cust_id,
                    "customer_name": cust_name,
                    "leak_amount_paise": 0,
                    "recoverable_paise": 0,
                    "process_break_step": "None detected",
                    "connected_entities": [],
                    "recommended_action": "No action required",
                    "alert_count": 0
                }
        else:
            # General query: pull summary stats across top database alerts
            top_alerts = cursor.execute(
                "SELECT * FROM alerts ORDER BY leak_amount_paise DESC LIMIT 5"
            ).fetchall()
            
            total_leak_row = cursor.execute("SELECT SUM(leak_amount_paise) as total_leak, SUM(recoverable_paise) as total_rec, COUNT(*) as alert_cnt FROM alerts").fetchone()
            
            total_leak = total_leak_row["total_leak"] or 0
            total_rec = total_leak_row["total_rec"] or 0
            alert_cnt = total_leak_row["alert_cnt"] or 0
            
            evidence = {
                "customer_id": "SYSTEM_WIDE",
                "customer_name": "All Enterprise Accounts",
                "total_system_leakage_paise": total_leak,
                "total_system_recoverable_paise": total_rec,
                "total_active_alerts": alert_cnt,
                "top_alerts": [
                    {
                        "alert_id": r["alert_id"],
                        "customer_id": r["customer_id"],
                        "rule_id": r["rule_id"],
                        "leak_type": r["leak_type"],
                        "leak_amount_rs": float(r["leak_amount_paise"]) / 100.0,
                        "recoverable_rs": float(r["recoverable_paise"]) / 100.0,
                        "recommended_action": r["recommended_action"]
                    }
                    for r in top_alerts
                ],
                "leak_amount_paise": total_leak,
                "recoverable_paise": total_rec,
                "process_break_step": f"{alert_cnt} process deviations active across database",
                "connected_entities": [r["alert_id"] for r in top_alerts],
                "recommended_action": "Review top leakage alerts in Alerts view"
            }

    return narrator(evidence, query=query)
