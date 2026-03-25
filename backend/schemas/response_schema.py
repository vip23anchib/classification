from pydantic import BaseModel, Field


class AnalyzeResponse(BaseModel):
    """Response schema for satellite image analysis pipeline.
    
    Contains classification, features, description from Gemini Vision AI,
    improvement suggestions from Gemini Text AI,
    and generated enhanced image from Gemini Image Generation.
    """
    classification: str
    features: list[str]
    description: str
    improvements: list[str]
    generated_image: str = Field(..., description="Base64 encoded generated image")


class HealthResponse(BaseModel):
    """Health check response.
    
    ISSUE 3 FIX: Updated to match actual API response.
    Removed 'model_loaded' field (not applicable to Gemini-only backend).
    """
    status: str = Field(..., description="API status")
    gemini_configured: bool = Field(..., description="Whether Gemini API is configured")
