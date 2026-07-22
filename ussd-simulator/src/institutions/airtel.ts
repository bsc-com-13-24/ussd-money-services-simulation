import { NodeMap, InstitutionConfig, Vars } from "../lib/types";
import { mkTxnChain, mkInputChain } from "../lib/mkChain";

// --- Real, backend-wired flows: every one of these writes an actual
// SimulatedTransaction row via mkTxnChain, checks a real PIN, and can
// genuinely fail on insufficient balance. ---

const [airtime, airtimeFirst] = mkTxnChain(
  "airtime",
  [
    { key: "number", prompt: "Enter number (0 for own):" },
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter PIN to confirm:", mask: true },
  ],
  {
    category: "buy_airtime",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: () => "Self",
    descriptionFrom: (v) => `Airtime purchase MWK${v.amount}`,
  },
  (v) => `Confirmed.\nMWK ${v.amount} airtime purchased.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [bundle, bundleFirst] = mkTxnChain(
  "bundle",
  [{ key: "pin", prompt: "Enter PIN to confirm:", mask: true }],
  {
    category: "buy_bundle",
    direction: "debit",
    amountFrom: (v) => parseInt(v.bundleAmount ?? "500", 10),
    counterpartyFrom: () => "Self",
    descriptionFrom: (v) => `${v.bundle ?? "Data bundle"} purchase`,
  },
  (v) => `Confirmed.\n${v.bundle} activated.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [merchantPay, merchantPayFirst] = mkTxnChain(
  "merchant",
  [
    { key: "merchant", prompt: "Enter Merchant Code:" },
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter PIN to confirm:", mask: true },
  ],
  {
    category: "merchant_payment",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: (v) => `Merchant ${v.merchant}`,
    descriptionFrom: (v) => `Merchant payment to ${v.merchant}`,
  },
  (v) => `Paid MWK ${v.amount} to merchant ${v.merchant}.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [billPay, billPayFirst] = mkTxnChain(
  "bill",
  [
    { key: "biller", prompt: "Enter Biller Code:" },
    { key: "account", prompt: "Enter Account/Meter Number:" },
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter PIN to confirm:", mask: true },
  ],
  {
    category: "pay_bill",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: (v) => `Biller ${v.biller}`,
    descriptionFrom: (v) => `Bill payment, account ${v.account}`,
  },
  (v) => `Paid MWK ${v.amount} to biller ${v.biller}, account ${v.account}.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [goodsPay, goodsPayFirst] = mkTxnChain(
  "goods",
  [
    { key: "till", prompt: "Enter Till Number:" },
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter PIN to confirm:", mask: true },
  ],
  {
    category: "merchant_payment",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: (v) => `Till ${v.till}`,
    descriptionFrom: (v) => `Buy Goods, till ${v.till}`,
  },
  (v) => `Paid MWK ${v.amount} to till ${v.till}.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [agentWithdraw, agentWithdrawFirst] = mkTxnChain(
  "agentw",
  [
    { key: "agentCode", prompt: "Enter Agent Code:" },
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter PIN to confirm:", mask: true },
  ],
  {
    category: "cash_out",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: (v) => `Agent ${v.agentCode}`,
    descriptionFrom: (v) => `Cash withdrawal at agent ${v.agentCode}`,
  },
  (v) => `Withdrawal of MWK ${v.amount} approved.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [atmWithdraw, atmWithdrawFirst] = mkTxnChain(
  "atmw",
  [
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter PIN to confirm:", mask: true },
  ],
  {
    category: "cash_out",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: () => "ATM",
    descriptionFrom: () => "ATM cash withdrawal",
  },
  (v) => `Withdrawal of MWK ${v.amount} approved.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [sendGeneric, sendGenericFirst] = mkTxnChain(
  "send",
  [
    { key: "number", prompt: "Enter recipient Airtel number:" },
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter PIN to confirm:", mask: true },
  ],
  {
    category: "send_money",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: (v) => v.number,
    descriptionFrom: (v) => `Sent to ${v.number}`,
  },
  (v) => `Confirmed.\nMWK ${v.amount} sent to ${v.number}.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

const [agentSend, agentSendFirst] = mkTxnChain(
  "agentcode",
  [
    { key: "agentCode", prompt: "Enter Agent Code:" },
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter PIN to confirm:", mask: true },
  ],
  {
    category: "send_money",
    direction: "debit",
    amountFrom: (v) => Number(v.amount),
    counterpartyFrom: (v) => `Agent ${v.agentCode}`,
    descriptionFrom: (v) => `Sent via agent ${v.agentCode}`,
  },
  (v) => `Confirmed.\nMWK ${v.amount} sent via agent ${v.agentCode}.\nRef: ${v.reference}\nBal: MWK${v.balanceAfter}`
);

// --- Balance / mini statement: read-only, but still hit CIS for real
// current data, not a hardcoded string. ---

const balanceFirst = "balPin";
const balanceNodes: NodeMap = {
  balPin: { type: "input", text: () => "Enter PIN:", store: "pin", mask: true, next: "balAction" },
  balAction: {
    type: "action",
    run: async ({ vars, accountId, api }) => {
      const pinCheck = await api.verifyPin(accountId, vars.pin ?? "");
      if (!pinCheck.valid) return { nextNodeId: "balDeclinePin" };
      const { balanceMWK } = await api.getBalance(accountId);
      return { nextNodeId: "balEnd", setVars: { balanceMWK: String(balanceMWK) } };
    },
  },
  balEnd: { type: "end", text: (v: Vars) => `Balance: MWK ${Number(v.balanceMWK).toLocaleString()}` },
  balDeclinePin: { type: "end", text: () => "Incorrect PIN." },
};

const statementFirst = "stmtPin";
const statementNodes: NodeMap = {
  stmtPin: { type: "input", text: () => "Enter PIN:", store: "pin", mask: true, next: "stmtAction" },
  stmtAction: {
    type: "action",
    run: async ({ vars, accountId, api }) => {
      const pinCheck = await api.verifyPin(accountId, vars.pin ?? "");
      if (!pinCheck.valid) return { nextNodeId: "stmtDeclinePin" };
      const txns = await api.getMiniStatement(accountId, 3);
      const lines = txns.map((t) => `${t.direction === "credit" ? "+" : "-"}MWK${t.amountMWK} ${t.description}`).join("\n");
      return { nextNodeId: "stmtEnd", setVars: { statementText: lines || "No recent transactions." } };
    },
  },
  stmtEnd: { type: "end", text: (v: Vars) => `Last 3 transactions:\n${v.statementText}` },
  stmtDeclinePin: { type: "end", text: () => "Incorrect PIN." },
};

// --- Illustrative-only flows: kept for menu realism and demo texture,
// but deliberately NOT wired to CIS — they don't correspond to any
// Evidence category Mphamvu Hub reads (loans, savings-within-wallet,
// bank linking, international transfer, cash-pickup codes, PIN
// management, registration). Wiring these would mean inventing schema
// that doesn't reflect anything real. References here are decorative. ---

const genRef = (): string => "AM" + Math.floor(100000 + Math.random() * 900000);

const [loanApply, loanApplyFirst] = mkInputChain(
  "loan",
  [
    { key: "amount", prompt: "Enter Loan Amount:" },
    { key: "pin", prompt: "Enter PIN to confirm:", mask: true },
  ],
  (v) => `Loan application for MWK ${v.amount} submitted.\nRef: ${genRef()}\nYou'll get an SMS on approval.\n(Illustrative — not a Mphamvu Evidence source)`
);

const [savingsDeposit, savingsDepositFirst] = mkInputChain(
  "savedep",
  [
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter PIN to confirm:", mask: true },
  ],
  (v) => `MWK ${v.amount} deposited into wallet savings.\nRef: ${genRef()}\n(Illustrative only)`
);

const [savingsWithdraw, savingsWithdrawFirst] = mkInputChain(
  "savewd",
  [
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter PIN to confirm:", mask: true },
  ],
  (v) => `MWK ${v.amount} withdrawn from wallet savings.\nRef: ${genRef()}\n(Illustrative only)`
);

const [savingsBalance, savingsBalanceFirst] = mkInputChain(
  "savebal",
  [{ key: "pin", prompt: "Enter PIN:", mask: true }],
  () => `Wallet savings balance: MWK 24,300.00\n(Illustrative only)`
);

const [bankLink, bankLinkFirst] = mkInputChain(
  "bank",
  [
    { key: "account", prompt: "Enter Bank Account Number:" },
    { key: "pin", prompt: "Enter PIN to confirm:", mask: true },
  ],
  (v) => `Account ${v.account} linked.\nRef: ${genRef()}\n(Illustrative only)`
);

const [changePin, changePinFirst] = mkInputChain(
  "pinchg",
  [
    { key: "oldPin", prompt: "Enter Old PIN:", mask: true },
    { key: "newPin", prompt: "Enter New PIN:", mask: true },
    { key: "confirmPin", prompt: "Confirm New PIN:", mask: true },
  ],
  (v) =>
    v.newPin === v.confirmPin
      ? "PIN changed successfully.\n(Illustrative — demo PIN 1234 unaffected)"
      : "PINs did not match. Please start over."
);

const [register, registerFirst] = mkInputChain(
  "reg",
  [
    { key: "idNumber", prompt: "Enter National ID Number:" },
    { key: "name", prompt: "Enter Full Name:" },
  ],
  (v) => `Registration submitted for ${v.name}.\n(Illustrative only)`
);

const [intlSend, intlSendFirst] = mkInputChain(
  "intl",
  [
    { key: "number", prompt: "Enter recipient number:" },
    { key: "amount", prompt: "Enter Amount:" },
    { key: "pin", prompt: "Enter PIN to confirm:", mask: true },
  ],
  (v) => `MWK ${v.amount} sent to ${v.number} in ${v.country}.\nRef: ${genRef()}\n(Illustrative only)`
);

const nodes: NodeMap = {
  main: {
    type: "menu",
    text: () =>
      "Airtel Money\n1. Buy Airtime/Bundle\n2. Send Money\n3. Make Payments\n4. Withdraw\n5. Financial Services\n6. Banks and Micro-Finance\n7. Account/PIN",
    options: {
      "1": "buyMenu", "2": "sendSelect", "3": "paymentsMenu", "4": "withdrawMenu",
      "5": "finMenu", "6": "banksMenu", "7": "accountMenu",
    },
  },
  buyMenu: { type: "menu", text: () => "1. Airtime\n2. Bundle", options: { "1": airtimeFirst, "2": "bundleMenu" } },
  bundleMenu: {
    type: "menu",
    text: () => "1. Daily 100MB - MWK500\n2. Weekly 500MB - MWK1500\n3. Monthly 2GB - MWK5000",
    options: {
      "1": { to: bundleFirst, set: { bundle: "Daily 100MB", bundleAmount: "500" } },
      "2": { to: bundleFirst, set: { bundle: "Weekly 500MB", bundleAmount: "1500" } },
      "3": { to: bundleFirst, set: { bundle: "Monthly 2GB", bundleAmount: "5000" } },
    },
  },
  sendSelect: {
    type: "menu",
    text: () => "Select:\n1. Airtel number\n2. Via Agent\n3. Outside Malawi",
    options: { "1": sendGenericFirst, "2": agentSendFirst, "3": "intlMenu" },
  },
  intlMenu: {
    type: "menu",
    text: () => "1. Zambia\n2. Tanzania\n3. Mozambique\n4. South Africa",
    options: {
      "1": { to: intlSendFirst, set: { country: "Zambia" } },
      "2": { to: intlSendFirst, set: { country: "Tanzania" } },
      "3": { to: intlSendFirst, set: { country: "Mozambique" } },
      "4": { to: intlSendFirst, set: { country: "South Africa" } },
    },
  },
  paymentsMenu: { type: "menu", text: () => "1. Pay Merchant\n2. Pay Bill\n3. Buy Goods", options: { "1": merchantPayFirst, "2": billPayFirst, "3": goodsPayFirst } },
  withdrawMenu: { type: "menu", text: () => "1. Withdraw at Agent\n2. Withdraw at ATM", options: { "1": agentWithdrawFirst, "2": atmWithdrawFirst } },
  finMenu: { type: "menu", text: () => "1. Loans\n2. Savings\n3. Link Bank Account", options: { "1": "loansMenu", "2": "savingsMenu", "3": bankLinkFirst } },
  loansMenu: { type: "menu", text: () => "1. Check Eligibility\n2. Apply for Loan", options: { "1": "loanEligibilityEnd", "2": loanApplyFirst } },
  loanEligibilityEnd: { type: "end", text: () => "You are eligible for a loan up to MWK 50,000.\n(Illustrative only)" },
  savingsMenu: { type: "menu", text: () => "1. Deposit\n2. Withdraw\n3. Check Balance", options: { "1": savingsDepositFirst, "2": savingsWithdrawFirst, "3": savingsBalanceFirst } },
  banksMenu: { type: "menu", text: () => "1. National Bank\n2. Standard Bank\n3. NBS Bank\n4. FDH Bank", options: {
    "1": { to: bankLinkFirst, set: { bank: "National Bank" } },
    "2": { to: bankLinkFirst, set: { bank: "Standard Bank" } },
    "3": { to: bankLinkFirst, set: { bank: "NBS Bank" } },
    "4": { to: bankLinkFirst, set: { bank: "FDH Bank" } },
  } },
  accountMenu: { type: "menu", text: () => "1. Check Balance\n2. Mini Statement\n3. Change PIN\n4. Register", options: { "1": balanceFirst, "2": statementFirst, "3": changePinFirst, "4": registerFirst } },
  expired: { type: "end", text: () => "Session expired.\nDial again to continue." },
  ...airtime, ...bundle, ...merchantPay, ...billPay, ...goodsPay,
  ...agentWithdraw, ...atmWithdraw, ...loanApply, ...savingsDeposit,
  ...savingsWithdraw, ...savingsBalance, ...bankLink,
  ...changePin, ...register, ...sendGeneric, ...agentSend, ...intlSend,
  ...balanceNodes, ...statementNodes,
};

export const airtelConfig: InstitutionConfig = {
  key: "airtel",
  displayName: "Airtel Money",
  institutionType: "telecom",
  dialCode: "*211#",
  brandColor: "#e30613",
  headerLabel: "Airtel",
  nodes,
  entryNodeId: "main",
};
