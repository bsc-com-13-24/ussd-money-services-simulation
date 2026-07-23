import { NodeMap, InstitutionConfig, Vars } from "../lib/types";
import { mkTxnChain } from "../lib/mkChain";

const [checkAirtime, checkAirtimeFirst] = mkTxnChain(
  "mpAirtime",
  [
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter Mpamba PIN:", mask: true },
  ],
  {
    category: "buy_airtime",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: () => "Self",
    descriptionFrom: (v) => `Airtime purchase MWK${v.amount}`,
  },
  (v) => `Airtime purchase of MWK${v.amount} successful.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [sendMoney, sendMoneyFirst] = mkTxnChain(
  "mpSend",
  [
    { key: "number", prompt: "Enter recipient number:" },
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter Mpamba PIN:", mask: true },
  ],
  {
    category: "send_money",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: (v) => v.number,
    descriptionFrom: (v) => `Sent to ${v.number}`,
  },
  (v) => `You have sent MWK${v.amount} to ${v.number}.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [cashOut, cashOutFirst] = mkTxnChain(
  "mpCashout",
  [
    { key: "agentCode", prompt: "Enter Agent Code:" },
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter Mpamba PIN:", mask: true },
  ],
  {
    category: "cash_out",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: (v) => `Agent ${v.agentCode}`,
    descriptionFrom: (v) => `Cash withdrawal at agent ${v.agentCode}`,
  },
  (v) => `Cash withdrawal of MWK${v.amount} approved.\nShow this code to the agent: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [payBill, payBillFirst] = mkTxnChain(
  "mpBill",
  [
    { key: "biller", prompt: "Enter Biller Name/Code:" },
    { key: "account", prompt: "Enter Account/Meter Number:" },
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter Mpamba PIN:", mask: true },
  ],
  {
    category: "pay_bill",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: (v) => `Biller ${v.biller}`,
    descriptionFrom: (v) => `Bill payment, account ${v.account}`,
  },
  (v) => `You have paid MWK${v.amount} to ${v.biller}.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [merchantPay, merchantPayFirst] = mkTxnChain(
  "mpMerchant",
  [
    { key: "till", prompt: "Enter Merchant Till Number:" },
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter Mpamba PIN:", mask: true },
  ],
  {
    category: "merchant_payment",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: (v) => `Till ${v.till}`,
    descriptionFrom: (v) => `Merchant payment, till ${v.till}`,
  },
  (v) => `You have paid MWK${v.amount} to till ${v.till}.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

// --- Balance / mini statement: real reads against CIS ---

const balanceFirst = "mpBalPin";
const balanceNodes: NodeMap = {
  mpBalPin: { type: "input", text: () => "Enter Mpamba PIN:", store: "pin", mask: true, next: "mpBalAction" },
  mpBalAction: {
    type: "action",
    run: async ({ vars, accountId, api }) => {
      const pinCheck = await api.verifyPin(accountId, vars.pin ?? "");
      if (!pinCheck.valid) return { nextNodeId: "mpBalDeclinePin" };
      const { balanceMWK } = await api.getBalance(accountId);
      return { nextNodeId: "mpBalEnd", setVars: { balanceMWK: String(balanceMWK) } };
    },
  },
  mpBalEnd: { type: "end", text: (v: Vars) => `Your Mpamba balance is MWK ${Number(v.balanceMWK).toLocaleString()}` },
  mpBalDeclinePin: { type: "end", text: () => "Incorrect PIN." },
};

const statementFirst = "mpStmtPin";
const statementNodes: NodeMap = {
  mpStmtPin: { type: "input", text: () => "Enter Mpamba PIN:", store: "pin", mask: true, next: "mpStmtAction" },
  mpStmtAction: {
    type: "action",
    run: async ({ vars, accountId, api }) => {
      const pinCheck = await api.verifyPin(accountId, vars.pin ?? "");
      if (!pinCheck.valid) return { nextNodeId: "mpStmtDeclinePin" };
      const txns = await api.getMiniStatement(accountId, 3);
      const lines = txns.map((t) => `${t.direction === "credit" ? "+" : "-"}MWK${t.amountMWK} ${t.description}`).join("\n");
      return { nextNodeId: "mpStmtEnd", setVars: { statementText: lines || "No recent transactions." } };
    },
  },
  mpStmtEnd: { type: "end", text: (v: Vars) => `Mini Statement:\n${v.statementText}` },
  mpStmtDeclinePin: { type: "end", text: () => "Incorrect PIN." },
};

const nodes: NodeMap = {
  selectSim: {
    type: "menu",
    text: () => "Select SIM\n1. SIM 1\n2. SIM 2",
    // Both SIM slots route into the same demo account — this step exists
    // purely because that's what a real dual-SIM handset shows, matching
    // the screenshot exactly.
    options: { "1": "main", "2": "main" },
  },
  main: {
    type: "menu",
    text: () => "Mpamba - Main Menu\n1. Check Balance\n2. Buy Airtime\n3. Send Money\n4. Cash Out\n5. Pay Bill\n6. Pay Merchant\n7. Mini Statement",
    options: {
      "1": balanceFirst,
      "2": checkAirtimeFirst,
      "3": sendMoneyFirst,
      "4": cashOutFirst,
      "5": payBillFirst,
      "6": merchantPayFirst,
      "7": statementFirst,
    },
  },
  expired: { type: "end", text: () => "Session expired.\nDial again to continue." },
  ...checkAirtime, ...sendMoney, ...cashOut, ...payBill, ...merchantPay,
  ...balanceNodes, ...statementNodes,
};

export const mpambaConfig: InstitutionConfig = {
  key: "mpamba",
  displayName: "TNM Mpamba",
  institutionType: "telecom",
  dialCode: "*444#",
  brandColor: "#f2c400",
  headerLabel: "TNM",
  nodes,
  entryNodeId: "selectSim",
};
