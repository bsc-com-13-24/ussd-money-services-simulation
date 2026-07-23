"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRequest = logRequest;
const data_source_1 = require("../db/data-source");
const RequestLog_1 = require("../entities/RequestLog");
// Fires after the route (or a rejecting middleware) has set res.statusCode
// and req.checkResult. Logs every attempt, pass or fail — this is CIS's
// audit trail, independent of whatever Mphamvu Hub logs on its own side.
async function logRequest(req, res, next) {
    res.on("finish", async () => {
        try {
            const repo = data_source_1.AppDataSource.getRepository(RequestLog_1.RequestLog);
            await repo.save(repo.create({
                clientId: req.clientId,
                phoneQueried: req.query.phone ?? undefined,
                checkResult: req.checkResult ?? (res.statusCode < 400 ? "success" : "invalid_token"),
            }));
        }
        catch (err) {
            console.error("Failed to write RequestLog:", err);
        }
    });
    next();
}
