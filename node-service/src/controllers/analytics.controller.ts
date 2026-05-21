/**
 * Analytics Controller
 * --------------------
 * GET /api/analytics/threat-distribution   → Pie chart data (logging vs mining vs fire etc)
 * GET /api/analytics/alerts-over-time      → Bar chart data (alerts per month/week)
 * GET /api/analytics/zone-comparisons      → Radar/Bar chart (comparing top zones by loss)
 */

import { Response } from 'express';
import Alert from '../models/Alert';
import Zone from '../models/Zone';
import Scan from '../models/Scan';
import { AuthRequest } from '../middleware/auth.middleware';

// ── GET /api/analytics/threat-distribution ──────────────────────────────────
export const getThreatDistribution = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipeline = [
      // Sirf completed scans jinke paas valid threats hain ('none' ko hatana hai)
      { $match: { status: 'completed' } },
      { $unwind: '$results.threats' },
      { $match: { 'results.threats': { $ne: 'none' } } },
      { $group: { _id: '$results.threats', count: { $sum: 1 } } },
      { $sort: { count: -1 } as any }
    ];

    const stats = await Scan.aggregate(pipeline as any[]);
    
    // Format for Chart.js / Recharts
    const labels = stats.map(s => s._id.toUpperCase());
    const data   = stats.map(s => s.count);

    res.json({
      success: true,
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#c62828', '#e65100', '#f9a825', '#1565c0', '#4a148c', '#00695c']
        }]
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/analytics/alerts-over-time ──────────────────────────────────────
export const getAlertsOverTime = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    since.setDate(1); // Start of month

    const pipeline = [
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            severity: '$severity'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } as any }
    ];

    const rawData = await Alert.aggregate(pipeline);

    // Format for grouped bar chart
    const labelsMap = new Map(); // "YYYY-MM" -> { critical: 0, high: 0, medium: 0 }
    
    // Initialize last N months
    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      labelsMap.set(label, { critical: 0, high: 0, medium: 0 });
    }

    // Populate data
    rawData.forEach(item => {
      const label = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (labelsMap.has(label)) {
        const severity = item._id.severity.toLowerCase();
        if (['critical', 'high', 'medium'].includes(severity)) {
          labelsMap.get(label)[severity] = item.count;
        }
      }
    });

    // Sort chronologically
    const sortedLabels = Array.from(labelsMap.keys()).sort();
    
    const datasets = [
      {
        label: 'Critical',
        data: sortedLabels.map(l => labelsMap.get(l).critical),
        backgroundColor: '#c62828'
      },
      {
        label: 'High',
        data: sortedLabels.map(l => labelsMap.get(l).high),
        backgroundColor: '#e65100'
      },
      {
        label: 'Medium',
        data: sortedLabels.map(l => labelsMap.get(l).medium),
        backgroundColor: '#f9a825'
      }
    ];

    res.json({
      success: true,
      data: {
        labels: sortedLabels,
        datasets
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};
