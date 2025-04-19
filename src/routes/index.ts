import { Router } from 'express';

const router = Router();

// Register APIs
router.use('/api/', require('../api/app').default);

export default router;