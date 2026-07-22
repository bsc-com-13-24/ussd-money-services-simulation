"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const faker_1 = require("@faker-js/faker");
const data_source_1 = require("../db/data-source");
const pre_sync_1 = require("../db/pre-sync");
const SimulatedMember_1 = require("../entities/SimulatedMember");
const SimulatedAccount_1 = require("../entities/SimulatedAccount");
const SimulatedTransaction_1 = require("../entities/SimulatedTransaction");
const personas_1 = require("./personas");
// Deterministic per phone number: re-running the seed for the same
// persona produces the same history. Critical so a live demo doesn't
// show different numbers between rehearsal and judging.
function seedFor(phone) {
    let hash = 0;
    for (const ch of phone)
        hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    faker_1.faker.seed(hash);
}
// Mirrors the real *444# Mpamba / Airtel Money menu: Buy Airtime, Send
// Money, Cash Out, Pay Bill — plus the credit-side events (someone sends
// TO this member, or they deposit cash at an agent) that don't appear as
// a menu item themselves but populate a real statement constantly.
const TELECOM_TEMPLATES = [
    { category: "receive_money", direction: "credit", frequencyDays: 6, range: [500, 6000] },
    { category: "cash_in", direction: "credit", frequencyDays: 21, range: [3000, 15000] },
    { category: "send_money", direction: "debit", frequencyDays: 5, range: [500, 5000] },
    { category: "buy_airtime", direction: "debit", frequencyDays: 6, range: [200, 1000] },
    { category: "buy_bundle", direction: "debit", frequencyDays: 10, range: [500, 3000] },
    { category: "cash_out", direction: "debit", frequencyDays: 14, range: [2000, 15000] },
    { category: "pay_bill", direction: "debit", frequencyDays: 30, range: [2000, 9000] },
];
// A bank statement narrates differently — salary batches, merchant card
// payments, standing orders — not USSD menu actions.
const BANK_TEMPLATES = [
    { category: "salary_credit", direction: "credit", frequencyDays: 30, range: [35000, 90000] },
    { category: "merchant_payment", direction: "debit", frequencyDays: 5, range: [500, 8000] },
    { category: "atm_withdrawal", direction: "debit", frequencyDays: 14, range: [2000, 15000] },
    { category: "savings_transfer", direction: "debit", frequencyDays: 7, range: [500, 2000] },
];
function fakeMalawiPhone(institutionName) {
    // Airtel Malawi numbers commonly start 099; TNM (Mpamba) numbers 088/089/098.
    const prefix = institutionName === "Airtel Money" ? "099" : faker_1.faker.helpers.arrayElement(["088", "089", "098"]);
    return `0${prefix.slice(1)}${faker_1.faker.string.numeric(7)}`;
}
function reference(institutionName) {
    const prefix = institutionName === "Airtel Money" ? "AM" : institutionName === "TNM Mpamba" ? "MP" : "TXN";
    return `${prefix}${faker_1.faker.string.alphanumeric({ length: 10, casing: "upper" })}`;
}
const AGENT_NAMES = ["Chikondi Mobile Money Agent", "Blessings General Dealers", "Zomba Trading Centre Agent", "Mzuzu Kwik Cash Agent"];
const BILLERS = ["ESCOM Prepaid", "Lilongwe Water Board", "Zuku Internet", "MRA Vehicle Licence", "DSTV Subscription"];
function describeTelecomTransaction(category, institutionName, amount, balance, ref, counterpartyPhone, counterpartyName) {
    const bal = `Bal: MWK${balance.toLocaleString()}`;
    switch (category) {
        case "buy_airtime":
            return { description: `Airtime purchase of MWK${amount.toLocaleString()} successful. Ref: ${ref}. ${bal}`, counterparty: "Self" };
        case "buy_bundle":
            return { description: `Data bundle purchase of MWK${amount.toLocaleString()} successful. Ref: ${ref}. ${bal}`, counterparty: "Self" };
        case "send_money":
            return {
                description: `You have sent MWK${amount.toLocaleString()} to ${counterpartyPhone}. Ref: ${ref}. ${bal}`,
                counterparty: `${counterpartyPhone} (${counterpartyName})`,
            };
        case "receive_money":
            return {
                description: `You have received MWK${amount.toLocaleString()} from ${counterpartyPhone}. Ref: ${ref}. ${bal}`,
                counterparty: `${counterpartyPhone} (${counterpartyName})`,
            };
        case "cash_in": {
            const agent = faker_1.faker.helpers.arrayElement(AGENT_NAMES);
            return { description: `Cash deposit of MWK${amount.toLocaleString()} at ${agent}. Ref: ${ref}. ${bal}`, counterparty: agent };
        }
        case "cash_out": {
            const agent = faker_1.faker.helpers.arrayElement(AGENT_NAMES);
            return { description: `Cash withdrawal of MWK${amount.toLocaleString()} at ${agent}. Ref: ${ref}. ${bal}`, counterparty: agent };
        }
        case "pay_bill": {
            const biller = faker_1.faker.helpers.arrayElement(BILLERS);
            return { description: `Bill payment of MWK${amount.toLocaleString()} to ${biller}. Ref: ${ref}. ${bal}`, counterparty: biller };
        }
        case "merchant_payment": {
            const merchant = faker_1.faker.company.name();
            return { description: `Payment of MWK${amount.toLocaleString()} to merchant ${merchant}. Ref: ${ref}. ${bal}`, counterparty: merchant };
        }
    }
}
function describeBankTransaction(category, amount) {
    switch (category) {
        case "salary_credit": {
            const employer = faker_1.faker.company.name();
            return { description: `SALARY PAYMENT - ${employer.toUpperCase()}`, counterparty: employer };
        }
        case "merchant_payment": {
            const merchant = faker_1.faker.company.name();
            return { description: `POS PURCHASE - ${merchant.toUpperCase()}`, counterparty: merchant };
        }
        case "atm_withdrawal":
            return { description: `ATM CASH WITHDRAWAL`, counterparty: "ATM" };
        case "savings_transfer":
            return { description: `TRANSFER TO SAVINGS ACCOUNT`, counterparty: "Own savings account" };
    }
}
async function seedMember(persona) {
    const memberRepo = data_source_1.AppDataSource.getRepository(SimulatedMember_1.SimulatedMember);
    const accountRepo = data_source_1.AppDataSource.getRepository(SimulatedAccount_1.SimulatedAccount);
    const txRepo = data_source_1.AppDataSource.getRepository(SimulatedTransaction_1.SimulatedTransaction);
    seedFor(persona.phone);
    let member = await memberRepo.findOne({ where: { phone: persona.phone } });
    if (!member) {
        member = await memberRepo.save(memberRepo.create({ phone: persona.phone, displayName: persona.displayName }));
    }
    const monthsOfHistory = 6;
    const historyStart = new Date();
    historyStart.setMonth(historyStart.getMonth() - monthsOfHistory);
    for (const acctDef of persona.accounts) {
        let account = await accountRepo.findOne({
            where: { memberId: member.id, institutionType: acctDef.institutionType },
        });
        if (!account) {
            account = await accountRepo.save(accountRepo.create({
                memberId: member.id,
                institutionType: acctDef.institutionType,
                institutionName: acctDef.institutionName,
                accountNumberMasked: `***-****-${faker_1.faker.number.int({ min: 1000, max: 9999 })}`,
                openedAt: historyStart,
            }));
        }
        const templates = acctDef.institutionType === "telecom" ? TELECOM_TEMPLATES : BANK_TEMPLATES;
        const transactions = [];
        for (const template of templates) {
            let cursor = new Date(historyStart);
            const now = new Date();
            while (cursor < now) {
                if (faker_1.faker.number.float({ min: 0, max: 1 }) <= persona.consistency) {
                    const amount = faker_1.faker.number.int({ min: template.range[0], max: template.range[1] });
                    const ref = reference(acctDef.institutionName);
                    const counterpartyPhone = fakeMalawiPhone(acctDef.institutionName);
                    const counterpartyName = faker_1.faker.person.fullName();
                    const { description, counterparty } = acctDef.institutionType === "telecom"
                        ? describeTelecomTransaction(template.category, acctDef.institutionName, amount, 0, // balance filled in after chronological pass below
                        ref, counterpartyPhone, counterpartyName)
                        : describeBankTransaction(template.category, amount);
                    transactions.push({
                        accountId: account.id,
                        direction: template.direction,
                        amountMWK: amount,
                        category: template.category,
                        counterparty,
                        reference: ref,
                        description,
                        occurredAt: new Date(cursor),
                        balanceAfter: 0, // recomputed below in true chronological order
                    });
                }
                cursor.setDate(cursor.getDate() + template.frequencyDays);
            }
        }
        transactions.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
        // Recompute running balance in true chronological order, then rewrite
        // the balance mentioned in each telecom description so the "Bal:"
        // figure in the confirmation text actually matches balanceAfter.
        let runningBalance = faker_1.faker.number.int({ min: 5000, max: 20000 });
        for (const tx of transactions) {
            runningBalance += tx.direction === "credit" ? tx.amountMWK : -tx.amountMWK;
            tx.balanceAfter = Math.max(runningBalance, 0);
            if (acctDef.institutionType === "telecom" && tx.description?.includes("Bal: MWK")) {
                tx.description = tx.description.replace(/Bal: MWK[\d,]+/, `Bal: MWK${tx.balanceAfter.toLocaleString()}`);
            }
        }
        await txRepo.delete({ accountId: account.id }); // idempotent re-seed
        await txRepo.save(transactions.map((tx) => txRepo.create(tx)));
        // The account's own balanceMWK is the single source of truth the
        // live USSD simulator reads and writes against — it must end up
        // matching the last seeded transaction's balanceAfter, not some
        // unrelated random number, or "history" and "today's balance"
        // would visibly disagree the moment someone dials in.
        const finalBalance = transactions.length ? transactions[transactions.length - 1].balanceAfter : Number(account.balanceMWK);
        account.balanceMWK = finalBalance;
        await accountRepo.save(account);
        console.log(`Seeded ${transactions.length} transactions for ${persona.displayName} (${acctDef.institutionName}) — balance now MWK${finalBalance.toLocaleString()}`);
    }
}
async function main() {
    await (0, pre_sync_1.prepareSchemaForSynchronize)();
    await data_source_1.AppDataSource.initialize();
    for (const persona of personas_1.DEMO_PERSONAS) {
        await seedMember(persona);
    }
    await data_source_1.AppDataSource.destroy();
    console.log("Seed complete.");
}
main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
