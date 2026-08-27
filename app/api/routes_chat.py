from fastapi import APIRouter, Body
from app.services.narrator import narrator

router = APIRouter()

@router.post("/api/chat")
def chat_endpoint(payload: dict = Body(...)):
    query = payload.get("query", "")
    
    # Determine target customer from query
    cust_id = "CUST-0042"
    if "Vertex" in query or "0108" in query:
        cust_id = "CUST-0108"
    elif "Neon" in query or "0077" in query:
        cust_id = "CUST-0077"
    elif "BlueStar" in query or "0031" in query:
        cust_id = "CUST-0031"

    evidence = {
        "customer_id": cust_id,
        "leak_amount_paise": 42000000 if cust_id == "CUST-0042" else (
            12000000 if cust_id == "CUST-0108" else (
                21000000 if cust_id == "CUST-0077" else 4500000
            )
        ),
        "recoverable_paise": 31500000 if cust_id == "CUST-0042" else (
            12000000 if cust_id == "CUST-0108" else (
                5250000 if cust_id == "CUST-0077" else 3150000
            )
        ),
        "process_break_step": "DISCOUNT_APPLIED without DISCOUNT_APPROVED",
        "connected_entities": ["INV-1004", "INV-1007", "INV-1009"],
        "recommended_action": "Normalize discount to plan median (12%)"
    }

    return narrator(evidence, query=query)
