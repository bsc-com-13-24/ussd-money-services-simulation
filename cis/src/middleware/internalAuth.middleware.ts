import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

// A DIFFERENT trust boundary from clientAuth.middleware.ts + consent.middleware.ts.
//
// Those two exist to answer: "is Mphamvu Hub, an EXTERNAL party, allowed
// to read this member's data, with this member's consent?"
//
// This middleware exists to answer a completely different question: "is
// this request coming from the telecom's OWN systems?" — i.e. the USSD
// gateway simulator, which in real life would be Airtel/TNM's own core
// banking infrastructure, not an outside consumer. It has no concept of
// consent because a telecom doesn't need its own customer's consent to
// operate its own ledger — it only needs consent to hand that data to
// someone else (which is exactly what the /v1/transactions path enforces).
//
// Never let a request touch /internal/* using Client-Id/Client-Secret —
// keep these two credential types conceptually and literally separate.
export function internalAuth(req: Request, res: Response, next: NextFunction) {
  const key = req.header("Internal-Gateway-Key");
  if (!key || key !== env.internalGatewaySecret) {
    return res.status(401).json({
      error: { code: "invalid_internal_key", message: "Missing or invalid Internal-Gateway-Key." },
    });
  }
  next();
}
