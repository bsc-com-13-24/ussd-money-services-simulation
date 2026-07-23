import { NodeMap, InstitutionConfig, Vars } from "../lib/types";
import { mkTxnChain } from "../lib/mkChain";

// NOTE on dialCode: this is a placeholder, not a verified real NBM
// short code — swap it for the real one if you have it before demoing
// this as "National Bank of Malawi" specifically. Everything else
// (balance logic, PIN check, transaction writes) is real regardless
// of which digits are shown on screen.
const DIAL_CODE = "*247#";

const [transferToSavings, transferToSavingsFirst] = mkTxnChain(
  "bkTransfer",
  [
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter Banking PIN:", mask: true },
  ],
  {
    category: "savings_transfer",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: () => "Own savings account",
    descriptionFrom: () => "Transfer to savings account",
  },
  (v) => `MWK ${v.amount} transferred to your savings account.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [payMerchant, payMerchantFirst] = mkTxnChain(
  "bkMerchant",
  [
    { key: "merchant", prompt: "Enter Merchant/Biller Code:" },
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter Banking PIN:", mask: true },
  ],
  {
    category: "merchant_payment",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: (v) => `Merchant ${v.merchant}`,
    descriptionFrom: (v) => `Payment to ${v.merchant}`,
  },
  (v) => `Paid MWK ${v.amount} to ${v.merchant}.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [cardlessWithdraw, cardlessWithdrawFirst] = mkTxnChain(
  "bkAtm",
  [
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter Banking PIN:", mask: true },
  ],
  {
    category: "atm_withdrawal",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: () => "Cardless ATM withdrawal",
    descriptionFrom: () => "Cardless ATM withdrawal",
  },
  (v) => `Withdrawal code generated: ${v.reference}\nUse at any ATM within 30 minutes for MWK ${v.amount}.\nBal: MWK${v.balanceAfter}`
);

const balanceFirst = "bkBalPin";
const balanceNodes: NodeMap = {
  bkBalPin: { type: "input", text: () => "Enter Banking PIN:", store: "pin", mask: true, next: "bkBalAction" },
  bkBalAction: {
    type: "action",
    run: async ({ vars, accountId, api }) => {
      const pinCheck = await api.verifyPin(accountId, vars.pin ?? "");
      if (!pinCheck.valid) return { nextNodeId: "bkBalDeclinePin" };
      const { balanceMWK } = await api.getBalance(accountId);
      return { nextNodeId: "bkBalEnd", setVars: { balanceMWK: String(balanceMWK) } };
    },
  },
  bkBalEnd: { type: "end", text: (v: Vars) => `Available balance: MWK ${Number(v.balanceMWK).toLocaleString()}` },
  bkBalDeclinePin: { type: "end", text: () => "Incorrect PIN." },
};

const statementFirst = "bkStmtPin";
const statementNodes: NodeMap = {
  bkStmtPin: { type: "input", text: () => "Enter Banking PIN:", store: "pin", mask: true, next: "bkStmtAction" },
  bkStmtAction: {
    type: "action",
    run: async ({ vars, accountId, api }) => {
      const pinCheck = await api.verifyPin(accountId, vars.pin ?? "");
      if (!pinCheck.valid) return { nextNodeId: "bkStmtDeclinePin" };
      const txns = await api.getMiniStatement(accountId, 3);
      const lines = txns.map((t) => `${t.direction === "credit" ? "+" : "-"}MWK${t.amountMWK} ${t.description}`).join("\n");
      return { nextNodeId: "bkStmtEnd", setVars: { statementText: lines || "No recent transactions." } };
    },
  },
  bkStmtEnd: { type: "end", text: (v: Vars) => `Mini Statement:\n${v.statementText}` },
  bkStmtDeclinePin: { type: "end", text: () => "Incorrect PIN." },
};

const nodes: NodeMap = {
  main: {
    type: "menu",
    text: () => "National Bank of Malawi\n1. Check Balance\n2. Mini Statement\n3. Transfer to Savings\n4. Pay Merchant/Bill\n5. Cardless Withdrawal",
    options: {
      "1": balanceFirst,
      "2": statementFirst,
      "3": transferToSavingsFirst,
      "4": payMerchantFirst,
      "5": cardlessWithdrawFirst,
    },
  },
  expired: { type: "end", text: () => "Session expired.\nDial again to continue." },
  ...transferToSavings, ...payMerchant, ...cardlessWithdraw,
  ...balanceNodes, ...statementNodes,
};

export const bankConfig: InstitutionConfig = {
  key: "bank",
  displayName: "National Bank of Malawi",
  institutionType: "bank",
  dialCode: DIAL_CODE,
  brandColor: "#0033a0",
  headerLabel: "NBM",
  nodes,
  entryNodeId: "main",
};
