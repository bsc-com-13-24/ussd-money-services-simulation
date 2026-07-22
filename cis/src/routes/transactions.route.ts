import { Router, Request, Response } from "express";
import { AppDataSource } from "../db/data-source";
import { SimulatedMember } from "../entities/SimulatedMember";
import { clientAuth } from "../middleware/clientAuth.middleware";
import { requireConsent } from "../middleware/consent.middleware";
import { InstitutionType } from "../entities/SimulatedAccount";

export const transactionsRouter = Router();

// GET /v1/transactions?phone=+265...&institutionType=telecom&since=2026-01-01
// The single exposed endpoint. Both clientAuth (layer 1) and
// requireConsent (layer 2) must pass before this handler ever runs.
transactionsRouter.get(
  "/transactions",
  clientAuth,
  requireConsent("read:transactions"),
  async (req: Request, res: Response) => {
    const phone = req.query.phone as string;
    const institutionType = req.query.institutionType as InstitutionType | undefined;
    const since = req.query.since ? new Date(req.query.since as string) : undefined;

    const memberRepo = AppDataSource.getRepository(SimulatedMember);
    const member = await memberRepo.findOne({
      where: { phone },
      relations: { accounts: { transactions: true } },
    });

    if (!member) {
      req.checkResult = "member_not_found";
      return res.status(404).json({
        error: { code: "member_not_found", message: "No simulated member exists for this phone number." },
      });
    }

    const accounts = member.accounts.filter(
      (a) => !institutionType || a.institutionType === institutionType
    );

    const transactions = accounts
      .flatMap((account) =>
        account.transactions
          .filter((tx) => !since || tx.occurredAt >= since)
          .map((tx) => ({
            institutionType: account.institutionType,
            direction: tx.direction,
            amountMWK: Number(tx.amountMWK),
            category: tx.category,
            counterparty: tx.counterparty,
            reference: tx.reference,
            description: tx.description,
            occurredAt: tx.occurredAt.toISOString(),
            balanceAfter: Number(tx.balanceAfter),
          }))
      )
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

    res.json({
      member: { phone: member.phone },
      accounts: accounts.map((a) => ({
        institutionType: a.institutionType,
        institutionName: a.institutionName,
        accountNumberMasked: a.accountNumberMasked,
      })),
      transactions,
    });
  }
);
