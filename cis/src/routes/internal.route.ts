import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import { AppDataSource } from "../db/data-source";
import { SimulatedMember } from "../entities/SimulatedMember";
import { SimulatedAccount, InstitutionType } from "../entities/SimulatedAccount";
import { SimulatedTransaction, TxCategory, TxDirection } from "../entities/SimulatedTransaction";
import { internalAuth } from "../middleware/internalAuth.middleware";

export const internalRouter = Router();
internalRouter.use(internalAuth);

const DEMO_PIN = "1234";

function reference(institutionName: string): string {
  const prefix = institutionName === "Airtel Money" ? "AM" : institutionName === "TNM Mpamba" ? "MP" : "TXN";
  return `${prefix}${faker.string.alphanumeric({ length: 10, casing: "upper" })}`;
}

// POST /internal/members/lookup-or-create
// Mimics a real telecom auto-provisioning a wallet the first time a SIM
// dials the USSD code — this is the USSD simulator's "insert SIM" step.
internalRouter.post("/members/lookup-or-create", async (req: Request, res: Response) => {
  const { phone, displayName, institutionType, institutionName, startingBalanceMWK } = req.body as {
    phone: string;
    displayName?: string;
    institutionType: InstitutionType;
    institutionName: string;
    startingBalanceMWK?: number;
  };

  if (!phone || !institutionType || !institutionName) {
    return res.status(400).json({
      error: { code: "validation_error", message: "phone, institutionType, and institutionName are required." },
    });
  }

  const memberRepo = AppDataSource.getRepository(SimulatedMember);
  const accountRepo = AppDataSource.getRepository(SimulatedAccount);

  let member = await memberRepo.findOne({ where: { phone } });
  let isNewMember = false;
  if (!member) {
    isNewMember = true;
    member = await memberRepo.save(
      memberRepo.create({
        phone,
        displayName: displayName || "Mphamvu Youth",
        pinHash: await bcrypt.hash(DEMO_PIN, 10),
      })
    );
  }

  let account = await accountRepo.findOne({
    where: { memberId: member.id, institutionType, institutionName },
  });
  let isNewAccount = false;
  if (!account) {
    isNewAccount = true;
    account = await accountRepo.save(
      accountRepo.create({
        memberId: member.id,
        institutionType,
        institutionName,
        accountNumberMasked: `***-****-${faker.number.int({ min: 1000, max: 9999 })}`,
        balanceMWK: startingBalanceMWK ?? faker.number.int({ min: 5000, max: 20000 }),
      })
    );
  }

  res.json({
    memberId: member.id,
    accountId: account.id,
    phone: member.phone,
    balanceMWK: Number(account.balanceMWK),
    accountNumberMasked: account.accountNumberMasked,
    isNewMember,
    isNewAccount,
  });
});

// POST /internal/accounts/:accountId/verify-pin
internalRouter.post("/accounts/:accountId/verify-pin", async (req: Request, res: Response) => {
  const { pin } = req.body as { pin: string };
  const account = await AppDataSource.getRepository(SimulatedAccount).findOne({
    where: { id: req.params.accountId },
    relations: { member: true },
  });
  if (!account) {
    return res.status(404).json({ error: { code: "account_not_found", message: "No such account." } });
  }
  const valid = await bcrypt.compare(pin ?? "", account.member.pinHash);
  res.json({ valid });
});

// GET /internal/accounts/:accountId  — current balance + basic info
internalRouter.get("/accounts/:accountId", async (req: Request, res: Response) => {
  const account = await AppDataSource.getRepository(SimulatedAccount).findOne({ where: { id: req.params.accountId } });
  if (!account) {
    return res.status(404).json({ error: { code: "account_not_found", message: "No such account." } });
  }
  res.json({
    accountId: account.id,
    institutionName: account.institutionName,
    accountNumberMasked: account.accountNumberMasked,
    balanceMWK: Number(account.balanceMWK),
  });
});

// GET /internal/accounts/:accountId/transactions?limit=5  — for mini statement
internalRouter.get("/accounts/:accountId/transactions", async (req: Request, res: Response) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? "5", 10), 20);
  const transactions = await AppDataSource.getRepository(SimulatedTransaction).find({
    where: { accountId: req.params.accountId },
    order: { occurredAt: "DESC" },
    take: limit,
  });
  res.json({
    transactions: transactions.map((tx) => ({
      direction: tx.direction,
      amountMWK: Number(tx.amountMWK),
      category: tx.category,
      description: tx.description,
      reference: tx.reference,
      occurredAt: tx.occurredAt.toISOString(),
      balanceAfter: Number(tx.balanceAfter),
    })),
  });
});

// POST /internal/accounts/:accountId/transactions
// The single write path for anything the USSD simulator does. Runs the
// balance check and the transaction insert inside one DB transaction so
// a crash mid-request can never leave balanceMWK and the transaction
// history disagreeing with each other.
internalRouter.post("/accounts/:accountId/transactions", async (req: Request, res: Response) => {
  const { category, direction, amountMWK, counterparty, description } = req.body as {
    category: TxCategory;
    direction: TxDirection;
    amountMWK: number;
    counterparty: string;
    description: string;
  };

  if (!category || !direction || !amountMWK || amountMWK <= 0) {
    return res.status(400).json({
      error: { code: "validation_error", message: "category, direction, and a positive amountMWK are required." },
    });
  }

  try {
    const result = await AppDataSource.transaction(async (manager) => {
      const account = await manager.findOne(SimulatedAccount, { where: { id: req.params.accountId } });
      if (!account) {
        const err: any = new Error("account_not_found");
        err.code = "account_not_found";
        throw err;
      }

      const currentBalance = Number(account.balanceMWK);
      if (direction === "debit" && amountMWK > currentBalance) {
        const err: any = new Error("insufficient_funds");
        err.code = "insufficient_funds";
        throw err;
      }

      const balanceAfter = direction === "credit" ? currentBalance + amountMWK : currentBalance - amountMWK;
      const ref = reference(account.institutionName);

      const tx = manager.create(SimulatedTransaction, {
        accountId: account.id,
        direction,
        amountMWK,
        category,
        counterparty: counterparty || "Unknown",
        reference: ref,
        description: description || category,
        occurredAt: new Date(),
        balanceAfter,
      });
      await manager.save(tx);

      account.balanceMWK = balanceAfter;
      await manager.save(account);

      return { reference: ref, balanceAfter, occurredAt: tx.occurredAt.toISOString() };
    });

    res.status(201).json(result);
  } catch (err: any) {
    if (err.code === "account_not_found") {
      return res.status(404).json({ error: { code: "account_not_found", message: "No such account." } });
    }
    if (err.code === "insufficient_funds") {
      return res.status(409).json({ error: { code: "insufficient_funds", message: "Balance too low for this transaction." } });
    }
    console.error(err);
    res.status(500).json({ error: { code: "internal_error", message: "Something went wrong." } });
  }
});
