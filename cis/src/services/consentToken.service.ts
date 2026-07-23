import jwt from "jsonwebtoken";
import { env } from "../config/env";

// This file lives on the CIS side for local testing/demo convenience
// ONLY (e.g. a "generate a demo token" script). In the real system,
// Consent Tokens are minted by Mphamvu Hub's API — CIS only VERIFIES
// them (see middleware/consent.middleware.ts). Mphamvu Hub's backend
// should implement the mirror of this function using the same shared
// CIS_CONSENT_SECRET.
export function mintConsentToken(params: {
  phone: string;
  institutionType?: "telecom" | "bank" | "any";
  consentRecordId: string;
  scope?: string;
}) {
  return jwt.sign(
    {
      sub: params.phone,
      scope: params.scope ?? "read:transactions",
      institutionType: params.institutionType ?? "any",
      consentRecordId: params.consentRecordId,
    },
    env.consentSecret,
    { expiresIn: "5m" }
  );
}
