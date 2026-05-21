/**
 * Legal & Intelligence Controller
 * --------------------------------
 * Feature 1: Carbon Loss Calculator  — GET /api/legal/zone/:id/carbon
 * Feature 2: FIR-Ready Legal Report  — GET /api/legal/zone/:id/fir
 * Feature 3: Zone Risk Score         — GET /api/legal/zone/:id/risk
 *             All Zones Risk         — GET /api/legal/risk-scores
 */

import { Response }   from 'express';
import PDFDocument     from 'pdfkit';
import Scan            from '../models/Scan';
import Zone            from '../models/Zone';
import Alert           from '../models/Alert';
import { AuthRequest } from '../middleware/auth.middleware';

// ── Constants ────────────────────────────────────────────────────────────────
const TREES_PER_KM2      = 40_000;          // Avg tropical forest density
const CO2_PER_TREE_TONNE = 0.022;           // Avg CO₂ stored per tree (tonnes)
const CARBON_CREDIT_USD  = 15;              // $/tonne (international market)
const USD_TO_INR         = 83.5;            // Approx exchange rate
const CAMPA_RATE_INR     = 1_000;           // ₹/tonne (India CAMPA estimate)

// ── Helper: Calculate carbon loss ───────────────────────────────────────────
const calcCarbonLoss = (deforestedKm2: number) => {
  const treesLost    = deforestedKm2 * TREES_PER_KM2;
  const co2Tonnes    = parseFloat((treesLost * CO2_PER_TREE_TONNE).toFixed(2));
  const valueUSD     = parseFloat((co2Tonnes * CARBON_CREDIT_USD).toFixed(2));
  const valueINR     = parseFloat((co2Tonnes * CAMPA_RATE_INR).toFixed(2));
  const valueLakhINR = parseFloat((valueINR / 100_000).toFixed(2));
  return { treesLost: Math.round(treesLost), co2Tonnes, valueUSD, valueINR, valueLakhINR };
};

// ── Helper: Risk Score Calculation ───────────────────────────────────────────
const calcRiskScore = (
  ndviLossPct: number,
  alertCount: number,
  latestSeverity: string,
): { score: number; level: string; color: string } => {

  // NDVI component: 0-40 points
  const ndviScore = Math.min(40, ndviLossPct * 2.5);

  // Alert frequency: 0-30 points
  const alertScore = Math.min(30, alertCount * 5);

  // Severity component: 0-30 points
  const sevMap: Record<string, number> = {
    none: 0, low: 8, medium: 15, high: 23, critical: 30
  };
  const sevScore = sevMap[latestSeverity?.toLowerCase()] ?? 0;

  const score = Math.round(ndviScore + alertScore + sevScore);

  let level = 'LOW';
  let color = '#2d7a4f';
  if (score >= 75) { level = 'CRITICAL'; color = '#c62828'; }
  else if (score >= 50) { level = 'HIGH';     color = '#e65100'; }
  else if (score >= 25) { level = 'MEDIUM';   color = '#f9a825'; }

  return { score, level, color };
};


// ── Feature 1: Carbon Loss Calculator ───────────────────────────────────────
// GET /api/legal/zone/:id/carbon
export const getCarbonLoss = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    // Last 2 completed scans
    const scans = await Scan.find({ zoneId: req.params.id, status: 'completed' })
      .sort({ createdAt: -1 }).limit(20);

    if (scans.length < 2) {
      res.json({ success: true, message: 'Need at least 2 scans for carbon calculation', data: null });
      return;
    }

    const latest  = scans[0];
    const oldest  = scans[scans.length - 1];
    const lossPct = Math.max(0, (oldest.results?.forestPercentage ?? 0) - (latest.results?.forestPercentage ?? 0));

    // Deforested area
    const totalKm2        = zone.area_km2 || 10;
    const deforestedKm2   = parseFloat(((lossPct / 100) * totalKm2).toFixed(4));
    const carbon          = calcCarbonLoss(deforestedKm2);

    res.json({
      success: true,
      data: {
        zone:              { id: zone._id, name: zone.name, area_km2: totalKm2 },
        period:            {
          from:  oldest.scanDate?.toISOString().split('T')[0],
          to:    latest.scanDate?.toISOString().split('T')[0],
          scans: scans.length,
        },
        deforestation: {
          forestLossPct:   parseFloat(lossPct.toFixed(2)),
          deforestedKm2,
          deforestedHa:    parseFloat((deforestedKm2 * 100).toFixed(2)),
        },
        carbonImpact: {
          treesLost:       carbon.treesLost,
          co2TonnesLost:   carbon.co2Tonnes,
          economicDamage: {
            usd:            carbon.valueUSD,
            inr:            carbon.valueINR,
            inrLakhs:       carbon.valueLakhINR,
            basis:          `₹${CAMPA_RATE_INR}/tonne (CAMPA rate) | $${CARBON_CREDIT_USD}/tonne (international)`,
          },
        },
        note: 'Estimates based on avg tropical forest density (40,000 trees/km²) and 22kg CO₂/tree/year',
      },
    });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};


