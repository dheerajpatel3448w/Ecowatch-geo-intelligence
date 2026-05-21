import { Response } from 'express';
import Alert from '../models/Alert';
import { AuthRequest } from '../middleware/auth.middleware';
import { broadcastAlertUpdate } from '../utils/socket';

// GET /api/alerts
export const getAlerts = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alerts = await Alert.find()
      .populate('zoneId', 'name coordinates')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};

// GET /api/alerts/zone/:id
export const getAlertsByZone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alerts = await Alert.find({ zoneId: req.params.id })
      .sort({ createdAt: -1 });
    res.json({ success: true, count: alerts.length, data: alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};

// PUT /api/alerts/:id/read
export const markRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!alert) { res.status(404).json({ success: false, message: 'Alert not found' }); return; }
    
    broadcastAlertUpdate(alert);
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};

// GET /api/alerts/stats — Dashboard ke liye
export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [total, unread, critical, high] = await Promise.all([
      Alert.countDocuments(),
      Alert.countDocuments({ isRead: false }),
      Alert.countDocuments({ severity: 'CRITICAL' }),
      Alert.countDocuments({ severity: 'HIGH' }),
    ]);

    res.json({
      success: true,
      data: { total, unread, critical, high },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};

// PUT /api/alerts/:id/status
export const updateAlertStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, resolutionNote } = req.body;
    const validStatuses = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_ALARM'];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const updateData: any = {
      status,
      resolutionNote: resolutionNote || '',
    };

    if (status === 'RESOLVED' || status === 'FALSE_ALARM') {
      updateData.resolvedBy = req.user?.id;
      updateData.resolvedAt = new Date();
    } else {
      updateData.resolvedBy = null;
      updateData.resolvedAt = null;
    }

    const alert = await Alert.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('resolvedBy', 'name email');

    if (!alert) {
      res.status(404).json({ success: false, message: 'Alert not found' });
      return;
    }

    broadcastAlertUpdate(alert);
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, error: err });
  }
};
