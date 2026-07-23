import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  databaseUrl: required("DATABASE_URL"),
  consentSecret: required("CIS_CONSENT_SECRET"),
  // Shared only between CIS and the USSD simulators — a completely
  // separate secret from CIS_CONSENT_SECRET / TRUSTED_CLIENTS, because
  // it protects a completely separate trust boundary. See
  // middleware/internalAuth.middleware.ts for why.
  internalGatewaySecret: required("INTERNAL_GATEWAY_SECRET"),
  // The browser origin allowed to call CIS directly via CORS — the
  // Vite dev server the USSD simulators run on, not Mphamvu Hub (which
  // calls server-to-server and is unaffected by CORS entirely).
  simulatorOrigin: process.env.SIMULATOR_ORIGIN ?? "http://localhost:5173",
  // "clientId:bcryptHash,clientId2:bcryptHash2" -> Map<clientId, hash>
  trustedClients: new Map(
    required("TRUSTED_CLIENTS")
      .split(",")
      .map((pair) => pair.split(":") as [string, string])
  ),
};
