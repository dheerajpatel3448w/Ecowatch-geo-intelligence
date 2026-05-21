/**
 * Export Controller
 * -----------------
 * GET /api/export/zone/:id/csv  → Export scan history to CSV
 * GET /api/export/alerts/csv    → Export all alerts to CSV
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Zone from '../models/Zone';
import Scan from '../models/Scan';
import Alert from '../models/Alert';

// Helper to escape CSV strings
const escapeCSV = (field: any): string => {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// ── GET /api/export/zone/:id/csv ─────────────────────────────────────────────
export const exportZoneScansCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    const scans = await Scan.find({ zoneId: req.params.id, status: 'completed' })
      .sort({ createdAt: -1 });

    const headers = [
      'Job ID',
      'Scan Date',
      'Forest %',
      'Vegetation %',
      'Bare Soil %',
      'Water %',
      'NDVI Mean',
      'AI Threats',
      'AI Severity',
      'AI Description'
    ];

    const rows = scans.map(s => {
      const r = s.results;
      return [
        s.jobId,
        s.scanDate?.toISOString() || s.createdAt.toISOString(),
        r?.forestPercentage?.toFixed(2) || '0',
        r?.vegetationPercentage?.toFixed(2) || '0',
        r?.bareSoilPercentage?.toFixed(2) || '0',
        r?.waterPercentage?.toFixed(2) || '0',
        r?.ndviMean?.toFixed(4) || '0',
        escapeCSV((r?.threats as string[] || []).join(', ')),
        r?.severity || 'none',
        escapeCSV(r?.description || '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="EcoWatch_${zone.name.replace(/\s+/g, '_')}_Scans.csv"`);
    res.send(csvContent);

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/export/alerts/csv ──────────────────────────────────────────────
export const exportAlertsCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alerts = await Alert.find().populate('zoneId', 'name').sort({ createdAt: -1 });

    const headers = [
      'Alert ID',
      'Date',
      'Zone Name',
      'Severity',
      'Forest Loss %',
      'Message',
      'Change Type',
      'Probable Cause'
    ];

    const rows = alerts.map(a => {
      return [
        a._id,
        a.createdAt.toISOString(),
        escapeCSV((a.zoneId as any)?.name || 'Unknown'),
        a.severity,
        a.forestLoss || '0',
        escapeCSV(a.message || ''),
        escapeCSV((a as any).changeType || ''),
        escapeCSV((a as any).probableCause || '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="EcoWatch_All_Alerts.csv"`);
    res.send(csvContent);

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, error: String(err) });
  }
};
