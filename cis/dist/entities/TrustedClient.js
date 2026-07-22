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
exports.TrustedClient = void 0;
const typeorm_1 = require("typeorm");
// Not typically written via the app at runtime — trusted clients are
// provisioned from the TRUSTED_CLIENTS env var (see config/env.ts) and
// mirrored here only if you want a persisted, queryable audit trail.
let TrustedClient = class TrustedClient {
};
exports.TrustedClient = TrustedClient;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], TrustedClient.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], TrustedClient.prototype, "clientId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], TrustedClient.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TrustedClient.prototype, "createdAt", void 0);
exports.TrustedClient = TrustedClient = __decorate([
    (0, typeorm_1.Entity)()
], TrustedClient);
