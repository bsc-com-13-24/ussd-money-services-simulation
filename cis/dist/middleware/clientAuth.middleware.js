"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientAuth = clientAuth;
const bcrypt_1 = __importDefault(require("bcrypt"));
const env_1 = require("../config/env");
// Layer 1 of 2: is this really Mphamvu Hub calling at all?
// This does NOT check user consent — only that the caller is a
// registered, trusted service. See consent.middleware.ts for layer 2.
async function clientAuth(req, res, next) {
    const clientId = req.header("Client-Id");
    const clientSecret = req.header("Client-Secret");
    if (!clientId || !clientSecret) {
        return res.status(401).json({
            error: { code: "invalid_client", message: "Client-Id and Client-Secret headers are required." },
        });
    }
    const storedHash = env_1.env.trustedClients.get(clientId);
    if (!storedHash) {
        return res.status(401).json({
            error: { code: "invalid_client", message: "Unknown Client-Id." },
        });
    }
    const matches = await bcrypt_1.default.compare(clientSecret, storedHash);
    if (!matches) {
        return res.status(401).json({
            error: { code: "invalid_client", message: "Client-Secret does not match." },
        });
    }
    req.clientId = clientId;
    next();
}
