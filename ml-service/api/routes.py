"""
API Routes
----------
GET  /api/health   → Service + model status
POST /api/analyze  → Manual zone analysis (Sentinel Hub + NDVI + Qwen2-VL)
POST /api/compare  → Deep comparison: 2 images to Qwen (NDVI threat confirm hone ke baad)
"""

import uuid
import os
import numpy as np
from PIL import Image as PILImage
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from api.schemas import AnalyzeRequest, AnalyzeResponse, HealthResponse
from src.data.sentinel_hub  import fetch_image
from src.data.data_loader   import validate_image
from src.inference          import vl_analyzer
from src.inference.analyzer import analyze, compare_analyze
from src.utils.logger       import get_logger
from src.utils.cleanup      import get_disk_stats, cleanup_old_images

logger = get_logger("routes")
router = APIRouter()


# ── GET /health ───────────────────────────────────────────────────────────────
@router.get("/health", response_model=HealthResponse)
def health():
    """Service health check."""
    return {
        "status":       "ok",
        "model_loaded": vl_analyzer._analyzer._model is not None,
        "model_name":   "Qwen/Qwen2-VL-2B-Instruct + NDVI",
        "version":      "2.0.0"
    }


# ── POST /analyze ─────────────────────────────────────────────────────────────
@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_zone(req: AnalyzeRequest):
    """Manual zone analysis — Sentinel Hub fetch + NDVI + Qwen."""
    if vl_analyzer._analyzer._model is None:
        raise HTTPException(503, "Qwen2-VL model not loaded yet")

    job_id = req.job_id or str(uuid.uuid4())[:8]
    logger.info(f"[{job_id}] Manual analyze | zone={req.zone_id}")

    try:
        image_data = fetch_image(
            bbox_coords = req.bbox,
            date_from   = req.date_from,
            date_to     = req.date_to,
            resolution  = req.resolution,
        )
    except Exception as e:
        raise HTTPException(400, f"Sentinel Hub fetch failed: {e}")

    if not validate_image(image_data["rgb"]):
        raise HTTPException(400, "Invalid or empty satellite image")

    result = analyze(rgb=image_data["rgb"], nir=image_data["nir"], job_id=job_id)

    return AnalyzeResponse(
        job_id=job_id, zone_id=req.zone_id,
        forest_percentage=result["forest_percentage"],
        vegetation_percentage=result["vegetation_percentage"],
        bare_soil_percentage=result["bare_soil_percentage"],
        water_percentage=result["water_percentage"],
        ndvi_mean=result["ndvi_mean"], ndvi_min=result["ndvi_min"], ndvi_max=result["ndvi_max"],
        threats=result["threats"], severity=result["severity"],
        description=result["description"], affected_areas=result["affected_areas"],
        forest_visible=result["forest_visible"], vl_confidence=result["vl_confidence"],
        deforestation_detected=result["deforestation_detected"],
        heatmap_path=result["heatmap_path"],
    )


# ── POST /compare ─────────────────────────────────────────────────────────────
class CompareRequest(BaseModel):
    image_path_old:  str    # Purani scan ki disk path (original_<job_id>.png)
    image_path_new:  str    # Nayi scan ki disk path
    forest_loss:     float  # NDVI se calculated loss %
    job_id:          str    # Alert job ID (logging ke liye)


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


@router.post("/compare", response_model=CompareResponse)
def compare_zones(req: CompareRequest):
    """
    Deep comparison — Node.js consumer tab call karta hai jab
    NDVI forest loss > threshold detect ho.

    Dono images Qwen mein jaate hain:
    IMAGE 1 (older) + IMAGE 2 (newer) → kya change hua, kahan, kyun?
    """
    if vl_analyzer._analyzer._model is None:
        raise HTTPException(503, "Qwen2-VL model not loaded yet")

    logger.info(
        f"[{req.job_id}] Compare request | loss={req.forest_loss}% | "
        f"old={req.image_path_old} | new={req.image_path_new}"
    )

    # Images disk se load karo
    try:
        rgb_old = np.array(PILImage.open(req.image_path_old).convert("RGB"))
        rgb_new = np.array(PILImage.open(req.image_path_new).convert("RGB"))
    except Exception as e:
        raise HTTPException(400, f"Image load failed: {e}")

    # Qwen comparison
    result = compare_analyze(
        rgb_old     = rgb_old,
        rgb_new     = rgb_new,
        forest_loss = req.forest_loss,
        job_id      = req.job_id,
        bbox        = req.bbox,
    )

    return CompareResponse(**result)


# ── GET /disk-usage ──────────────────────────────────────────────
@router.get("/disk-usage")
def disk_usage():
    """
    Satellite image disk usage stats.
    Processed images, raw data, total size, free disk space.
    """
    stats = get_disk_stats()
    return {
        "success": True,
        "data":    stats,
        "note":    f"Images older than {os.getenv('IMAGE_RETENTION_DAYS', '30')} days are auto-deleted at 03:00 daily",
    }


# ── POST /cleanup/run ─────────────────────────────────────────────
class CleanupRequest(BaseModel):
    retention_days: Optional[int] = 30   # Default 30 din


@router.post("/cleanup/run")
def run_cleanup(req: CleanupRequest = CleanupRequest()):
    """
    Manual image cleanup trigger.
    Purani satellite images turant delete karo.
    retention_days: Kitne din purani files delete honi chahiye (default 30)
    """
    logger.info(f"Manual cleanup triggered | retention_days={req.retention_days}")
    before = get_disk_stats()
    result = cleanup_old_images(retention_days=req.retention_days or 30)
    after  = get_disk_stats()

    return {
        "success":      True,
        "deleted":      result["deleted_count"],
        "freed_mb":     result["freed_mb"],
        "errors":       result["errors"],
        "before_mb":    before.get("total_images_mb", 0),
        "after_mb":     after.get("total_images_mb", 0),
        "disk_free_gb": after.get("disk", {}).get("free_gb", "N/A"),
    }
