"""
narrator.py - Evidence-grounded narrative generator for the Revenue Process Twin.

Uses Ollama (phi4-mini) when NARRATOR_MODE=live, otherwise builds a rich
deterministic fallback from the evidence dict passed by routes_chat.py.
"""
import os
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a precise financial revenue-loss narrator for the Revenue Process Twin system.
You receive evidence JSON and a user query. Your job:
1. Summarise the leakage clearly in plain English (max 120 words).
2. State the rupee amount lost, the process break, and the recommended recovery action.
3. Only use facts from the evidence JSON - never hallucinate figures.
4. If evidence is absent or the query is unrelated, say "Insufficient data in the database for that query."
Reply in plain sentences, no markdown, no bullet points."""


def _fmt(paise: int) -> str:
    """Format paise as a readable rupee string."""
    rs = paise / 100.0
    if rs >= 100_000:
        return f"Rs. {rs/100_000:.2f}L"
    if rs >= 1_000:
        return f"Rs. {rs:,.0f}"
    return f"Rs. {rs:.2f}"


def _call_ollama(evidence_json: Dict[str, Any], query: str) -> str | None:
    """Try to get an AI narrative from Ollama. Returns None on any failure."""
    host  = os.environ.get("OLLAMA_HOST",  "http://localhost:11434")
    model = os.environ.get("OLLAMA_MODEL", "phi4-mini")
    url   = f"{host}/api/generate"

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"Evidence:\n{json.dumps(evidence_json, indent=2)}\n\n"
        f"User Query: {query}\n\n"
        f"Narrative:"
    )
    payload = json.dumps({"model": model, "prompt": prompt, "stream": False}).encode("utf-8")

    try:
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=45) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            answer = result.get("response", "").strip()
            if answer:
                log.info("Ollama narrative generated (%d chars)", len(answer))
                return answer
            log.warning("Ollama returned empty response")
    except urllib.error.URLError as e:
        log.warning("Ollama connection failed: %s", e)
    except Exception as e:
        log.warning("Ollama error: %s", e)
    return None


def _build_fallback(evidence: Dict[str, Any]) -> str:
    """Build a rich, accurate fallback narrative purely from evidence data."""
    cust_id   = evidence.get("customer_id", "SYSTEM_WIDE")
    cust_name = evidence.get("customer_name", "Enterprise Account")
    leak      = int(evidence.get("leak_amount_paise",  0))
    rec       = int(evidence.get("recoverable_paise",  0))
    brk       = evidence.get("process_break_step", "process deviation")
    action    = evidence.get("recommended_action", "review the alert")
    rule      = evidence.get("rule_id", "")
    ent       = evidence.get("connected_entities", [])
    cnt       = evidence.get("alert_count", len(ent))
    ltype     = evidence.get("leak_type", "")

    if cust_id == "SYSTEM_WIDE":
        total_cnt = evidence.get("total_active_alerts", 0)
        return (
            f"The Revenue Process Twin has detected {total_cnt} active leakage alert(s) "
            f"across all enterprise accounts. Total estimated leakage: {_fmt(leak)}, "
            f"of which {_fmt(rec)} is immediately recoverable. "
            f"Top violation: {brk}. Recommended action: {action}."
        )

    # Human-friendly descriptions for each leak type
    type_map = {
        "duplicate_payment": "duplicate payment(s) processed",
        "invoice_overdue": "overdue invoice(s) remaining uncollected",
        "over_discount": "unapproved discount(s) exceeding plan limits",
        "high_refund_ratio": "unusually high refund ratio",
        "missed_renewal": "missed renewal(s) with no follow-up",
        "silent_churn": "silent churn risk (sustained usage decline)",
        "contractless_enterprise_discount": "enterprise discount(s) without a valid contract",
        "spurious_refund": "spurious/fraudulent refund(s)",
    }
    type_desc = type_map.get(ltype, ltype.replace("_", " ") if ltype else "revenue leakage")
    ent_str = ", ".join(ent[:3]) if ent else "see Alerts dashboard"

    if leak > 0:
        return (
            f"{cust_name} has {cnt} active alert(s) flagged for {type_desc}. "
            f"Process break: {brk}"
            f"{(' (Rule ' + rule + ')') if rule else ''}. "
            f"Total leakage: {_fmt(leak)}. Recoverable: {_fmt(rec)}. "
            f"Affected records: {ent_str}. "
            f"Recommended action: {action}."
        )
    return (
        f"No active revenue leakage alerts currently detected for {cust_name}. "
        f"Account is in compliance."
    )


def narrator(evidence_json: Dict[str, Any], query: str = "") -> Dict[str, Any]:
    """
    Main narrator entry point. Called by routes_chat.py with live SQLite evidence.
    Returns the JSON response for /api/chat.
    """
    narrator_mode = os.environ.get("NARRATOR_MODE", "mock").lower()
    log.info("narrator called: mode=%s cust=%s",
             narrator_mode, evidence_json.get("customer_id", "?"))

    answer = None
    if narrator_mode == "live":
        answer = _call_ollama(evidence_json, query)

    if not answer:
        answer = _build_fallback(evidence_json)

    leak = int(evidence_json.get("leak_amount_paise", 0))
    rec  = int(evidence_json.get("recoverable_paise",  0))

    return {
        "answer":              answer,
        "leak_amount_rs":      leak / 100.0,
        "process_break":       evidence_json.get("process_break_step", ""),
        "connected_entities":  evidence_json.get("connected_entities", []),
        "recommended_action":  evidence_json.get("recommended_action", ""),
        "recovery_estimate_rs": rec / 100.0,
    }
