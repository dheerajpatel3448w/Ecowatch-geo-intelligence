from pathlib import Path
import os

# Project root
ROOT = Path(__file__).parent.parent.parent

# Directories
MODELS_DIR    = ROOT / "models"       # legacy — rakh lo
DATA_RAW_DIR  = ROOT / "data" / "raw"
DATA_PRO_DIR  = ROOT / "data" / "processed"
DATA_EXT_DIR  = ROOT / "data" / "external"
LOGS_DIR      = ROOT / "logs"
CONFIG_FILE   = ROOT / "src" / "config" / "config.yaml"

# HuggingFace cache (Qwen2-VL model yahan store hoga)
HF_CACHE_DIR = Path(os.getenv("HF_HOME", str(ROOT / "hf_cache")))

# Ensure dirs exist
for d in [DATA_PRO_DIR, LOGS_DIR, HF_CACHE_DIR]:
    d.mkdir(parents=True, exist_ok=True)
