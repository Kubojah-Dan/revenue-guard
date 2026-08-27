import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any

SYSTEM_PROMPT = """You are a precise financial revenue loss narrator for the Revenue Process Twin system.
Your job is to explain the provided revenue leakage evidence in clear, professional English.

STRICT RULES:
1. Only use facts from the provided evidence JSON. Never invent or hallucinate figures or dates.
2. Always state the exact ₹ amount lost, the process break step, and the recommended action.
3. If evidence is incomplete or missing, reply with "insufficient data".
4. Limit your response to 150 words maximum. Plain text only.
"""

def narrator(evidence_json: Dict[str, Any], query: str = "") -> Dict[str, Any]:
    """
    Generates an evidence-grounded English narrative for /api/chat based on live SQLite evidence.
    Returns dictionary matching API contract shape.
    """
    # Read NARRATOR_MODE fresh on every call (not cached at import time)
    narrator_mode = os.environ.get("NARRATOR_MODE", "mock").lower()
    
    cust_id = evidence_json.get("customer_id", "SYSTEM_WIDE")
    cust_name = evidence_json.get("customer_name", "Enterprise Account")
    leak_paise = evidence_json.get("leak_amount_paise", 0)
    leak_rs = float(leak_paise) / 100.0
    
    rec_paise = evidence_json.get("recoverable_paise", 0)
    rec_rs = float(rec_paise) / 100.0
    
    process_break = evidence_json.get("process_break_step", "DISCOUNT_APPLIED without DISCOUNT_APPROVED")
    entities = evidence_json.get("connected_entities", [])
    action = evidence_json.get("recommended_action", "Review invoice approval ledger")
    rule_id = evidence_json.get("rule_id", "R01")

    # Helper function to generate dynamic narrative fallback from DB evidence
    def build_dynamic_fallback() -> str:
        if cust_id == "SYSTEM_WIDE":
            total_cnt = evidence_json.get("total_active_alerts", 0)
            return (
                f"The Revenue Process Twin has detected {total_cnt} active revenue leakages across all enterprise accounts, "
                f"totalling ₹{leak_rs:,.2f} in total leakage, of which ₹{rec_rs:,.2f} is recoverable. "
                f"Top rule violations include {rule_id} and process break: {process_break}. "
                f"Recommended action: {action}."
            )
        
        alert_cnt = evidence_json.get("alert_count", 1)
        if leak_rs > 0:
            return (
                f"{cust_name} ({cust_id}) is currently flagged for {alert_cnt} active revenue leakage alert(s) "
                f"under rule {rule_id} at process step '{process_break}'. Total leakage amount: ₹{leak_rs:,.2f}. "
                f"Executing recommended action '{action}' is estimated to recover approximately ₹{rec_rs:,.2f}."
            )
        else:
            return f"No active revenue leakage alerts currently detected for {cust_name} ({cust_id}). Account is in compliance."

    answer = None

    # 1. If NARRATOR_MODE is live, attempt Ollama HTTP call
    if narrator_mode == "live":
        try:
            ollama_host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
            ollama_model = os.environ.get("OLLAMA_MODEL", "phi4-mini")
            url = f"{ollama_host}/api/generate"
            prompt_text = f"{SYSTEM_PROMPT}\nEvidence JSON: {json.dumps(evidence_json)}\nUser Query: {query}\nNarrative:"
            req_data = json.dumps({"model": ollama_model, "prompt": prompt_text, "stream": False}).encode("utf-8")
            req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                answer = res_json.get("response", "").strip()
        except Exception:
            answer = None

    # 2. Fallback to dynamic evidence narrative if mock or Ollama unavailable
    if not answer:
        answer = build_dynamic_fallback()

    return {
        "answer": answer,
        "leak_amount_rs": leak_rs,
        "process_break": process_break,
        "connected_entities": entities,
        "recommended_action": action,
        "recovery_estimate_rs": rec_rs
    }
