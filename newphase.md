# EcoWatch — Final Implementation Plan 🏆
## Monitoring Campaign + Historical Analysis

---

## 🗓️ Flexible Date System (Core Design)

Dono features mein **same flexible date picker** use hoga — user koi bhi time window choose kar sakta hai:

### Date Picker Design:
```
┌──────────────────────────────────────────────────────┐
│  FROM                        TO                      │
│  [June ▼] [2022 ▼]          [August ▼] [2024 ▼]    │
│                                                      │
│  Quick Select:                                       │
│  [+3 months] [+6 months] [+1 year] [+2 years]       │
│                                                      │
│  Number of Scans: [2] [4] [6] [8] [10]  ← toggle   │
│                                                      │
│  Auto-distributed dates (preview):                   │
│  📍 June 2022   📍 Feb 2023   📍 Aug 2024           │
│                    ↕ 8 months gap                    │
└──────────────────────────────────────────────────────┘
```

### User ke examples jo tune bataye:
| User Chahta Hai | System Kya Karega |
|---|---|
| "June-August, 2 scans" | June 2026 + August 2026 |
| "Abhi ke pehle ka" | Historical: June 2024 → June 2026 (past data) |
| "June se agle June tak" | June 2026 → June 2027 (future campaign) |
| "2 sal baad August tak" | June 2026 → August 2028 (long campaign) |
| "2022-2024 mein 6 scans" | Jan'22, May'22, Sep'22, Jan'23, May'23, Sep'23... |

> **Rule:** Agar end date future mein hai → **Monitoring Campaign mode**  
> Agar end date past mein hai → **Historical Analysis mode**  
> System automatically detect karega — ek hi form!

---

## ✅ Feature 1 — Monitoring Campaign (Live Tracking)

### Form Fields (Complete):

```
┌─────────────────────────────────────────────────────┐
│  🛰️ NEW MONITORING CAMPAIGN                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Campaign Name *    [Amazon Watch 2026           ]  │
│                                                     │
│  Zone *             [Select Zone ▼]                 │
│                     OR [Draw on Map 🗺️]             │
│  ⚠️ Zone > 500 km² will auto-warn user             │
│                                                     │
│  ── TIME WINDOW ─────────────────────────────────  │
│  FROM  [June ▼] [2026 ▼]                           │
│  TO    [November ▼] [2026 ▼]                       │
│  Quick: [+3M] [+6M] [+1Y] [+2Y]                   │
│                                                     │
│  Scans:  [2] [4] [6] [8] [10]  → 6 selected       │
│  Gap:    Auto = 1 month apart (min 5 days enforced)│
│                                                     │
│  Preview Dates: ✅                                  │
│  📍 Jun'26  📍 Jul'26  📍 Aug'26                   │
│  📍 Sep'26  📍 Oct'26  📍 Nov'26                   │
│                                                     │
│  ── SCAN SETTINGS ──────────────────────────────── │
│  Resolution         [20m ▼]  (10/20/30m)           │
│  Max Cloud Cover    [50% ▼]  (images > X% rejected)│
│  Retry if Cloudy    [Yes ▼]  (±7 day window)       │
│                                                     │
│  ── ALERTS ─────────────────────────────────────── │
│  Alert Email        [officer@forest.gov          ]  │
│  Alert When NDVI drops > [10% ▼] between scans     │
│  (Immediate notification, don't wait for end)      │
│                                                     │
│              [Start Campaign]                       │
└─────────────────────────────────────────────────────┘
```

### Campaign Flow (With All Gap Fixes):

```
Campaign Created
      │
      ▼
Scan 1 (Baseline) ──────────────────────────────────┐
  → Fetch Sentinel-2 image                          │
  → If cloud > threshold → retry ±7 days            │  
  → If still cloudy → mark "SKIPPED: Cloudy ☁️"    │
  → NDVI calculated → saved as BASELINE             │
  → NO alert (this is reference scan)               │
      │                                             │
      ▼                                             │
Scan 2, 3, 4... (Monitoring Scans)                  │
  → Fetch image (same retry logic)                  │
  → Compare with: Scan(N-1) = "Since last scan"     │
  → Compare with: Scan(1)   = "Since campaign start"│
                                                    │
  If NDVI drop > user threshold:                    │
    → Immediate email alert sent 📧                  │
    → Dashboard notification                         │
    → Campaign continues (not stopped)               │
      │                                             │
      ▼                                             │
Campaign End                                         │
  → All scans compared                              │
  → Hectares lost calculated                        │
  → Annual rate calculated                          │
  → Qwen2-VL reads ALL images → overall verdict     │
  → Final PDF report generated                      │
  → Email sent to officer                           │
```

