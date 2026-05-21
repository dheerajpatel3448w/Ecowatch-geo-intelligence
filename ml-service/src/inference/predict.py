"""
============================================================
  Deforestation Analysis — Satellite Image Predictor
  Model: EfficientNetB0 (Transfer Learning)
  Dataset: EuroSAT | Classes: 10 | Accuracy: 93.63%
============================================================
Usage:
  # Single image predict:
  python main.py --image path/to/image.jpg

  # Sliding window (deforestation detection):
  python main.py --image path/to/image.jpg --mode window

  # Custom model:
  python main.py --image path/to/image.jpg --model best_model_phase3.keras
============================================================
"""

import os
import sys
import argparse
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow import keras
from collections import Counter
from PIL import Image as PILImage

# ── Configuration ────────────────────────────────────────────
IMG_SIZE    = (64, 64)
MODEL_PATH  = 'deforestation_model.keras'

CLASS_NAMES = [
    'AnnualCrop',           # 0
    'Forest',               # 1
    'HerbaceousVegetation', # 2
    'Highway',              # 3
    'Industrial',           # 4
    'Pasture',              # 5
    'PermanentCrop',        # 6
    'Residential',          # 7
    'River',                # 8
    'SeaLake'               # 9
]

DEFORESTATION_CLASSES = {
    'Industrial'           : '🏭 Illegal factory/mining detected!',
    'Residential'          : '🏠 Illegal settlement detected!',
    'Highway'              : '🛣️  Illegal road/access route!',
    'Pasture'              : '🐄 Forest cleared for grazing!',
    'AnnualCrop'           : '🌾 Forest cleared for farming!',
    'PermanentCrop'        : '🍇 Forest cleared for plantation!',
    'HerbaceousVegetation' : '🌿 Forest degraded to grassland!',
}


# ── Load Model ───────────────────────────────────────────────
def load_model(model_path):
    if not os.path.exists(model_path):
        print(f'\n❌ Model not found: {model_path}')
        print('   Make sure deforestation_model.keras is in the same folder.')
        sys.exit(1)

    print(f'\n✅ Loading model: {model_path}')
    model = keras.models.load_model(model_path)
    print('✅ Model loaded successfully!')
    return model


# ── Preprocess Image ─────────────────────────────────────────
def preprocess_image(image_path):
    if not os.path.exists(image_path):
        print(f'\n❌ Image not found: {image_path}')
        sys.exit(1)

    img = tf.io.read_file(image_path)
    img = tf.image.decode_image(img, channels=3, expand_animations=False)
    img = tf.image.resize(img, IMG_SIZE)
    img = tf.cast(img, tf.float32)
    return tf.expand_dims(img, axis=0)


# ──────────────────────────────────────────────────────────────
# MODE 1: Single Image Prediction
# ──────────────────────────────────────────────────────────────
def predict_single(model, image_path):
    print(f'\n🛰️  Analyzing: {image_path}')

    img_batch   = preprocess_image(image_path)
    predictions = model.predict(img_batch, verbose=0)[0]
    pred_class  = CLASS_NAMES[np.argmax(predictions)]
    confidence  = predictions[np.argmax(predictions)] * 100

    # Console output
    print('\n' + '='*55)
    print(f'🎯 Predicted Class : {pred_class}')
    print(f'   Confidence      : {confidence:.2f}%')
    print('='*55)

    if pred_class == 'Forest':
        print('🌳 SAFE: Forest area — No deforestation!')
    elif pred_class in DEFORESTATION_CLASSES:
        print(f'⚠️  ALERT: {DEFORESTATION_CLASSES[pred_class]}')
    else:
        print(f'ℹ️  Class: {pred_class}')

    # All probabilities
    print('\n📊 All Class Probabilities:')
    print('-'*50)
    for name, prob in sorted(zip(CLASS_NAMES, predictions),
                              key=lambda x: x[1], reverse=True):
        bar    = '█' * int(prob * 35)
        marker = ' ← PREDICTED' if name == pred_class else ''
        print(f'  {name:<25} {prob*100:5.1f}% {bar}{marker}')
    print('-'*50)

    # Plot
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    fig.suptitle('Deforestation Analysis — Single Image Prediction',
                 fontsize=13, fontweight='bold')

    try:
        original = plt.imread(image_path)
        axes[0].imshow(original)
        axes[0].set_title('[INPUT] Satellite Image', fontsize=11)
        axes[0].axis('off')
    except Exception:
        axes[0].text(0.5, 0.5, 'Preview N/A', ha='center', va='center')
        axes[0].axis('off')

    colors = ['#4CAF50' if n == pred_class else '#2196F3' for n in CLASS_NAMES]
    axes[1].barh(CLASS_NAMES, predictions * 100, color=colors)
    axes[1].set_xlabel('Confidence (%)')
    axes[1].set_xlim(0, 100)
    title_color = '#4CAF50' if pred_class == 'Forest' else '#F44336'
    axes[1].set_title(f'Prediction: {pred_class}\nConfidence: {confidence:.1f}%',
                      fontsize=12, fontweight='bold', color=title_color)
    axes[1].axvline(x=50, color='gray', linestyle='--', alpha=0.4)

    plt.tight_layout()
    out = 'result_single.png'
    plt.savefig(out, dpi=100, bbox_inches='tight')
    print(f'\n📸 Saved: {out}')
    plt.show()

    return pred_class, confidence


