import json
import logging
import os
from typing import Any

import httpx
from dotenv import load_dotenv

from utils.image_utils import encode_bytes_to_base64, image_bytes_to_png_bytes

load_dotenv()

logger = logging.getLogger("satellite-backend")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
GEMINI_VISION_MODEL = os.getenv("GEMINI_VISION_MODEL", "gemini-1.5-flash")
GEMINI_TEXT_MODEL = os.getenv("GEMINI_TEXT_MODEL", "gemini-1.5-flash")
GEMINI_IMAGE_MODEL = os.getenv(
    "GEMINI_IMAGE_MODEL", "gemini-2.0-flash-exp-image-generation"
)

# ISSUE 5 FIX: Shared AsyncClient to avoid creating new client for each request
_gemini_client: httpx.AsyncClient | None = None


async def get_gemini_client() -> httpx.AsyncClient:
    """Get or create the shared Gemini HTTP client."""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = httpx.AsyncClient(timeout=httpx.Timeout(60.0))
    return _gemini_client


async def close_gemini_client() -> None:
    """Close the shared Gemini HTTP client."""
    global _gemini_client
    if _gemini_client is not None:
        await _gemini_client.aclose()
        _gemini_client = None


class GeminiServiceError(Exception):
    pass


def _extract_first_text(response_json: dict[str, Any]) -> str:
    candidates = response_json.get("candidates", [])
    if not candidates:
        raise GeminiServiceError("No Gemini candidates returned")

    parts = (
        candidates[0]
        .get("content", {})
        .get("parts", [])
    )

    for part in parts:
        text = part.get("text")
        if text:
            return text

    raise GeminiServiceError("Gemini text content was empty")


def _extract_first_image_base64(response_json: dict[str, Any]) -> str:
    candidates = response_json.get("candidates", [])
    if not candidates:
        raise GeminiServiceError("No Gemini candidates returned")

    parts = (
        candidates[0]
        .get("content", {})
        .get("parts", [])
    )

    for part in parts:
        inline_data = part.get("inlineData")
        if inline_data and inline_data.get("data"):
            return inline_data["data"]

    raise GeminiServiceError("Gemini image data was not found in response")


def _safe_json_loads(value: str) -> dict[str, Any]:
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        # Gemini may return fenced JSON. Strip code fences if present.
        cleaned = value.strip().replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise GeminiServiceError(f"Invalid JSON returned from Gemini: {exc}") from exc


async def _call_generate_content(model: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Call Gemini API using shared HTTP client.
    
    ISSUE 5 FIX: Reuse shared AsyncClient instead of creating new one per request.
    """
    if not GEMINI_API_KEY:
        logger.error("Gemini API key not configured")
        raise GeminiServiceError("GEMINI_API_KEY is not configured")

    url = f"{GEMINI_API_BASE}/models/{model}:generateContent"
    params = {"key": GEMINI_API_KEY}

    # ISSUE 5 FIX: Use shared client
    client = await get_gemini_client()
    response = await client.post(url, params=params, json=payload)

    if response.status_code >= 400:
        logger.error(
            "Gemini request failed (status=%d model=%s)",
            response.status_code,
            model,
        )
        raise GeminiServiceError(
            f"Gemini request failed ({response.status_code}): {response.text}"
        )

    return response.json()


async def analyze_image(image_bytes: bytes) -> dict[str, Any]:
    image_b64 = encode_bytes_to_base64(image_bytes_to_png_bytes(image_bytes))
    prompt = (
        "Analyze this satellite image. Classify it and extract key features. "
        "Return strict JSON with keys: classification (string), "
        "features (array of strings), description (string)."
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": "image/png",
                            "data": image_b64,
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
        },
    }

    response_json = await _call_generate_content(GEMINI_VISION_MODEL, payload)
    parsed = _safe_json_loads(_extract_first_text(response_json))

    missing = [k for k in ["classification", "features", "description"] if k not in parsed]
    if missing:
        raise GeminiServiceError(f"Gemini analysis response missing keys: {missing}")

    if not isinstance(parsed.get("features"), list):
        raise GeminiServiceError("Gemini analysis response has invalid 'features' type")

    return parsed


async def get_improvements(json_data: dict[str, Any]) -> dict[str, Any]:
    """Generate improvement suggestions based on image analysis.
    
    ISSUE 2 FIX: Validate parsed response is a dict before accessing keys.
    """
    prompt = (
        "Based on this satellite analysis, suggest improvements. "
        "Return strict JSON with key improvements (array of strings).\n\n"
        f"Analysis JSON:\n{json.dumps(json_data)}"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.3,
        },
    }

    response_json = await _call_generate_content(GEMINI_TEXT_MODEL, payload)
    text = _extract_first_text(response_json)
    parsed = _safe_json_loads(text)

    # ISSUE 2 FIX: Validate that parsed response is a dict
    if not isinstance(parsed, dict):
        logger.error(
            "Invalid JSON response from Gemini: expected dict, got %s",
            type(parsed).__name__,
        )
        raise GeminiServiceError(
            "Invalid response format from Gemini: expected JSON object"
        )

    improvements = parsed.get("improvements")
    if not isinstance(improvements, list):
        logger.error(
            "Gemini response missing or invalid 'improvements' key (type=%s)",
            type(improvements).__name__ if improvements is not None else "missing",
        )
        raise GeminiServiceError(
            "Gemini improvements response must contain list 'improvements'"
        )

    return {"improvements": [str(item) for item in improvements]}


async def generate_image(image_bytes: bytes, improvements: list[str]) -> str:
    image_b64 = encode_bytes_to_base64(image_bytes_to_png_bytes(image_bytes))
    improvements_text = "; ".join(improvements)

    prompt = (
        "Generate an improved satellite image with these enhancements: "
        f"{improvements_text}. Keep geography realistic and preserve main structures."
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": "image/png",
                            "data": image_b64,
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "temperature": 0.4,
        },
    }

    response_json = await _call_generate_content(GEMINI_IMAGE_MODEL, payload)
    return _extract_first_image_base64(response_json)
