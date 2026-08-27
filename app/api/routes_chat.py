from fastapi import APIRouter, Body
from app.db.connection import get_connection
from app.services.narrator import narrator

router = APIRouter()

@router.post("/api/chat")
def chat_endpoint(payload: dict = Body(...)):
    query = payload.get("query", "").strip()
    q_lower = query.lower()
    
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Check if query matches a customer name or customer ID directly
        all_custs = cursor.execute("SELECT customer_id, name FROM customers").fetchall()
        matched_cust = None
        for row in all_custs:
            cid, name = row["customer_id"], row["name"]
            if (cid and cid.lower() in q_lower) or (name and name.lower() in q_lower):
                matched_cust = row
                break
        
        if matched_cust:
            cust_id = matched_cust["customer_id"]
            cust_name = matched_cust["name"]
            
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
            return narrator(evidence, query=query)

        # 2. Check for specific leak type / intent keywords in query
        filter_sql = ""
        params = []
        
        if any(k in q_lower for k in ["duplicate", "dup", "double"]):
            filter_sql = "WHERE a.leak_type LIKE '%duplicate%' OR a.process_break_step LIKE '%DUPLICATE%'"
        elif any(k in q_lower for k in ["discount", "discounting", "gate"]):
            filter_sql = "WHERE a.leak_type LIKE '%discount%' OR a.process_break_step LIKE '%DISCOUNT%'"
        elif any(k in q_lower for k in ["churn", "decline", "lapse", "renewal"]):
            filter_sql = "WHERE a.leak_type LIKE '%churn%' OR a.process_break_step LIKE '%DECLINE%' OR a.leak_type LIKE '%renewal%'"
        elif any(k in q_lower for k in ["overdue", "uncollected", "unpaid"]):
            filter_sql = "WHERE a.leak_type LIKE '%overdue%' OR a.process_break_step LIKE '%OVERDUE%'"
        elif any(k in q_lower for k in ["refund", "spurious"]):
            filter_sql = "WHERE a.leak_type LIKE '%refund%' OR a.process_break_step LIKE '%REFUND%'"
        
        order_sql = "ORDER BY a.recoverable_paise DESC" if any(k in q_lower for k in ["biggest", "largest", "opportunity", "recovery", "top"]) else "ORDER BY a.leak_amount_paise DESC"

        # If a specific intent filter was matched:
        if filter_sql:
            intent_alerts = cursor.execute(
                f"SELECT a.*, c.name as customer_name FROM alerts a JOIN customers c ON a.customer_id = c.customer_id {filter_sql} {order_sql}",
                params
            ).fetchall()
            
            if intent_alerts:
                top_a = intent_alerts[0]
                total_leak = sum(r["leak_amount_paise"] for r in intent_alerts)
                total_rec = sum(r["recoverable_paise"] for r in intent_alerts)
                cust_names = list(dict.fromkeys(r["customer_name"] for r in intent_alerts))
                
                evidence = {
                    "customer_id": top_a["customer_id"],
                    "customer_name": ", ".join(cust_names[:3]),
                    "rule_id": top_a["rule_id"],
                    "leak_type": top_a["leak_type"],
                    "severity": top_a["severity"],
                    "leak_amount_paise": total_leak,
                    "recoverable_paise": total_rec,
                    "process_break_step": top_a["process_break_step"] or "Process break detected",
                    "connected_entities": [r["alert_id"] for r in intent_alerts[:3]],
                    "recommended_action": top_a["recommended_action"] or "Execute recovery workflow",
                    "alert_count": len(intent_alerts)
                }
                return narrator(evidence, query=query)

        # 3. Fallback: System-wide summary across all alerts
        top_alerts = cursor.execute(
            f"SELECT a.*, c.name as customer_name FROM alerts a JOIN customers c ON a.customer_id = c.customer_id {order_sql} LIMIT 5"
        ).fetchall()
        
        total_leak_row = cursor.execute(
            "SELECT SUM(leak_amount_paise) as total_leak, SUM(recoverable_paise) as total_rec, COUNT(*) as alert_cnt FROM alerts"
        ).fetchone()
        
        total_leak = total_leak_row["total_leak"] or 0
        total_rec = total_leak_row["total_rec"] or 0
        alert_cnt = total_leak_row["alert_cnt"] or 0
        
        top_a = top_alerts[0] if top_alerts else {}
        evidence = {
            "customer_id": "SYSTEM_WIDE",
            "customer_name": "All Enterprise Accounts",
            "total_system_leakage_paise": total_leak,
            "total_system_recoverable_paise": total_rec,
            "total_active_alerts": alert_cnt,
            "rule_id": top_a.get("rule_id", "R01"),
            "leak_amount_paise": total_leak,
            "recoverable_paise": total_rec,
            "process_break_step": top_a.get("process_break_step", f"{alert_cnt} process deviations active"),
            "connected_entities": [r["alert_id"] for r in top_alerts],
            "recommended_action": top_a.get("recommended_action", "Review top leakage alerts in Alerts view")
        }

        return narrator(evidence, query=query)

