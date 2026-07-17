"""
geo_calculator.py
-----------------
Bounding box se area aur forest loss hectares calculate karo.
"""

import math
from src.utils.logger import get_logger

logger = get_logger("geo_calculator")


def calculate_area_hectares(bbox: list) -> float:
    """
    BBox se total area in hectares calculate karo.
    
    Args:
        bbox: [lng_min, lat_min, lng_max, lat_max]
    
    Returns:
        Area in hectares (1 km² = 100 hectares)
    """
    try:
        lng_min, lat_min, lng_max, lat_max = bbox
        lat_mid = (lat_min + lat_max) / 2

        # Longitude degrees to km (varies with latitude)
        width_km  = abs(lng_max - lng_min) * 111.32 * math.cos(math.radians(lat_mid))
        # Latitude degrees to km (roughly constant)
        height_km = abs(lat_max - lat_min) * 110.574

        area_km2 = width_km * height_km
        area_ha  = area_km2 * 100  # 1 km² = 100 hectares

        return round(area_ha, 2)
    except Exception as e:
        logger.error(f"calculate_area_hectares error: {e}")
        return 0.0


def calculate_loss_hectares(bbox: list, forest_pct_old: float, forest_pct_new: float) -> float:
    """
    Forest loss in hectares calculate karo.
    
    Args:
        bbox:           [lng_min, lat_min, lng_max, lat_max]
        forest_pct_old: Forest percentage (0-100) — older/baseline scan
        forest_pct_new: Forest percentage (0-100) — newer scan
    
    Returns:
        Hectares lost (positive = loss, 0 if no loss or gain)
    """
    total_ha = calculate_area_hectares(bbox)
    loss_pct = forest_pct_old - forest_pct_new  # positive = loss
    loss_ha  = total_ha * (loss_pct / 100.0)
    return round(max(0.0, loss_ha), 1)


def calculate_annual_rate(loss_ha: float, days: int) -> float:
    """
    Annual deforestation rate (hectares/year) calculate karo.
    
    Args:
        loss_ha: Total hectares lost
        days:    Number of days between first and last scan
    
    Returns:
        Annualized rate in hectares/year
    """
    if days <= 0:
        return 0.0
    return round(loss_ha / days * 365, 1)


def area_warning(bbox: list) -> str | None:
    """
    Agar area > 500 km² ho toh warning return karo.
    """
    lng_min, lat_min, lng_max, lat_max = bbox
    lat_mid   = (lat_min + lat_max) / 2
    width_km  = abs(lng_max - lng_min) * 111.32 * math.cos(math.radians(lat_mid))
    height_km = abs(lat_max - lat_min) * 110.574
    area_km2  = width_km * height_km

    if area_km2 > 500:
        return f"Zone area ({area_km2:.0f} km²) is large — use 20m or 30m resolution to save API quota."
    return None
