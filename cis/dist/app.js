"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const transactions_route_1 = require("./routes/transactions.route");
const internal_route_1 = require("./routes/internal.route");
const requestLog_middleware_1 = require("./middleware/requestLog.middleware");
const env_1 = require("./config/env");
exports.app = (0, express_1.default)();
// The USSD simulators run as a browser app (Vite dev server) and call
// CIS directly — unlike Mphamvu Hub's API, which calls CIS server-to-
// server and never touches the browser. CORS is scoped to the
// simulator's own origin, not wide open.
exports.app.use((0, cors_1.default)({ origin: env_1.env.simulatorOrigin }));
exports.app.use(express_1.default.json());
exports.app.use(requestLog_middleware_1.logRequest);
exports.app.get("/health", (_req, res) => res.json({ status: "ok", service: "connected-institution-simulator" }));
exports.app.use("/v1", transactions_route_1.transactionsRouter);
exports.app.use("/internal", internal_route_1.internalRouter);
// Fallback error handler — keeps the error response shape consistent
// with Mphamvu Hub's own convention even for unexpected failures.
exports.app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: { code: "internal_error", message: "Something went wrong." } });
});
