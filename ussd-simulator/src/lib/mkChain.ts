import { NodeMap, Vars, ActionResult } from "./types";

export interface ChainStep {
  key: string;
  prompt: string;
  mask?: boolean;
}

// Plain input-collection chain with no backend call at the end — for
// flows that are genuinely just local UI (e.g. PIN change confirmation
// screens that don't need to touch CIS). Kept for parity with flows
// that were never "fake data" to begin with, just multi-step input.
export function mkInputChain(prefix: string, steps: ChainStep[], endText: (vars: Vars) => string): [NodeMap, string] {
  const built: NodeMap = {};
  const endId = `${prefix}End`;
  steps.forEach((step, i) => {
    const id = `${prefix}${i}`;
    const next = i < steps.length - 1 ? `${prefix}${i + 1}` : endId;
    built[id] = { type: "input", text: () => step.prompt, store: step.key, mask: !!step.mask, next };
  });
  built[endId] = { type: "end", text: endText };
  return [built, `${prefix}0`];
}

export interface TxnSpec {
  category: string;
  direction: "credit" | "debit";
  amountFrom: (vars: Vars) => number;
  counterpartyFrom: (vars: Vars) => string;
  descriptionFrom: (vars: Vars) => string;
}

// The workhorse: any flow that collects some inputs, ends in a PIN
// step, and should result in a REAL transaction written to CIS if (and
// only if) the PIN checks out and the balance is sufficient. This is
// what every "Send Money", "Buy Airtime", "Pay Bill", "Cash Out" style
// flow across every institution is built from — the institution files
// only supply the prompts and the category, not the wiring.
//
// IMPORTANT: `steps` must end with a step whose key is "pin" and
// mask: true — the action node reads vars.pin directly.
export function mkTxnChain(
  prefix: string,
  steps: ChainStep[],
  txn: TxnSpec,
  successText: (vars: Vars) => string,
  options?: {
    wrongPinText?: (vars: Vars) => string;
    insufficientFundsText?: (vars: Vars) => string;
    errorText?: (vars: Vars) => string;
  }
): [NodeMap, string] {
  const built: NodeMap = {};
  const actionId = `${prefix}Action`;
  const endId = `${prefix}End`;
  const declinePinId = `${prefix}DeclinePin`;
  const declineFundsId = `${prefix}DeclineFunds`;
  const declineErrorId = `${prefix}DeclineError`;

  steps.forEach((step, i) => {
    const id = `${prefix}${i}`;
    const next = i < steps.length - 1 ? `${prefix}${i + 1}` : actionId;
    built[id] = { type: "input", text: () => step.prompt, store: step.key, mask: !!step.mask, next };
  });

  built[actionId] = {
    type: "action",
    run: async ({ vars, accountId, api }): Promise<ActionResult> => {
      const pinCheck = await api.verifyPin(accountId, vars.pin ?? "");
      if (!pinCheck.valid) {
        return { nextNodeId: declinePinId };
      }

      const amount = txn.amountFrom(vars);
      const result = await api.recordTransaction(accountId, {
        category: txn.category,
        direction: txn.direction,
        amountMWK: amount,
        counterparty: txn.counterpartyFrom(vars),
        description: txn.descriptionFrom(vars),
      });

      if (!result.ok) {
        if (result.code === "insufficient_funds") return { nextNodeId: declineFundsId };
        return { nextNodeId: declineErrorId };
      }

      return {
        nextNodeId: endId,
        setVars: {
          reference: result.reference,
          balanceAfter: String(result.balanceAfter),
        },
      };
    },
  };

  built[endId] = { type: "end", text: successText };
  built[declinePinId] = {
    type: "end",
    text: options?.wrongPinText ?? (() => "Incorrect PIN.\nTransaction cancelled."),
  };
  built[declineFundsId] = {
    type: "end",
    text: options?.insufficientFundsText ?? ((v) => `Insufficient balance for this transaction.\nAvailable: MWK${v.currentBalance ?? "?"}.`),
  };
  built[declineErrorId] = {
    type: "end",
    text: options?.errorText ?? (() => "Service temporarily unavailable.\nPlease try again later."),
  };

  return [built, `${prefix}0`];
}
