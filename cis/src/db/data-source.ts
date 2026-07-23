import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env";
import { SimulatedMember } from "../entities/SimulatedMember";
import { SimulatedAccount } from "../entities/SimulatedAccount";
import { SimulatedTransaction } from "../entities/SimulatedTransaction";
import { TrustedClient } from "../entities/TrustedClient";
import { RequestLog } from "../entities/RequestLog";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.databaseUrl,
  synchronize: true, // fine for a 48-hour hackathon build; use migrations post-hackathon
  logging: false,
  entities: [SimulatedMember, SimulatedAccount, SimulatedTransaction, TrustedClient, RequestLog],
});
