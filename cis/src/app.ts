import "reflect-metadata";
import express from "express";
import cors from "cors";
import { transactionsRouter } from "./routes/transactions.route";
import { internalRouter } from "./routes/internal.route";
import { logRequest } from "./middleware/requestLog.middleware";
import { env } from "./config/env";

export const app = express();

// The USSD simulators run as a browser app (Vite dev server) and call
// CIS directly — unlike Mphamvu Hub's API, which calls CIS server-to-
// server and never touches the browser. CORS is scoped to the
// simulator's own origin, not wide open.
app.use(cors({ origin: env.simulatorOrigin }));
app.use(express.json());
app.use(logRequest);

app.get("/health", (_req, res) => res.json({ status: "ok", service: "connected-institution-simulator" }));

app.use("/v1", transactionsRouter);
app.use("/internal", internalRouter);

// Fallback error handler — keeps the error response shape consistent
// with Mphamvu Hub's own convention even for unexpected failures.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { code: "internal_error", message: "Something went wrong." } });
});
