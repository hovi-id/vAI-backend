"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const index_1 = __importDefault(require("./routes/index"));
const auth_1 = require("./middlewares/auth");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 9000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((req, res, next) => {
    if ((0, auth_1.authenticateToken)(req, res, next)) {
        // If the token is valid, proceed to the next middleware      
        next();
    }
    else {
        // If the token is invalid, send a 403 Forbidden response      
        res.status(403).json({ message: 'Invalid token' });
    }
});
/*
 * This function is used to check the status of the server
 */
app.get('/status', function (req, res) {
    /*
      * #swagger.tags = ['Status']
      * #swagger.summary = 'Service Status'
      * #swagger.description = 'This route is used to check the status of the server.'
      * #swagger.responses[200] = { description: 'Success', schema: { status: true } }
   */
    res.json({ status: true });
});
app.use(index_1.default);
app.listen(PORT, function () {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Server listening on port ' + PORT);
    });
});