// ── Feature 3: Zone Risk Score ───────────────────────────────────────────────
// GET /api/legal/zone/:id/risk
export const getZoneRiskScore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    const since3months = new Date();
    since3months.setMonth(since3months.getMonth() - 3);

    const [scans, alertCount] = await Promise.all([
      Scan.find({ zoneId: req.params.id, status: 'completed' }).sort({ createdAt: -1 }).limit(10),
      Alert.countDocuments({ zoneId: req.params.id, createdAt: { $gte: since3months } }),
    ]);

    const latest  = scans[0];
    const oldest  = scans[scans.length - 1];
    const lossPct = scans.length >= 2
      ? Math.max(0, (oldest.results?.forestPercentage ?? 0) - (latest.results?.forestPercentage ?? 0))
      : 0;
    const latestSeverity = latest?.results?.severity ?? 'none';

    const risk = calcRiskScore(lossPct, alertCount, latestSeverity as string);

    res.json({
      success: true,
      data: {
        zone:          { id: zone._id, name: zone.name, area_km2: zone.area_km2 },
        riskScore:     risk.score,
        riskLevel:     risk.level,
        breakdown: {
          ndviLoss:    parseFloat(lossPct.toFixed(2)),
          alerts3mo:   alertCount,
          latestThreat: latestSeverity,
        },
        recommendation: risk.level === 'CRITICAL'
          ? 'IMMEDIATE ground inspection and legal action required!'
          : risk.level === 'HIGH'
          ? 'Schedule ground verification within 7 days.'
          : risk.level === 'MEDIUM'
          ? 'Monitor closely — increase scan frequency.'
          : 'Zone is stable — routine monitoring sufficient.',
        lastScan: latest?.scanDate ?? null,
      },
    });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};


// GET /api/legal/risk-scores — All zones ranked by risk
export const getAllRiskScores = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zones = await Zone.find({ isActive: true });
    const since3months = new Date();
    since3months.setMonth(since3months.getMonth() - 3);

    const results = await Promise.all(zones.map(async (zone) => {
      const [scans, alertCount] = await Promise.all([
        Scan.find({ zoneId: zone._id, status: 'completed' }).sort({ createdAt: -1 }).limit(5),
        Alert.countDocuments({ zoneId: zone._id, createdAt: { $gte: since3months } }),
      ]);

      const latest  = scans[0];
      const oldest  = scans[scans.length - 1];
      const lossPct = scans.length >= 2
        ? Math.max(0, (oldest.results?.forestPercentage ?? 0) - (latest.results?.forestPercentage ?? 0))
        : 0;

      const risk = calcRiskScore(lossPct, alertCount, (latest?.results?.severity as string) ?? 'none');

      return {
        zoneId:      zone._id,
        zoneName:    zone.name,
        area_km2:    zone.area_km2,
        riskScore:   risk.score,
        riskLevel:   risk.level,
        forestPct:   latest?.results?.forestPercentage ?? null,
        ndviLoss:    parseFloat(lossPct.toFixed(2)),
        alerts3mo:   alertCount,
        lastScan:    latest?.scanDate ?? null,
      };
    }));

    // Sort by risk score descending
    results.sort((a, b) => b.riskScore - a.riskScore);

    res.json({ success: true, count: results.length, data: results });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};


