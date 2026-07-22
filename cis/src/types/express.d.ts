import { ConsentTokenPayload } from "../middleware/consent.middleware";
import { CheckResult } from "../entities/RequestLog";

declare global {
  namespace Express {
    interface Request {
      clientId?: string;
      consent?: ConsentTokenPayload;
      checkResult?: CheckResult;
    }
  }
}
