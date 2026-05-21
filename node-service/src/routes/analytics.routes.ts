import { Router } from 'express';
import { getThreatDistribution, getAlertsOverTime } from '../controllers/analytics.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();
router.use(protect);

router.get('/threat-distribution', getThreatDistribution);
router.get('/alerts-over-time',    getAlertsOverTime);

export default router;
