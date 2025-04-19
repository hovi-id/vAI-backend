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
const axios_1 = __importDefault(require("axios"));
const express_1 = require("express");
const router = (0, express_1.Router)();
// Function to issue an AnonCred credential
function issueAnonCredCredential(payload, connectionId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const apiUrl = process.env.API_ENDPOINT + "/credential/anoncred/offer";
            const apiKey = process.env.HOVI_API_KEY;
            const tenantId = process.env.TENANT_ID;
            const credentialTemplateId = process.env.CREDENTIAL_TEMPLATE_ID;
            const data = {
                "connectionId": connectionId,
                "credentialTemplateId": credentialTemplateId,
                "credentialValues": payload,
                "comment": "vAI Demo Credential",
            };
            const headers = {
                "x-tenant-id": tenantId,
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            };
            const response = yield axios_1.default.post(apiUrl, data, { headers });
            return response.data;
        }
        catch (error) {
            console.error("Error issuing AnonCred credential:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error("Failed to issue AnonCred credential");
        }
    });
}
// Function to create a connection
function createConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const apiUrl = process.env.API_ENDPOINT + "/connection/create";
            const apiKey = process.env.HOVI_API_KEY;
            const tenantId = process.env.TENANT_ID;
            const data = {
                label: "Acme Financial Group",
                alias: "fg", //ADD AGENT INVITE URL
                autoAcceptConnection: true,
                multiUseInvitation: false,
                domain: "acme-financial-group.com",
                imageUrl: "https://hovi-assets.s3.eu-central-1.amazonaws.com/studio-assets/tenants/images/acme-financial-group-image-1744552187457.jpeg",
            };
            const headers = {
                "x-tenant-id": tenantId,
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            };
            const response = yield axios_1.default.post(apiUrl, data, { headers });
            return response.data;
        }
        catch (error) {
            console.error("Error creating connection:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error("Failed to create connection");
        }
    });
}
// Function to get connection details
function getConnectionDetails(invitationId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const apiUrl = process.env.API_ENDPOINT +
                "/connection/find?invitationId=" +
                invitationId;
            const apiKey = process.env.HOVI_API_KEY;
            const tenantId = process.env.TENANT_ID;
            const headers = {
                "x-tenant-id": tenantId,
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            };
            const response = yield axios_1.default.get(apiUrl, { headers });
            return response.data;
        }
        catch (error) {
            console.error("Error getting connection details:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            throw new Error("Failed to get connection details");
        }
    });
}
// API endpoint to create a connection
router.post("/create-connection", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const connectionData = yield createConnection();
        res.status(200).json(connectionData);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// API endpoint to get connection details
router.get("/connection/:invitationId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const invitationId = req.params.invitationId;
    try {
        const connectionDetails = yield getConnectionDetails(invitationId);
        res.status(200).json(connectionDetails);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
// API endpoint to issue an AnonCred credential
router.post("/issue-credential", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const credentialData = req.body.credentialValues;
    const connectionId = req.body.connectionId;
    try {
        const credential = yield issueAnonCredCredential(credentialData, connectionId);
        res.status(200).json(credential);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}));
exports.default = router;
