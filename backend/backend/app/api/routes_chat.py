"""
routes_chat.py — Narrator AI chat endpoint.

Intent routing based on EXACT leak_type values from the database:
  invoice_overdue, duplicate_payment, over_discount, high_refund_ratio,
  missed_renewal, silent_churn, contractless_enterprise_discount, spurious_refund
"""
import logging
from fastapi import APIRouter, Body
from app.db.connection import get_connection
from app.services.narrator import narrator

log = logging.getLogger(__name__)
router = APIRouter()


def _row(r, key, default=None):
    """Safe column access for sqlite3.Row — avoids .get() which isn't supported."""
    try:
        return r[key]
    except (IndexError, KeyError):
        return default


def _build_evidence_from_alerts(alert_rows, cust_id=None, cust_name=None):
    """Build a narrator evidence dict from a list of alert rows."""
    if not alert_rows:
        return None

    top = alert_rows[0]
    total_leak  = sum(int(_row(r, "leak_amount_paise") or 0) for r in alert_rows)
    total_rec   = sum(int(_row(r, "recoverable_paise")  or 0) for r in alert_rows)

    c_id   = cust_id   or _row(top, "customer_id")
    c_name = cust_name or _row(top, "customer_name", c_id)

    return {
        "customer_id":       c_id,
        "customer_name":     c_name,
        "rule_id":           _row(top, "rule_id", ""),
        "leak_type":         _row(top, "leak_type", ""),
        "severity":          _row(top, "severity", "medium"),
        "alert_count":       len(alert_rows),
        "leak_amount_paise": total_leak,
        "recoverable_paise": total_rec,
        "process_break_step":   _row(top, "process_break_step") or "PROCESS_BREAK_DETECTED",
        "expected_next":        _row(top, "expected_next", ""),
        "actual_next":          _row(top, "actual_next", ""),
        "connected_entities":   [_row(r, "alert_id") for r in alert_rows[:5]],
        "recommended_action":   _row(top, "recommended_action") or "Review alert details",
    }


