"""
Pydantic Schemas
-----------------
Request aur Response models — updated for NDVI + Qwen2-VL pipeline.
"""

from pydantic import BaseModel, Field
from typing   import Optional, List


# ── Request Models ─────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    """Manual analysis trigger — Sentinel Hub zone ke liye."""
    zone_id:    str           = Field(..., description="Zone ID from Node.js")
    job_id:     Optional[str] = Field(None, description="Kafka job ID")
    bbox:       List[float]   = Field(..., description="[lng_min, lat_min, lng_max, lat_max]")
    date_from:  str           = Field(..., description="2024-06-01")
    date_to:    str           = Field(..., description="2024-08-31")
    resolution: int           = Field(10, ge=10, le=60, description="10m/px recommended")


# ── Response Models ────────────────────────────────────────────

class AnalyzeResponse(BaseModel):
    job_id:    str
    zone_id:   str

    # NDVI metrics (physics-based, exact)
    forest_percentage:      float
    vegetation_percentage:  float
    bare_soil_percentage:   float
    water_percentage:       float
    ndvi_mean:              float
    ndvi_min:               float
    ndvi_max:               float

    # Qwen2-VL analysis
    threats:        List[str]
    severity:       str
    description:    str
    affected_areas: List[str]
    forest_visible: bool
    vl_confidence:  str

    # Combined
    deforestation_detected: bool
    heatmap_path:           str


class HealthResponse(BaseModel):
    status:       str
    model_loaded: bool
    model_name:   str
    version:      str


class CompareResponse(BaseModel):
    job_id:                  str
    forest_loss:             float
    change_detected:         bool
    change_type:             str
    severity:                str
    changed_areas:           List[str]
    change_description:      str
    probable_cause:          str
    comparison_image_path:   str
    hotspot_lat:             Optional[float] = None
    hotspot_lng:             Optional[float] = None


class CompareRequest(BaseModel):
    image_path_old: str
    image_path_new: str
    forest_loss:    float
    job_id:         Optional[str] = None
    bbox:           Optional[List[float]] = None  # [lng_min, lat_min, lng_max, lat_max]
