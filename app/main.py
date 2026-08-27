from dotenv import load_dotenv
load_dotenv()  # Load .env before any other imports read env vars

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import (
    routes_alerts,
    routes_customer,
    routes_summary,
    routes_chat,
    routes_actions,
    routes_health,
    routes_upload
)

app = FastAPI(
    title="Revenue Process Twin API",
    description="Backend API for Revenue Process Twin leakage detection system",
    version="1.0.0"
)

# Configure CORS for frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(routes_alerts.router)
app.include_router(routes_customer.router)
app.include_router(routes_summary.router)
app.include_router(routes_chat.router)
app.include_router(routes_actions.router)
app.include_router(routes_health.router)
app.include_router(routes_upload.router)

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi.responses import Response
    return Response(status_code=204)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
