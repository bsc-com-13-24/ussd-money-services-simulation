import { app } from "./app";
import { env } from "./config/env";
import { AppDataSource } from "./db/data-source";
import { prepareSchemaForSynchronize } from "./db/pre-sync";

async function main() {
  await prepareSchemaForSynchronize();
  await AppDataSource.initialize();
  app.listen(env.port, () => {
    console.log(`CIS listening on port ${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start CIS:", err);
  process.exit(1);
});
