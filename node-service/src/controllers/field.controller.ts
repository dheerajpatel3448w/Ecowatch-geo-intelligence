/**
 * Field Report Controller
 * ------------------------
 * POST /api/field/report  — Field officer photo + GPS upload → Qwen analyzes
 * GET  /api/field/reports — All field reports for a zone
 */

import { Response }   from 'express';
import path           from 'path';
import axios          from 'axios';
import fs             from 'fs';
import FieldReport    from '../models/FieldReport';
import Zone           from '../models/Zone';
import { AuthRequest } from '../middleware/auth.middleware';
import env            from '../config/env';
import { broadcastFieldReport } from '../utils/socket';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// ── POST /api/field/report ────────────────────────────────────────────────────
export const submitFieldReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { zoneId, lat, lng, notes, reporterName } = req.body;
    const file = (req as any).file;

    if (!zoneId || !file) {
      res.status(400).json({ success: false, message: 'zoneId and photo required' });
      return;
    }

    const zone = await Zone.findById(zoneId);
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    // Save field report to DB first
    const report = await FieldReport.create({
      zoneId,
      reportedBy:   req.user?.id,
      reporterName: reporterName || 'Field Officer',
      imagePath:    file.path,
      gps:          { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
      notes:        notes || '',
      status:       'pending',
    });

    // Send image to ML service for Qwen analysis
    try {
      const imageBuffer = fs.readFileSync(file.path);
      const base64Image = imageBuffer.toString('base64');

      const mlRes = await axios.post(`${ML_SERVICE_URL}/api/analyze-field`, {
        image_base64: base64Image,
        zone_name:    zone.name,
        gps:          { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
        notes:        notes || '',
      }, { timeout: 60_000 });

      if (mlRes.data) {
        await FieldReport.findByIdAndUpdate(report._id, {
          status:      'analyzed',
          aiAnalysis: {
            threats:     mlRes.data.threats     ?? [],
            severity:    mlRes.data.severity    ?? 'none',
            description: mlRes.data.description ?? '',
            confidence:  mlRes.data.confidence  ?? 'low',
          },
        });
      }
    } catch (mlErr: any) {
      console.error('ML field analysis failed:', mlErr?.message);
      // Report saved, just not analyzed — still useful
    }

    const saved = await FieldReport.findById(report._id).populate('zoneId', 'name');
    
    // Broadcast the updated report (analyzed or unanalyzed) via Socket.IO
    if (saved) {
      broadcastFieldReport(saved);
    }

    res.status(201).json({ success: true, data: saved });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/field/reports?zone=:id ──────────────────────────────────────────
export const getFieldReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};
    if (req.query.zone) filter.zoneId = req.query.zone;

    const reports = await FieldReport.find(filter)
      .populate('zoneId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, count: reports.length, data: reports });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};
