"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulatedTransaction = void 0;
const typeorm_1 = require("typeorm");
const SimulatedAccount_1 = require("./SimulatedAccount");
let SimulatedTransaction = class SimulatedTransaction {
};
exports.SimulatedTransaction = SimulatedTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], SimulatedTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SimulatedAccount_1.SimulatedAccount, (account) => account.transactions, { onDelete: "CASCADE" }),
    __metadata("design:type", SimulatedAccount_1.SimulatedAccount)
], SimulatedTransaction.prototype, "account", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SimulatedTransaction.prototype, "accountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar" }),
    __metadata("design:type", String)
], SimulatedTransaction.prototype, "direction", void 0);
__decorate([
    (0, typeorm_1.Column)("numeric"),
    __metadata("design:type", Number)
], SimulatedTransaction.prototype, "amountMWK", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar" }),
    __metadata("design:type", String)
], SimulatedTransaction.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SimulatedTransaction.prototype, "counterparty", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SimulatedTransaction.prototype, "reference", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SimulatedTransaction.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz" }),
    __metadata("design:type", Date)
], SimulatedTransaction.prototype, "occurredAt", void 0);
__decorate([
    (0, typeorm_1.Column)("numeric"),
    __metadata("design:type", Number)
], SimulatedTransaction.prototype, "balanceAfter", void 0);
exports.SimulatedTransaction = SimulatedTransaction = __decorate([
    (0, typeorm_1.Entity)()
], SimulatedTransaction);
