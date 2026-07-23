import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { env } from "../config/env";

// Layer 1 of 2: is this really Mphamvu Hub calling at all?
// This does NOT check user consent — only that the caller is a
// registered, trusted service. See consent.middleware.ts for layer 2.
export async function clientAuth(req: Request, res: Response, next: NextFunction) {
  const clientId = req.header("Client-Id");
  const clientSecret = req.header("Client-Secret");

  if (!clientId || !clientSecret) {
    return res.status(401).json({
      error: { code: "invalid_client", message: "Client-Id and Client-Secret headers are required." },
    });
  }

  const storedHash = env.trustedClients.get(clientId);
  if (!storedHash) {
    return res.status(401).json({
      error: { code: "invalid_client", message: "Unknown Client-Id." },
    });
  }

  const matches = await bcrypt.compare(clientSecret, storedHash);
  if (!matches) {
    return res.status(401).json({
      error: { code: "invalid_client", message: "Client-Secret does not match." },
    });
  }

  req.clientId = clientId;
  next();
}
