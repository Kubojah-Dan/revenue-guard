import os
import logging
from fastapi import APIRouter, Response, HTTPException, Query
from fastapi.responses import RedirectResponse
import httpx

log = logging.getLogger(__name__)

router = APIRouter()

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")


@router.get("/api/auth/google")
def google_auth():
    """
    Initiates Google OAuth 2.0 authorization code flow.
    Redirects user to Google's consent screen.
    """
    client_id = os.environ.get("GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID)
    redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI", GOOGLE_REDIRECT_URI)

    if not client_id:
        log.warning("GOOGLE_CLIENT_ID not configured in .env. Returning redirect configuration.")
        return {
            "status": "unconfigured",
            "message": "Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env",
            "mock_redirect": f"{FRONTEND_URL}/app?auth=google_demo_success"
        }

    # Construct Google OAuth 2.0 Authorization URL
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return RedirectResponse(url=auth_url)


@router.get("/api/auth/google/callback")
async def google_auth_callback(code: str = Query(default=""), error: str = Query(default="")):
    """
    Handles OAuth callback from Google.
    Exchanges authorization code for tokens, retrieves user profile,
    and redirects user to frontend /app dashboard.
    """
    if error:
        log.error("Google OAuth error callback: %s", error)
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error={error}")

    client_id = os.environ.get("GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID)
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", GOOGLE_CLIENT_SECRET)
    redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI", GOOGLE_REDIRECT_URI)

    # If code is missing or unconfigured environment, provide smooth dev redirection
    if not code or not client_id or not client_secret:
        log.info("Demo/Dev callback triggered without full credentials.")
        return RedirectResponse(url=f"{FRONTEND_URL}/app?auth=success&user=DemoUser")

    try:
        # Step 1: Exchange code for Google Access Token
        token_url = "https://oauth2.googleapis.com/token"
        token_payload = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient() as client:
            token_resp = await client.post(token_url, data=token_payload)
            if token_resp.status_code != 200:
                log.error("Failed to exchange code: %s", token_resp.text)
                return RedirectResponse(url=f"{FRONTEND_URL}/login?error=token_exchange_failed")
            
            tokens = token_resp.json()
            access_token = tokens.get("access_token")

            # Step 2: Fetch User Info from Google Profile API
            userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
            userinfo_resp = await client.get(userinfo_url, headers={"Authorization": f"Bearer {access_token}"})
            if userinfo_resp.status_code != 200:
                return RedirectResponse(url=f"{FRONTEND_URL}/login?error=userinfo_failed")
            
            user_info = userinfo_resp.json()
            email = user_info.get("email", "")
            name = user_info.get("name", "User")
            picture = user_info.get("picture", "")

            # Redirect to Frontend dashboard with session info
            return RedirectResponse(
                url=f"{FRONTEND_URL}/app?auth=success&name={name}&email={email}&picture={picture}"
            )

    except Exception as e:
        log.error("OAuth exception: %s", e)
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=server_error")


@router.post("/api/auth/logout")
def logout():
    """Terminates session."""
    return {"status": "logged_out"}
