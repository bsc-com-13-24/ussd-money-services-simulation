"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalRouter = void 0;
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const faker_1 = require("@faker-js/faker");
const data_source_1 = require("../db/data-source");
const SimulatedMember_1 = require("../entities/SimulatedMember");
const SimulatedAccount_1 = require("../entities/SimulatedAccount");
const SimulatedTransaction_1 = require("../entities/SimulatedTransaction");
const internalAuth_middleware_1 = require("../middleware/internalAuth.middleware");
exports.internalRouter = (0, express_1.Router)();
exports.internalRouter.use(internalAuth_middleware_1.internalAuth);
const DEMO_PIN = "1234";
function reference(institutionName) {
    const prefix = institutionName === "Airtel Money" ? "AM" : institutionName === "TNM Mpamba" ? "MP" : "TXN";
    return `${prefix}${faker_1.faker.string.alphanumeric({ length: 10, casing: "upper" })}`;
}
// POST /internal/members/lookup-or-create
// Mimics a real telecom auto-provisioning a wallet the first time a SIM
// dials the USSD code — this is the USSD simulator's "insert SIM" step.
exports.internalRouter.post("/members/lookup-or-create", async (req, res) => {
    const { phone, displayName, institutionType, institutionName, startingBalanceMWK } = req.body;
    if (!phone || !institutionType || !institutionName) {
        return res.status(400).json({
            error: { code: "validation_error", message: "phone, institutionType, and institutionName are required." },
        });
    }
    const memberRepo = data_source_1.AppDataSource.getRepository(SimulatedMember_1.SimulatedMember);
    const accountRepo = data_source_1.AppDataSource.getRepository(SimulatedAccount_1.SimulatedAccount);
    let member = await memberRepo.findOne({ where: { phone } });
    let isNewMember = false;
    if (!member) {
        isNewMember = true;
        member = await memberRepo.save(memberRepo.create({
            phone,
            displayName: displayName || "Mphamvu Youth",
            pinHash: await bcrypt_1.default.hash(DEMO_PIN, 10),
        }));
    }
    let account = await accountRepo.findOne({
        where: { memberId: member.id, institutionType, institutionName },
    });
    let isNewAccount = false;
    if (!account) {
        isNewAccount = true;
        account = await accountRepo.save(accountRepo.create({
            memberId: member.id,
            institutionType,
            institutionName,
            accountNumberMasked: `***-****-${faker_1.faker.number.int({ min: 1000, max: 9999 })}`,
            balanceMWK: startingBalanceMWK ?? faker_1.faker.number.int({ min: 5000, max: 20000 }),
        }));
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
exports.internalRouter.post("/accounts/:accountId/verify-pin", async (req, res) => {
    const { pin } = req.body;
    const account = await data_source_1.AppDataSource.getRepository(SimulatedAccount_1.SimulatedAccount).findOne({
        where: { id: req.params.accountId },
        relations: { member: true },
    });
    if (!account) {
        return res.status(404).json({ error: { code: "account_not_found", message: "No such account." } });
    }
    const valid = await bcrypt_1.default.compare(pin ?? "", account.member.pinHash);
    res.json({ valid });
});
// GET /internal/accounts/:accountId  — current balance + basic info
exports.internalRouter.get("/accounts/:accountId", async (req, res) => {
    const account = await data_source_1.AppDataSource.getRepository(SimulatedAccount_1.SimulatedAccount).findOne({ where: { id: req.params.accountId } });
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
exports.internalRouter.get("/accounts/:accountId/transactions", async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit ?? "5", 10), 20);
    const transactions = await data_source_1.AppDataSource.getRepository(SimulatedTransaction_1.SimulatedTransaction).find({
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
exports.internalRouter.post("/accounts/:accountId/transactions", async (req, res) => {
    const { category, direction, amountMWK, counterparty, description } = req.body;
    if (!category || !direction || !amountMWK || amountMWK <= 0) {
        return res.status(400).json({
            error: { code: "validation_error", message: "category, direction, and a positive amountMWK are required." },
        });
    }
    try {
        const result = await data_source_1.AppDataSource.transaction(async (manager) => {
            const account = await manager.findOne(SimulatedAccount_1.SimulatedAccount, { where: { id: req.params.accountId } });
            if (!account) {
                const err = new Error("account_not_found");
                err.code = "account_not_found";
                throw err;
            }
            const currentBalance = Number(account.balanceMWK);
            if (direction === "debit" && amountMWK > currentBalance) {
                const err = new Error("insufficient_funds");
                err.code = "insufficient_funds";
                throw err;
            }
            const balanceAfter = direction === "credit" ? currentBalance + amountMWK : currentBalance - amountMWK;
            const ref = reference(account.institutionName);
            const tx = manager.create(SimulatedTransaction_1.SimulatedTransaction, {
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
    }
    catch (err) {
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
