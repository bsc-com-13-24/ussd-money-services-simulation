import { CisApi, InstitutionConfig } from "./types";

const CIS_BASE_URL = import.meta.env.VITE_CIS_BASE_URL ?? "http://localhost:4000";
const INTERNAL_GATEWAY_KEY = import.meta.env.VITE_INTERNAL_GATEWAY_KEY ?? "";

function headers() {
  return {
    "Content-Type": "application/json",
    "Internal-Gateway-Key": INTERNAL_GATEWAY_KEY,
  };
}

// Auto-provisions a member + account the moment a "SIM" is inserted —
// mirrors a real telecom's first-dial provisioning. Called once when
// the simulator starts a session for a given phone number.
export async function lookupOrCreateAccount(phone: string, institution: InstitutionConfig) {
  const res = await fetch(`${CIS_BASE_URL}/internal/members/lookup-or-create`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      phone,
      institutionType: institution.institutionType,
      institutionName: institution.displayName,
    }),
  });
  if (!res.ok) throw new Error(`lookupOrCreateAccount failed: ${res.status}`);
  return (await res.json()) as {
    memberId: string;
    accountId: string;
    phone: string;
    balanceMWK: number;
    accountNumberMasked: string;
    isNewMember: boolean;
    isNewAccount: boolean;
  };
}

export function makeCisApi(): CisApi {
  return {
    async verifyPin(accountId, pin) {
      const res = await fetch(`${CIS_BASE_URL}/internal/accounts/${accountId}/verify-pin`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) return { valid: false };
      return res.json();
    },

    async recordTransaction(accountId, body) {
      try {
        const res = await fetch(`${CIS_BASE_URL}/internal/accounts/${accountId}/transactions`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(body),
        });
        if (res.status === 409) return { ok: false, code: "insufficient_funds" };
        if (res.status === 404) return { ok: false, code: "account_not_found" };
        if (!res.ok) return { ok: false, code: "network_error" };
        const data = await res.json();
        return { ok: true, reference: data.reference, balanceAfter: data.balanceAfter, occurredAt: data.occurredAt };
      } catch {
        return { ok: false, code: "network_error" };
      }
    },

    async getBalance(accountId) {
      const res = await fetch(`${CIS_BASE_URL}/internal/accounts/${accountId}`, { headers: headers() });
      if (!res.ok) throw new Error(`getBalance failed: ${res.status}`);
      return res.json();
    },

    async getMiniStatement(accountId, limit = 3) {
      const res = await fetch(`${CIS_BASE_URL}/internal/accounts/${accountId}/transactions?limit=${limit}`, {
        headers: headers(),
      });
      if (!res.ok) throw new Error(`getMiniStatement failed: ${res.status}`);
      const data = await res.json();
      return data.transactions;
    },
  };
}