### What User Sees (Timeline View):
```
Amazon Watch 2026 — [ACTIVE 🟢]   [Pause] [Stop]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Progress: ██████░░░░░  3/6 scans | Next: Aug 15
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Jun 1  → Forest: 82% [BASELINE]
📍 Jul 1  → Forest: 79% ⚠️ -3% (-620 ha)
📍 Aug 1  → Forest: 71% 🔴 -8% (-1640 ha) [ALERT SENT]
📍 Sep 1  → ⏳ Pending
📍 Oct 1  → ⏳ Pending
📍 Nov 1  → ⏳ Pending
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total loss so far: 11% = 2,260 hectares
```

---

## ✅ Feature 2 — Historical Analysis (Past Data)

### Form Fields (Complete):

```
┌─────────────────────────────────────────────────────┐
│  🔍 HISTORICAL ANALYSIS                             │
│  (Sentinel-2 archive: 2015 to today)               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Zone *             [Select Zone ▼]                 │
│                     OR [Draw on Map 🗺️]             │
│                                                     │
│  ── TIME WINDOW ─────────────────────────────────  │
│  FROM  [January ▼] [2019 ▼]                        │
│  TO    [December ▼] [2023 ▼]                       │
│  Quick: [Last 1Y] [Last 2Y] [Last 5Y] [Since 2015] │
│                                                     │
│  Samples: [2] [4] [6] [8] [10]  → 6 selected      │
│           (Evenly distributed across range)        │
│                                                     │
│  ── SPECIAL MODES ──────────────────────────────── │
│  ○ Standard (auto-distributed)                     │
│  ○ Seasonal (always same month each year)          │
│    → Month: [June ▼]  → June'19, Jun'20...         │
│  ○ Incident Mode (before/after specific event)     │
│    → Event Date: [📅 2021-08-01]                   │
│    → Window: [30 days] before + [30 days] after    │
│                                                     │
│  Prefer Clear Images: [Yes ▼] (leastCC mosaic)    │
│  Resolution:          [20m ▼]                      │
│                                                     │
│  ── PREVIEW ────────────────────────────────────── │
│  [Preview Dates] ← Click to see exact dates first  │
│                                                     │
│              [Analyze History]                      │
└─────────────────────────────────────────────────────┘
```

### Date Preview (Before Running):
```
┌──────────────────────────────────────────────────┐
│  Preview — 6 dates for Jan 2019 → Dec 2023       │
├──────────────────────────────────────────────────┤
│  📍 Jan 2019  Estimated cloud: ~15%  ✅ Clear    │
│  📍 Sep 2019  Estimated cloud: ~8%   ✅ Clear    │
│  📍 May 2020  Estimated cloud: ~72%  ⚠️ Cloudy  │
│               → Using nearest clear: Apr 2020    │
│  📍 Jan 2021  Estimated cloud: ~12%  ✅ Clear    │
│  📍 Sep 2022  Estimated cloud: ~6%   ✅ Clear    │
│  📍 May 2023  Estimated cloud: ~30%  ✅ OK       │
├──────────────────────────────────────────────────┤
│  Estimated time: ~8 minutes                      │
│  [Adjust Dates] [Confirm & Analyze]              │
└──────────────────────────────────────────────────┘
```