// ── Feature 2: FIR-Ready Legal Evidence Report ──────────────────────────────
// GET /api/legal/zone/:id/fir
export const downloadFIRReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findById(req.params.id).populate('createdBy', 'name email');
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    const scans  = await Scan.find({ zoneId: req.params.id, status: 'completed' })
                             .sort({ createdAt: -1 }).limit(10);
    const alerts = await Alert.find({ zoneId: req.params.id }).sort({ createdAt: -1 }).limit(5);

    const latest  = scans[0];
    const oldest  = scans[scans.length - 1];
    const lossPct = scans.length >= 2
      ? Math.max(0, (oldest.results?.forestPercentage ?? 0) - (latest.results?.forestPercentage ?? 0))
      : 0;

    const totalKm2      = zone.area_km2 || 10;
    const deforestedKm2 = parseFloat(((lossPct / 100) * totalKm2).toFixed(4));
    const carbon        = calcCarbonLoss(deforestedKm2);
    const caseRef       = `ECO-${Date.now().toString().slice(-8)}`;
    const today         = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    const doc = new PDFDocument({ margin: 55, size: 'A4' });
    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="FIR_Evidence_${zone.name.replace(/\s+/g, '_')}_${caseRef}.pdf"`);
    doc.pipe(res);

    const DARK  = '#1a1a2e';
    const RED   = '#c62828';
    const BLUE  = '#0d47a1';
    const GRAY  = '#546e7a';
    const LGRAY = '#f5f5f5';

    // ── TOP BORDER ───────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 8).fill(RED);

    // ── EMBLEM AREA ──────────────────────────────────────────────────────────
    doc.fillColor(DARK).fontSize(10).font('Helvetica').text('GOVERNMENT OF INDIA', { align: 'center' });
    doc.fontSize(8).fillColor(GRAY).text('Ministry of Environment, Forest and Climate Change', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(55, doc.y).lineTo(doc.page.width - 55, doc.y).lineWidth(1.5).stroke(RED);
    doc.moveDown(0.3);

    doc.fillColor(DARK).fontSize(18).font('Helvetica-Bold')
       .text('FOREST CRIME EVIDENCE REPORT', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor(RED)
       .text('(For Submission to Competent Authority / Forest Court)', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(55, doc.y).lineTo(doc.page.width - 55, doc.y).lineWidth(1.5).stroke(RED);
    doc.moveDown(0.6);

    // ── CASE HEADER ──────────────────────────────────────────────────────────
    doc.rect(55, doc.y, doc.page.width - 110, 48).fill(LGRAY).stroke('#cccccc');
    const ch = doc.y;
    doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold')
       .text(`Case Reference No.: ${caseRef}`, 65, ch + 7)
       .text(`Date of Report: ${today}`, 65, ch + 22)
       .text(`Classification: CONFIDENTIAL — OFFICIAL USE ONLY`, 65, ch + 37);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(RED)
       .text(`Detection Method: AI Satellite Monitoring (EcoWatch)`, 300, ch + 7)
       .text(`Satellite Source: Sentinel-2 (ESA Copernicus)`, 300, ch + 22)
       .text(`AI Model: Qwen2-VL + NDVI Physics Analysis`, 300, ch + 37);
    doc.y = ch + 60;

    // ── SECTION HELPER ───────────────────────────────────────────────────────
    const section = (title: string) => {
      doc.moveDown(0.5);
      doc.rect(55, doc.y, doc.page.width - 110, 18).fill(DARK);
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
         .text(`  ${title}`, 58, doc.y - 13);
      doc.y += 8;
      doc.fillColor(DARK).font('Helvetica');
    };

    const field = (label: string, value: string, x = 65, indent = false) => {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(GRAY).text(`${label}:`, x, doc.y, { continued: true, width: 160 });
      doc.font('Helvetica').fillColor(DARK).text(`  ${value}`, { lineGap: 1 });
    };

    // ── SECTION 1: LOCATION ──────────────────────────────────────────────────
    section('1. LOCATION & ZONE IDENTIFICATION');
    field('Zone Name', zone.name);
    field('Zone Description', zone.description || 'Not specified');
    field('GPS Coordinates (Center)', `${zone.coordinates?.lat?.toFixed(6)}°N, ${zone.coordinates?.lng?.toFixed(6)}°E`);
    field('Bounding Box (WGS84)',
      `SW: ${zone.bbox?.lat_min?.toFixed(6)}°N ${zone.bbox?.lng_min?.toFixed(6)}°E  ` +
      `NE: ${zone.bbox?.lat_max?.toFixed(6)}°N ${zone.bbox?.lng_max?.toFixed(6)}°E`);
    field('Total Protected Area', `${zone.area_km2?.toFixed(2) ?? 'N/A'} km² (${(zone.area_km2 * 100)?.toFixed(0) ?? 'N/A'} hectares)`);

    // ── SECTION 2: EVIDENCE ──────────────────────────────────────────────────
    section('2. SATELLITE EVIDENCE & TIMELINE');
    if (scans.length >= 2) {
      field('Observation Period',
        `${oldest.scanDate?.toLocaleDateString('en-IN')} to ${latest.scanDate?.toLocaleDateString('en-IN')}`);
      field('Total Observations', `${scans.length} satellite passes`);
      field('Forest Coverage (First Observation)', `${oldest.results?.forestPercentage?.toFixed(2)}%`);
      field('Forest Coverage (Latest Observation)', `${latest.results?.forestPercentage?.toFixed(2)}%`);
      field('Net Forest Loss', `${lossPct.toFixed(2)}% (${deforestedKm2.toFixed(4)} km² / ${(deforestedKm2 * 100).toFixed(2)} hectares)`);
      field('NDVI (Vegetation Index) — Latest', `Mean: ${latest.results?.ndviMean?.toFixed(4)} | Min: ${latest.results?.ndviMin?.toFixed(4)}`);
    }

    // Scan timeline
    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(BLUE).text('  Observation Log:', 65);
    scans.slice(0, 8).forEach((s, i) => {
      const threats = (s.results?.threats as string[] ?? []).filter(t => t !== 'none').join(', ') || 'None';
      doc.fontSize(7.5).font('Helvetica').fillColor(DARK)
         .text(`  [${i + 1}] ${s.scanDate?.toLocaleDateString('en-IN') ?? 'N/A'}  —  ` +
               `Forest: ${s.results?.forestPercentage?.toFixed(1)}%  |  ` +
               `Threats: ${threats}  |  Severity: ${s.results?.severity ?? 'N/A'}`, 75);
    });

    // ── SECTION 3: AI THREAT ANALYSIS ───────────────────────────────────────
    section('3. AI THREAT DETECTION (QWEN2-VL ANALYSIS)');
    const threats = (latest?.results?.threats as string[] ?? []).filter(t => t !== 'none');
    field('Threats Identified', threats.length > 0 ? threats.join(', ').toUpperCase() : 'None detected');
    field('Threat Severity', (latest?.results?.severity ?? 'N/A').toUpperCase());
    field('Affected Areas', (latest?.results?.affectedAreas as string[] ?? []).join(', ') || 'Not specified');

    doc.moveDown(0.3);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(BLUE).text('  AI Analysis Description (Expert Opinion):', 65);
    doc.rect(65, doc.y + 2, doc.page.width - 130, 55).fill('#fff8e1').stroke('#ffe082');
    doc.fontSize(8).font('Helvetica').fillColor('#333')
       .text(latest?.results?.description as string || 'No AI description available.', 72, doc.y + 6,
             { width: doc.page.width - 145, lineGap: 2 });
    doc.y += 65;

    // Comparison analysis
    if (alerts.length > 0 && (alerts[0] as any).changeDescription) {
      doc.moveDown(0.3);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(BLUE).text('  Change Analysis (Temporal Comparison):', 65);
      doc.rect(65, doc.y + 2, doc.page.width - 130, 40).fill('#fce4ec').stroke('#ef9a9a');
      doc.fontSize(8).font('Helvetica').fillColor('#333')
         .text(`Type: ${(alerts[0] as any).changeType || 'N/A'}  |  Probable Cause: ${(alerts[0] as any).probableCause || 'N/A'}`, 72, doc.y + 6);
      doc.text((alerts[0] as any).changeDescription || '', 72, doc.y + 18, { width: doc.page.width - 145 });
      doc.y += 50;
    }

    // ── SECTION 4: ECONOMIC DAMAGE ───────────────────────────────────────────
    section('4. ECONOMIC DAMAGE ASSESSMENT');
    field('Trees Lost (Estimated)', `${carbon.treesLost.toLocaleString('en-IN')} trees`);
    field('CO₂ Emissions (Economic Loss)', `${carbon.co2Tonnes.toLocaleString('en-IN')} metric tonnes`);
    field('Economic Damage (CAMPA Rate ₹1000/tonne)', `₹ ${carbon.valueINR.toLocaleString('en-IN')} (₹${carbon.valueLakhINR} Lakhs)`);
    field('Carbon Credit Value (International)', `USD ${carbon.valueUSD.toLocaleString()} (approx ₹${(carbon.valueUSD * USD_TO_INR).toFixed(0)} at current rate)`);
    field('Applicable Law', 'Indian Forest Act, 1927 | Wildlife Protection Act, 1972 | Environment Protection Act, 1986');

    // ── SECTION 5: ALERTS HISTORY ────────────────────────────────────────────
    if (alerts.length > 0) {
      if (doc.y > 650) doc.addPage();
      section('5. OFFICIAL ALERT HISTORY');
      alerts.forEach((a, i) => {
        doc.fontSize(8).font('Helvetica-Bold').fillColor(RED)
           .text(`  Alert ${i + 1}: [${a.severity}] — ${new Date(a.createdAt).toLocaleDateString('en-IN')}`, 65);
        doc.fontSize(7.5).font('Helvetica').fillColor(DARK)
           .text(`  ${a.message}`, 75);
        doc.moveDown(0.2);
      });
    }

    // ── SECTION 6: CERTIFICATION ─────────────────────────────────────────────
    if (doc.y > 680) doc.addPage();
    section('6. CERTIFICATION & DECLARATION');
    doc.moveDown(0.4);
    doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
       .text('This report is generated by EcoWatch — an AI-powered satellite forest monitoring system using European Space Agency (ESA) Sentinel-2 imagery and Qwen2-VL Vision Language Model analysis. The satellite imagery used is publicly available Copernicus data with 10-meter spatial resolution.', 65, doc.y, { width: doc.page.width - 130, lineGap: 3 });
    doc.moveDown(0.5);
    doc.text('The NDVI (Normalized Difference Vegetation Index) calculations are physics-based measurements derived from spectral band analysis (NIR and Red bands), providing scientifically verifiable forest coverage data admissible as technical evidence.', 65, doc.y, { width: doc.page.width - 130, lineGap: 3 });

    doc.moveDown(1.5);
    // Signature block
    const sigY = doc.y;
    doc.rect(65, sigY, 160, 55).stroke('#888');
    doc.rect(280, sigY, 160, 55).stroke('#888');
    doc.rect(doc.page.width - 195, sigY, 160, 55).stroke('#888');

    doc.fontSize(8).fillColor(GRAY)
       .text('Reporting Authority', 70, sigY + 38)
       .text('Forest Department Officer', 285, sigY + 38)
       .text('EcoWatch System', doc.page.width - 190, sigY + 38);

    // ── BOTTOM BORDER ────────────────────────────────────────────────────────
    doc.rect(0, doc.page.height - 35, doc.page.width, 35).fill(DARK);
    doc.fillColor('#aaa').fontSize(7)
       .text(`Case Ref: ${caseRef}  |  Generated: ${today}  |  EcoWatch AI Deforestation Monitor  |  Sentinel-2 + Qwen2-VL`,
             55, doc.page.height - 20, { align: 'center', width: doc.page.width - 110 });

    doc.end();

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, error: String(err) });
  }
};
