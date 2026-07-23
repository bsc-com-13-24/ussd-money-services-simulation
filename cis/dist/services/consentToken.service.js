"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintConsentToken = mintConsentToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
// This file lives on the CIS side for local testing/demo convenience
// ONLY (e.g. a "generate a demo token" script). In the real system,
// Consent Tokens are minted by Mphamvu Hub's API — CIS only VERIFIES
// them (see middleware/consent.middleware.ts). Mphamvu Hub's backend
// should implement the mirror of this function using the same shared
// CIS_CONSENT_SECRET.
function mintConsentToken(params) {
    return jsonwebtoken_1.default.sign({
        sub: params.phone,
        scope: params.scope ?? "read:transactions",
        institutionType: params.institutionType ?? "any",
        consentRecordId: params.consentRecordId,
    }, env_1.env.consentSecret, { expiresIn: "5m" });
}
