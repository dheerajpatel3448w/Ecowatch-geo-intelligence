"""
Qwen2-VL-2B-Instruct — Vision Language Analyzer
-------------------------------------------------
Satellite image ko full image ke roop mein analyze karo.
Deforestation, illegal mining, water pollution, urban encroachment detect karo.

Model: Qwen/Qwen2-VL-2B-Instruct
Size:  ~4GB download, ~1.5GB VRAM (4-bit) / ~4GB RAM (CPU float32)
Speed: ~5-8 sec per image (GPU) / ~60-90 sec (CPU)
"""

import json
import re
import numpy as np
from PIL import Image as PILImage
from src.utils.logger import get_logger

logger = get_logger("vl_analyzer")

# ── Structured Prompt ────────────────────────────────────────────────────────
ANALYSIS_PROMPT = """You are an expert environmental satellite image analyst.
Analyze this satellite image for environmental threats and land cover.

Respond ONLY with valid JSON in this exact format:
{
  "threats": [],
  "severity": "none",
  "description": "...",
  "affected_areas": [],
  "forest_visible": true,
  "confidence": "high"
}

Rules:
- "threats": array of detected threats from: ["deforestation", "illegal_mining", "water_pollution", "urban_encroachment", "agricultural_expansion", "none"]
- "severity": one of "none", "low", "medium", "high", "critical"
- "description": 2-3 sentences describing what you observe
- "affected_areas": directions where threats are found: ["north", "south", "east", "west", "northeast", "northwest", "southeast", "southwest", "center", "throughout"]
- "forest_visible": true if dense forest canopy is visible
- "confidence": "low", "medium", or "high" based on image clarity

If image is cloudy or unclear, set confidence to "low" and threats to ["none"].
"""

# ── Default response on failure ──────────────────────────────────────────────
DEFAULT_RESPONSE = {
    "threats":       ["none"],
    "severity":      "none",
    "description":   "Analysis could not be completed.",
    "affected_areas": [],
    "forest_visible": False,
    "confidence":    "low",
}


