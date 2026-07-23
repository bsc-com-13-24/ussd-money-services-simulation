"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionsRouter = void 0;
const express_1 = require("express");
const data_source_1 = require("../db/data-source");
const SimulatedMember_1 = require("../entities/SimulatedMember");
const clientAuth_middleware_1 = require("../middleware/clientAuth.middleware");
const consent_middleware_1 = require("../middleware/consent.middleware");
exports.transactionsRouter = (0, express_1.Router)();
// GET /v1/transactions?phone=+265...&institutionType=telecom&since=2026-01-01
// The single exposed endpoint. Both clientAuth (layer 1) and
// requireConsent (layer 2) must pass before this handler ever runs.
exports.transactionsRouter.get("/transactions", clientAuth_middleware_1.clientAuth, (0, consent_middleware_1.requireConsent)("read:transactions"), async (req, res) => {
    const phone = req.query.phone;
    const institutionType = req.query.institutionType;
    const since = req.query.since ? new Date(req.query.since) : undefined;
    const memberRepo = data_source_1.AppDataSource.getRepository(SimulatedMember_1.SimulatedMember);
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
    const accounts = member.accounts.filter((a) => !institutionType || a.institutionType === institutionType);
    const transactions = accounts
        .flatMap((account) => account.transactions
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
    })))
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
});
