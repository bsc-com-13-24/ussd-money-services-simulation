import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../db/data-source";
import { RequestLog } from "../entities/RequestLog";

// Fires after the route (or a rejecting middleware) has set res.statusCode
// and req.checkResult. Logs every attempt, pass or fail — this is CIS's
// audit trail, independent of whatever Mphamvu Hub logs on its own side.
export async function logRequest(req: Request, res: Response, next: NextFunction) {
  res.on("finish", async () => {
    try {
      const repo = AppDataSource.getRepository(RequestLog);
      await repo.save(
        repo.create({
          clientId: req.clientId,
          phoneQueried: (req.query.phone as string) ?? undefined,
          checkResult: req.checkResult ?? (res.statusCode < 400 ? "success" : "invalid_token"),
        })
      );
    } catch (err) {
      console.error("Failed to write RequestLog:", err);
    }
  });
  next();
}
