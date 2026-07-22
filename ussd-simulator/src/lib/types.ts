export type Vars = Record<string, string>;

export type MenuOption = string | { to: string; set?: Vars };

export interface MenuNode {
  type: "menu";
  text: (vars: Vars) => string;
  options: Record<string, MenuOption>;
}

export interface InputNode {
  type: "input";
  text: (vars: Vars) => string;
  store: string;
  mask?: boolean;
  next: string;
}

export interface EndNode {
  type: "end";
  text: (vars: Vars) => string;
}

// NEW: performs a real, awaited call against CIS when the session
// arrives here (verify PIN, then write a transaction) and transitions
// automatically to a success or decline end node based on what CIS
// actually returns — never a locally-invented result. The session
// shows a "Please wait..." screen while this is in flight, exactly
// like a real USSD gateway waiting on a core banking response.
export interface ActionNode {
  type: "action";
  run: (ctx: ActionContext) => Promise<ActionResult>;
}

export interface ActionContext {
  vars: Vars;
  accountId: string;
  api: CisApi;
}

export interface ActionResult {
  nextNodeId: string;
  setVars?: Vars;
}

export type Node = MenuNode | InputNode | EndNode | ActionNode;
export type NodeMap = Record<string, Node>;

// Forward-declared here to avoid a circular import between types.ts and
// api.ts; api.ts implements this shape.
export interface CisApi {
  verifyPin: (accountId: string, pin: string) => Promise<{ valid: boolean }>;
  recordTransaction: (
    accountId: string,
    body: { category: string; direction: "credit" | "debit"; amountMWK: number; counterparty: string; description: string }
  ) => Promise<
    | { ok: true; reference: string; balanceAfter: number; occurredAt: string }
    | { ok: false; code: "insufficient_funds" | "account_not_found" | "network_error" }
  >;
  getBalance: (accountId: string) => Promise<{ balanceMWK: number; accountNumberMasked: string; institutionName: string }>;
  getMiniStatement: (
    accountId: string,
    limit?: number
  ) => Promise<{ direction: string; amountMWK: number; description: string; occurredAt: string }[]>;
}

export interface InstitutionConfig {
  key: string;
  displayName: string; // "Airtel Money" — must match CIS's institutionName exactly
  institutionType: "telecom" | "bank";
  dialCode: string; // e.g. "*211#"
  brandColor: string; // Tailwind-friendly hex for the screen/accent
  headerLabel: string; // shown top-left of the screen when idle
  nodes: NodeMap;
  entryNodeId: string; // usually "main"
}
