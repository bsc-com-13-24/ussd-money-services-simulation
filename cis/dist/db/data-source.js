"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const env_1 = require("../config/env");
const SimulatedMember_1 = require("../entities/SimulatedMember");
const SimulatedAccount_1 = require("../entities/SimulatedAccount");
const SimulatedTransaction_1 = require("../entities/SimulatedTransaction");
const TrustedClient_1 = require("../entities/TrustedClient");
const RequestLog_1 = require("../entities/RequestLog");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    url: env_1.env.databaseUrl,
    synchronize: true, // fine for a 48-hour hackathon build; use migrations post-hackathon
    logging: false,
    entities: [SimulatedMember_1.SimulatedMember, SimulatedAccount_1.SimulatedAccount, SimulatedTransaction_1.SimulatedTransaction, TrustedClient_1.TrustedClient, RequestLog_1.RequestLog],
});
