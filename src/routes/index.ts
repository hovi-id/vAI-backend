import { Router } from 'express';
import walletRoutes from '../api/wallet';
import appRoutes from '../api/app';

const router = Router();

// Register APIs

// console.log("Registering routes...");
// router.use('/api/', appRoutes);
// router.use('/wallet/', walletRoutes);

export const initAPI = (app: any) => {
    // Platform API calls.
    app.use('/api', appRoutes);
    app.use('/wallet', walletRoutes);
};


// export default router;