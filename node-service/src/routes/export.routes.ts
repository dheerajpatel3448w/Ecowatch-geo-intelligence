import { Router } from 'express';
import { exportZoneScansCSV, exportAlertsCSV } from '../controllers/export.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();
router.use(protect);

router.get('/zone/:id/csv', exportZoneScansCSV);
router.get('/alerts/csv',   exportAlertsCSV);

export default router;
