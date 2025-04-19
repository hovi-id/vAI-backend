"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Register APIs
router.use('/api/', require('../api/app').default);
exports.default = router;