### Historical Analysis Output:
```
Historical Report: Amazon_Zone
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2019 → 2023  |  5 years  |  6 samples
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Timeline:
Jan'19  Sep'19  May'20  Jan'21  Sep'22  May'23
 85%  →  83%  →  79%  →  71%  →  62%  →  54%

Forest Loss:
  Total: 31% = 6,200 hectares
  Rate: ~1,240 ha/year
  = 1.7 football fields per day

⚡ Biggest Loss: Jan'21 → Sep'22 = 9% in 20 months

AI Verdict (Qwen2-VL):
"Progressive deforestation detected in NW sector.
Pattern consistent with agricultural expansion.
Rate accelerated significantly after 2021."

[Download PDF] [Share Report] [Create Alert Zone]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🏗️ Technical Implementation

### New Backend Components

#### 1. MonitoringCampaign Model (MongoDB)
```javascript
{
  name:           String,
  zoneId:         ObjectId,
  bbox:           [lng_min, lat_min, lng_max, lat_max],
  startDate:      Date,
  endDate:        Date,
  scanDates:      [Date],   // pre-calculated dates
  scanCount:      Number,   // 2, 4, 6, 8, 10
  resolution:     Number,   // 10, 20, 30
  maxCloudCover:  Number,   // 0-100%
  alertThreshold: Number,   // % NDVI drop to trigger alert
  alertEmail:     String,
  status:         "active" | "paused" | "completed",
  scans:          [{ date, scanId, status, ndvi, forestPct, skipped, skipReason }],
  baselineScan:   ObjectId,
  finalReport:    { totalLoss, lossHectares, ratePerYear, aiVerdict }
}
```

#### 2. New API Endpoints (Node)
```
POST /api/campaigns                → Create campaign
GET  /api/campaigns                → List all
GET  /api/campaigns/:id            → Detail + all scans
PATCH /api/campaigns/:id/pause     → Pause/resume
DELETE /api/campaigns/:id          → Delete

POST /api/historical               → Run historical analysis
GET  /api/historical/:id           → Get result
POST /api/historical/preview       → Preview dates before running
```

#### 3. Smart Scheduler (Node — cron every 1 hour)
```javascript
// Every hour:
// 1. Find campaigns where nextScanDate <= today
// 2. Trigger scan
// 3. If scan fails (cloudy) → retry in 3 days
// 4. If retry fails → mark SKIPPED, schedule next
// 5. Compare with baseline + previous
// 6. If NDVI drop > threshold → send alert email
// 7. If last scan done → generate final report
```

#### 4. Hectares Calculator (ML Service)
```python
def calculate_hectares(bbox, forest_pct_old, forest_pct_new):
    lng_min, lat_min, lng_max, lat_max = bbox
    # Approximate area in km²
    width_km  = (lng_max - lng_min) * 111 * cos(lat_mean)
    height_km = (lat_max - lat_min) * 111
    total_area_ha = width_km * height_km * 100  # km² to hectares
    loss_ha = total_area_ha * (forest_pct_old - forest_pct_new) / 100
    return round(loss_ha, 1)
```

### New Frontend Pages

#### `/monitoring` — Campaign Manager
- Campaign creation form (with all fields above)
- Live timeline view per campaign
- Real-time status via WebSocket

#### `/historical` — Historical Analyzer  
- Historical form (with Date Preview)
- Results timeline chart (Chart.js)
- Side-by-side scan images
- AI verdict + PDF download

---

## 🚀 Implementation Order

| # | Task | Effort |
|---|------|--------|
| 1 | MonitoringCampaign model + CRUD API (Node) | 1h |
| 2 | Smart scheduler with retry + alert email | 1h |
| 3 | Hectares calculator (ML service) | 30m |
| 4 | Historical multi-date fetch (ML service) | 45m |
| 5 | `/monitoring` page — form + timeline UI | 2h |
| 6 | `/historical` page — form + preview + chart | 2h |
| 7 | Date Preview API + Cloud estimate | 30m |
| 8 | Final Report generator (PDF) | 30m |
| **Total** | | **~8 hours** |

---

## ⚠️ Constraints & Limits

| Rule | Value | Reason |
|------|-------|--------|
| Min scan gap | 5 days | Sentinel-2 revisit time |
| Max scans per campaign | 10 | API rate limit protection |
| Max historical samples | 10 | API rate limit protection |
| Max area size | 500 km² (warn) | PU consumption |
| Historical start limit | June 2015 | Sentinel-2 launch date |
| Cloud retry window | ±7 days | Find nearest clear image |

---

> [!IMPORTANT]
> **Smart Mode Detection:** Single form — system auto-detects:
> - End date in PAST → Historical Analysis (instant, uses archive)
> - End date in FUTURE → Monitoring Campaign (scheduled, runs over time)
> This gives user maximum flexibility without confusion.

> [!TIP]
> **Hackathon Impact:** Yeh system Global Forest Watch jaisa lagega.
> Judges dekhenge: real-time monitoring + historical comparison + AI verdict + hectares impact = complete deforestation intelligence platform.