class VLAnalyzer:
    """
    Qwen2-VL-2B-Instruct wrapper.
    Singleton pattern — model ek baar load hota hai.
    """

    def __init__(self):
        self._model     = None
        self._processor = None
        self._device    = None

    def load(self):
        """Model load karo — CPU ya GPU auto-detect. Already loaded hai toh skip."""
        if self._model is not None:
            logger.info("VL model already loaded — skipping reload.")
            return

        import torch

        model_name = "Qwen/Qwen2-VL-2B-Instruct"
        logger.info(f"Loading VL model: {model_name}")

        try:
            from transformers import Qwen2VLForConditionalGeneration, AutoProcessor

            # GPU available hai to 4-bit, warna CPU float32
            gpu_available = torch.cuda.is_available()
            self._device  = "cuda" if gpu_available else "cpu"
            logger.info(f"Device: {self._device} | GPU: {gpu_available}")

            if gpu_available:
                # 4-bit quantization → ~1.5GB VRAM (GTX 1650 pe fit!)
                from transformers import BitsAndBytesConfig
                bnb_config = BitsAndBytesConfig(
                    load_in_4bit              = True,
                    bnb_4bit_use_double_quant = True,
                    bnb_4bit_quant_type       = "nf4",
                    bnb_4bit_compute_dtype    = torch.float16,
                )
                self._model = Qwen2VLForConditionalGeneration.from_pretrained(
                    model_name,
                    quantization_config = bnb_config,
                    device_map          = "auto",
                )
            else:
                # CPU: float32 (slow but works without bitsandbytes)
                self._model = Qwen2VLForConditionalGeneration.from_pretrained(
                    model_name,
                    torch_dtype = torch.float32,
                    device_map  = "cpu",
                )

            self._processor = AutoProcessor.from_pretrained(model_name)
            logger.info("VL model loaded successfully!")

        except Exception as e:
            logger.error(f"VL model load failed: {e}")
            raise

    def analyze_image(self, rgb: np.ndarray) -> dict:
        """
        RGB satellite image analyze karo.

        Args:
            rgb: (H, W, 3) uint8 numpy array

        Returns:
            dict with threats, severity, description, affected_areas, etc.
        """
        if self._model is None:
            logger.error("Model not loaded! Call load() first.")
            return DEFAULT_RESPONSE

        try:
            import torch

            # Numpy → PIL, resize to 768x768 (Qwen optimal size)
            pil_img = PILImage.fromarray(rgb).resize((768, 768), PILImage.LANCZOS)

            # Qwen2-VL message format
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": pil_img},
                        {"type": "text",  "text": ANALYSIS_PROMPT},
                    ],
                }
            ]

            # Tokenize
            text = self._processor.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            inputs = self._processor(
                text   = [text],
                images = [pil_img],
                return_tensors = "pt",
            ).to(self._device)

            # Generate
            with torch.no_grad():
                output_ids = self._model.generate(
                    **inputs,
                    max_new_tokens = 300,
                    do_sample      = False,   # Greedy — consistent results
                    temperature    = None,
                    top_p          = None,
                )

            # Decode — input tokens hata do
            generated = output_ids[:, inputs["input_ids"].shape[1]:]
            response  = self._processor.batch_decode(
                generated, skip_special_tokens=True
            )[0].strip()

            logger.info(f"VL raw response: {response[:200]}...")

            # JSON parse karo
            return self._parse_response(response)

        except Exception as e:
            logger.error(f"VL analysis failed: {e}", exc_info=True)
            return DEFAULT_RESPONSE

    def _parse_response(self, text: str) -> dict:
        """Model ke text output se JSON extract karo."""
        try:
            # JSON block dhundho (markdown code block ke andar bhi ho sakta hai)
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())

                # Validate required fields
                result.setdefault("threats",       ["none"])
                result.setdefault("severity",      "none")
                result.setdefault("description",   "No description provided.")
                result.setdefault("affected_areas", [])
                result.setdefault("forest_visible", False)
                result.setdefault("confidence",    "medium")

                return result

        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse failed: {e} | raw: {text[:300]}")

        return DEFAULT_RESPONSE

    def compare_images(self, rgb_old: np.ndarray, rgb_new: np.ndarray) -> dict:
        """
        Do satellite images compare karo — kya change hua, kahan, kyun?
        Sirf tab call karo jab NDVI ne forest loss confirm kar diya ho.
        """
        if self._model is None:
            logger.error("Model not loaded!")
            return {"change_detected": False, "change_description": "Model not loaded.",
                    "change_type": "unknown", "severity": "unknown",
                    "changed_areas": [], "probable_cause": "unknown"}

        COMPARE_PROMPT = """You are an expert environmental satellite image analyst.
You are given TWO satellite images of the SAME area at DIFFERENT times.
IMAGE 1 = older scan | IMAGE 2 = newer (recent) scan.

Compare them carefully. Respond ONLY with valid JSON:
{
  "change_detected": true,
  "change_type": "deforestation",
  "severity": "high",
  "changed_areas": ["northeast", "center"],
  "change_description": "2-3 sentences: what exactly changed, where, how much",
  "probable_cause": "illegal logging"
}

change_type options: deforestation, mining, urban_expansion, agricultural, fire, flooding, none
severity options: none, low, medium, high, critical
If no visible change: change_detected=false, severity=none."""

        try:
            import torch
            from PIL import Image as PILImage

            pil_old = PILImage.fromarray(rgb_old).resize((512, 512), PILImage.LANCZOS)
            pil_new = PILImage.fromarray(rgb_new).resize((512, 512), PILImage.LANCZOS)

            messages = [{
                "role": "user",
                "content": [
                    {"type": "text",  "text": "IMAGE 1 (older scan):"},
                    {"type": "image", "image": pil_old},
                    {"type": "text",  "text": "IMAGE 2 (newer scan):"},
                    {"type": "image", "image": pil_new},
                    {"type": "text",  "text": COMPARE_PROMPT},
                ],
            }]

            text = self._processor.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            inputs = self._processor(
                text   = [text],
                images = [pil_old, pil_new],
                return_tensors = "pt",
            ).to(self._device)

            with torch.no_grad():
                output_ids = self._model.generate(
                    **inputs,
                    max_new_tokens = 350,
                    do_sample      = False,
                    temperature    = None,
                    top_p          = None,
                )

            generated = output_ids[:, inputs["input_ids"].shape[1]:]
            response  = self._processor.batch_decode(
                generated, skip_special_tokens=True
            )[0].strip()

            logger.info(f"Compare VL response: {response[:200]}...")
            return self._parse_compare_response(response)

        except Exception as e:
            logger.error(f"Image comparison failed: {e}", exc_info=True)
            return {
                "change_detected":    True,
                "change_type":        "unknown",
                "severity":           "unknown",
                "changed_areas":      [],
                "change_description": "Comparison analysis failed.",
                "probable_cause":     "unknown",
            }

    def _parse_compare_response(self, text: str) -> dict:
        """Comparison response se JSON extract karo."""
        import json, re
        try:
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                result.setdefault("change_detected",    True)
                result.setdefault("change_type",        "unknown")
                result.setdefault("severity",           "medium")
                result.setdefault("changed_areas",      [])
                result.setdefault("change_description", "Change detected.")
                result.setdefault("probable_cause",     "unknown")
                return result
        except Exception as e:
            logger.warning(f"Compare JSON parse failed: {e}")
        return {
            "change_detected": True, "change_type": "unknown",
            "severity": "medium", "changed_areas": [],
            "change_description": text[:300] if text else "Parse failed.",
            "probable_cause": "unknown",
        }


# ── Module-level singleton ────────────────────────────────────────────────────
_analyzer = VLAnalyzer()


def load_model():
    """App startup pe call karo."""
    _analyzer.load()


def analyze_image(rgb: np.ndarray) -> dict:
    """Single satellite image analyze karo."""
    return _analyzer.analyze_image(rgb)


def compare_images(rgb_old: np.ndarray, rgb_new: np.ndarray) -> dict:
    """
    Do images compare karo — NDVI threat detect hone KE BAAD call karo.
    Qwen dono images dekhke batata hai: kya change hua, kahan, kyun.
    """
    return _analyzer.compare_images(rgb_old, rgb_new)
