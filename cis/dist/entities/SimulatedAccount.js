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
exports.SimulatedAccount = void 0;
const typeorm_1 = require("typeorm");
const SimulatedMember_1 = require("./SimulatedMember");
const SimulatedTransaction_1 = require("./SimulatedTransaction");
let SimulatedAccount = class SimulatedAccount {
};
exports.SimulatedAccount = SimulatedAccount;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], SimulatedAccount.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SimulatedMember_1.SimulatedMember, (member) => member.accounts, { onDelete: "CASCADE" }),
    __metadata("design:type", SimulatedMember_1.SimulatedMember)
], SimulatedAccount.prototype, "member", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SimulatedAccount.prototype, "memberId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar" }),
    __metadata("design:type", String)
], SimulatedAccount.prototype, "institutionType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SimulatedAccount.prototype, "institutionName", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SimulatedAccount.prototype, "accountNumberMasked", void 0);
__decorate([
    (0, typeorm_1.Column)("numeric", { default: 0 }),
    __metadata("design:type", Number)
], SimulatedAccount.prototype, "balanceMWK", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SimulatedAccount.prototype, "openedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => SimulatedTransaction_1.SimulatedTransaction, (tx) => tx.account),
    __metadata("design:type", Array)
], SimulatedAccount.prototype, "transactions", void 0);
exports.SimulatedAccount = SimulatedAccount = __decorate([
    (0, typeorm_1.Entity)()
], SimulatedAccount);