# ──────────────────────────────────────────────────────────────
# MODE 2: Sliding Window — Full Deforestation Detection
# ──────────────────────────────────────────────────────────────
def predict_sliding_window(model, image_path, tile_size=224, stride=112):
    """
    Image ko chhote tiles mein divide karo
    Har tile mein predict karo
    Deforestation ke exact areas dhundho!
    """
    print(f'\n🔍 Sliding Window Analysis: {image_path}')
    print(f'   Tile size : {tile_size}x{tile_size}')
    print(f'   Stride    : {stride}')

    # Image load
    img_pil = PILImage.open(image_path).convert('RGB')
    img_np  = np.array(img_pil)
    H, W    = img_np.shape[:2]
    print(f'   Image size: {W}x{H}')

    # Agar image chhoti hai tile se → tile size adjust karo
    if H < tile_size or W < tile_size:
        tile_size = min(H, W) // 2
        stride    = tile_size // 2
        print(f'   ⚠️  Small image — adjusted tile: {tile_size}, stride: {stride}')

    tile_results   = []
    heatmap        = np.zeros((H, W), dtype=np.float32)
    defor_heatmap  = np.zeros((H, W), dtype=np.float32)
    alert_tiles    = []

    print('\n🔄 Processing tiles...')
    total_tiles = 0

    for y in range(0, H - tile_size + 1, stride):
        for x in range(0, W - tile_size + 1, stride):
            total_tiles += 1

            # Tile kato
            tile = img_np[y:y+tile_size, x:x+tile_size]

            # Preprocess
            tile_t = tf.image.resize(tile, IMG_SIZE)
            tile_t = tf.cast(tile_t, tf.float32)
            tile_b = tf.expand_dims(tile_t, axis=0)

            # Predict
            preds      = model.predict(tile_b, verbose=0)[0]
            pred_class = CLASS_NAMES[np.argmax(preds)]
            conf       = float(np.max(preds)) * 100
            forest_conf = float(preds[1]) * 100  # Forest = index 1

            tile_results.append({
                'x': x, 'y': y,
                'class': pred_class,
                'confidence': conf,
                'forest_conf': forest_conf
            })

            # Heatmap update
            heatmap[y:y+tile_size, x:x+tile_size] += forest_conf / 100

            # Deforestation alert
            if pred_class in DEFORESTATION_CLASSES and conf > 55:
                alert_tiles.append({
                    'x': x, 'y': y,
                    'class': pred_class,
                    'confidence': conf
                })
                defor_heatmap[y:y+tile_size, x:x+tile_size] += conf / 100
                print(f'  ⚠️  ALERT [{x:4d},{y:4d}] → {pred_class} ({conf:.1f}%)')

    print(f'\n   Total tiles processed: {total_tiles}')

    # ── Results ────────────────────────────────────────────
    classes_found = [r['class'] for r in tile_results]
    counts        = Counter(classes_found)

    deforestation_found = len(alert_tiles) > 0

    # ── Verdict ────────────────────────────────────────────
    print('\n' + '='*55)
    if deforestation_found:
        print(f'🚨 DEFORESTATION DETECTED!')
        print(f'   Suspicious tiles : {len(alert_tiles)} / {total_tiles}')
        for cls, cnt in Counter(t['class'] for t in alert_tiles).items():
            print(f'   → {cls}: {cnt} tiles — {DEFORESTATION_CLASSES[cls]}')
    else:
        print('🌳 SAFE — No significant deforestation detected!')
    print('='*55)

    # ── Plot ───────────────────────────────────────────────
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle('Sliding Window — Deforestation Detection System',
                 fontsize=14, fontweight='bold')

    # 1. Original
    axes[0, 0].imshow(img_np)
    axes[0, 0].set_title('[INPUT] Original Image', fontsize=11)
    axes[0, 0].axis('off')

    # 2. Forest Heatmap (blue = forest, red = non-forest)
    axes[0, 1].imshow(img_np)
    im = axes[0, 1].imshow(
        heatmap / (heatmap.max() + 1e-6),
        alpha=0.5, cmap='RdYlGn', vmin=0, vmax=1
    )
    axes[0, 1].set_title('Forest Confidence Map\n(Green = Forest | Red = Non-Forest)',
                          fontsize=10)
    axes[0, 1].axis('off')
    plt.colorbar(im, ax=axes[0, 1], fraction=0.04)

    # 3. Deforestation Heatmap
    axes[1, 0].imshow(img_np)
    if defor_heatmap.max() > 0:
        axes[1, 0].imshow(
            defor_heatmap / (defor_heatmap.max() + 1e-6),
            alpha=0.6, cmap='Reds', vmin=0, vmax=1
        )
    axes[1, 0].set_title('[ALERT] Deforestation Detection Map', fontsize=11)
    axes[1, 0].axis('off')

    # Alert boxes draw karo
    import matplotlib.patches as patches
    for t in alert_tiles:
        rect = patches.Rectangle(
            (t['x'], t['y']), tile_size, tile_size,
            linewidth=2, edgecolor='red', facecolor='none'
        )
        axes[1, 0].add_patch(rect)

    # 4. Class distribution pie
    if counts:
        pie_labels = list(counts.keys())
        pie_vals   = list(counts.values())
        pie_colors = ['#4CAF50' if c == 'Forest' else '#F44336'
                      if c in DEFORESTATION_CLASSES else '#2196F3'
                      for c in pie_labels]
        axes[1, 1].pie(pie_vals, labels=pie_labels, colors=pie_colors,
                       autopct='%1.1f%%', startangle=140,
                       textprops={'fontsize': 8})

    verdict_title = '[!!] DEFORESTATION DETECTED!' if deforestation_found \
                    else '[OK] SAFE — Forest Intact'
    v_color = 'red' if deforestation_found else 'green'
    axes[1, 1].set_title(f'{verdict_title}', fontsize=11,
                          fontweight='bold', color=v_color)

    plt.tight_layout()
    out = 'result_sliding_window.png'
    plt.savefig(out, dpi=100, bbox_inches='tight')
    print(f'\n📸 Saved: {out}')
    plt.show()

    return deforestation_found, alert_tiles


# ── Main ─────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description='🛰️  Satellite Image Deforestation Analyzer',
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument('--image',  type=str, required=True,
                        help='Path to satellite image (jpg/png)')
    parser.add_argument('--model',  type=str, default=MODEL_PATH,
                        help='Path to trained .keras model')
    parser.add_argument('--mode',   type=str, default='single',
                        choices=['single', 'window'],
                        help='single = full image predict\n'
                             'window = sliding window detection')
    parser.add_argument('--tile',   type=int, default=224,
                        help='Tile size for sliding window (default: 224)')
    parser.add_argument('--stride', type=int, default=112,
                        help='Stride for sliding window (default: 112)')
    args = parser.parse_args()

    print('\n' + '='*55)
    print('  [MODEL] Deforestation Analysis System')
    print('  EfficientNetB0 | Test Accuracy: 93.63%')
    print('='*55)

    model = load_model(args.model)

    if args.mode == 'single':
        predict_single(model, args.image)
    else:
        predict_sliding_window(model, args.image,
                               tile_size=args.tile,
                               stride=args.stride)


if __name__ == '__main__':
    main()
