"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const data_source_1 = require("./db/data-source");
const pre_sync_1 = require("./db/pre-sync");
async function main() {
    await (0, pre_sync_1.prepareSchemaForSynchronize)();
    await data_source_1.AppDataSource.initialize();
    app_1.app.listen(env_1.env.port, () => {
        console.log(`CIS listening on port ${env_1.env.port}`);
    });
}
main().catch((err) => {
    console.error("Failed to start CIS:", err);
    process.exit(1);
});