@router.post("/api/chat")
def chat_endpoint(payload: dict = Body(...)):
    query   = payload.get("query", "").strip()
    q_lower = query.lower()

    with get_connection() as conn:
        cursor = conn.cursor()

        # ── STEP 1: Match a specific customer by name or ID ──────────────────
        all_custs = cursor.execute(
            "SELECT customer_id, name FROM customers"
        ).fetchall()

        matched_cust = None
        for row in all_custs:
            cid  = (_row(row, "customer_id") or "").lower()
            name = (_row(row, "name")        or "").lower()
            if cid in q_lower or (name and name in q_lower):
                matched_cust = row
                break

        if matched_cust:
            cust_id   = _row(matched_cust, "customer_id")
            cust_name = _row(matched_cust, "name")
            alerts = cursor.execute(
                "SELECT * FROM alerts WHERE customer_id = ? ORDER BY leak_amount_paise DESC",
                (cust_id,)
            ).fetchall()
            evidence = _build_evidence_from_alerts(alerts, cust_id, cust_name)
            if not evidence:
                evidence = {
                    "customer_id": cust_id, "customer_name": cust_name,
                    "alert_count": 0, "leak_amount_paise": 0, "recoverable_paise": 0,
                    "process_break_step": "No alerts found", "connected_entities": [],
                    "recommended_action": "Account is in compliance",
                }
            return narrator(evidence, query=query)

        # ── STEP 2: Intent keyword → exact leak_type SQL match ────────────────
        # Real leak_types in DB:
        #   invoice_overdue, duplicate_payment, over_discount, high_refund_ratio,
        #   missed_renewal, silent_churn, contractless_enterprise_discount, spurious_refund

        intent_filter: str | None = None

        if any(k in q_lower for k in ["duplicate", "double payment", "paid twice", "dual payment"]):
            intent_filter = "duplicate_payment"
        elif any(k in q_lower for k in ["overdue", "unpaid invoice", "uncollected", "late invoice", "outstanding invoice"]):
            intent_filter = "invoice_overdue"
        elif any(k in q_lower for k in ["refund ratio", "high refund", "excess refund", "refund rate"]):
            intent_filter = "high_refund_ratio"
        elif any(k in q_lower for k in ["missed renewal", "failed renewal", "lapse renewal", "renewal missed"]):
            intent_filter = "missed_renewal"
        elif any(k in q_lower for k in ["churn", "churning", "usage decline", "at risk", "declining"]):
            intent_filter = "silent_churn"
        elif any(k in q_lower for k in ["contractless", "no contract", "enterprise discount without"]):
            intent_filter = "contractless_enterprise_discount"
        elif any(k in q_lower for k in ["spurious refund", "fraudulent refund", "fake refund"]):
            intent_filter = "spurious_refund"
        elif any(k in q_lower for k in ["discount", "over-discount", "over discount", "unapproved discount", "discounting"]):
            intent_filter = "over_discount"
        elif any(k in q_lower for k in ["refund"]):
            intent_filter = "spurious_refund"
        elif any(k in q_lower for k in ["renewal"]):
            intent_filter = "missed_renewal"

        if intent_filter:
            order_col = "recoverable_paise" if any(
                k in q_lower for k in ["biggest", "largest", "opportunity", "recover", "top"]
            ) else "leak_amount_paise"

            alerts = cursor.execute(
                f"""
                SELECT a.*, c.name as customer_name
                FROM alerts a
                JOIN customers c ON a.customer_id = c.customer_id
                WHERE a.leak_type = ?
                ORDER BY a.{order_col} DESC
                """,
                (intent_filter,)
            ).fetchall()

            if alerts:
                c_names  = list(dict.fromkeys(_row(r, "customer_name") for r in alerts))
                evidence = _build_evidence_from_alerts(alerts)
                evidence["customer_name"] = ", ".join(c_names[:3])
                return narrator(evidence, query=query)

        # ── STEP 3: Recovery opportunity — sort by recoverable ────────────────
        if any(k in q_lower for k in ["biggest", "largest", "opportunity", "recovery", "most recoverable"]):
            alerts = cursor.execute(
                """
                SELECT a.*, c.name as customer_name
                FROM alerts a
                JOIN customers c ON a.customer_id = c.customer_id
                ORDER BY a.recoverable_paise DESC
                LIMIT 5
                """
            ).fetchall()
            if alerts:
                top_cust = _row(alerts[0], "customer_name", "")
                evidence = _build_evidence_from_alerts(alerts)
                evidence["customer_name"] = top_cust
                return narrator(evidence, query=query)

        # ── STEP 4: System-wide summary (fallback for any other query) ─────────
        top_alerts = cursor.execute(
            """
            SELECT a.*, c.name as customer_name
            FROM alerts a
            JOIN customers c ON a.customer_id = c.customer_id
            ORDER BY a.leak_amount_paise DESC
            LIMIT 5
            """
        ).fetchall()

        totals = cursor.execute(
            "SELECT SUM(leak_amount_paise) total_leak, SUM(recoverable_paise) total_rec, COUNT(*) cnt FROM alerts"
        ).fetchone()

        total_leak = int(_row(totals, "total_leak") or 0)
        total_rec  = int(_row(totals, "total_rec")  or 0)
        alert_cnt  = int(_row(totals, "cnt")        or 0)

        top_a = top_alerts[0] if top_alerts else None
        evidence = {
            "customer_id":         "SYSTEM_WIDE",
            "customer_name":       "All Enterprise Accounts",
            "total_active_alerts": alert_cnt,
            "rule_id":             _row(top_a, "rule_id", "R01") if top_a else "R01",
            "leak_amount_paise":   total_leak,
            "recoverable_paise":   total_rec,
            "process_break_step":  (_row(top_a, "process_break_step") if top_a else None) or f"{alert_cnt} active violations",
            "connected_entities":  [_row(r, "alert_id") for r in top_alerts],
            "recommended_action":  (_row(top_a, "recommended_action") if top_a else None) or "Review Alerts dashboard",
        }

        return narrator(evidence, query=query)
