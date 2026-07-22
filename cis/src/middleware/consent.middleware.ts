import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface ConsentTokenPayload {
  sub: string; // phone number the consent applies to
  scope: string; // e.g. "read:transactions"
  institutionType?: "telecom" | "bank" | "any";
  consentRecordId: string; // Mphamvu Hub's own ConsentRecord id, for traceability in logs
  iat: number;
  exp: number;
}

// Layer 2 of 2: does a specific user actually consent to this specific
// data pull? CIS never trusts anything above Tier-1-equivalent data
// without a valid, unexpired, phone-matching, scope-matching token.
// There is no bypass — not even for Mphamvu Hub's own trusted client
// credentials from layer 1. Both checks must pass.
export function requireConsent(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      req.checkResult = "invalid_token";
      return res.status(403).json({
        error: { code: "invalid_consent_token", message: "Authorization: Bearer <consent token> is required." },
      });
    }

    let payload: ConsentTokenPayload;
    try {
      payload = jwt.verify(token, env.consentSecret) as ConsentTokenPayload;
    } catch (err: any) {
      req.checkResult = err.name === "TokenExpiredError" ? "expired_token" : "invalid_token";
      const code = err.name === "TokenExpiredError" ? "expired_consent_token" : "invalid_consent_token";
      return res.status(403).json({ error: { code, message: "Consent token is invalid or expired." } });
    }

    const phoneQueried = (req.query.phone as string) ?? "";
    if (payload.sub !== phoneQueried) {
      req.checkResult = "phone_mismatch";
      return res.status(403).json({
        error: {
          code: "consent_phone_mismatch",
          message: "Consent token does not authorize access to this phone number's data.",
        },
      });
    }

    if (!payload.scope.split(" ").includes(requiredScope)) {
      req.checkResult = "insufficient_scope";
      return res.status(403).json({
        error: { code: "insufficient_scope", message: `Consent token lacks required scope: ${requiredScope}.` },
      });
    }

    req.consent = payload;
    req.checkResult = "success";
    next();
  };
}
