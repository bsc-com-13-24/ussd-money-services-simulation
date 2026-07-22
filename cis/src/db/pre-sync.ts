import { Client } from "pg";
import { env } from "../config/env";

const DEMO_PIN_HASH = "$2b$10$w2./sGfBINcdC3spCrX7cee2o.9YpyYzswYUuJWvzdjTrfUvyXuxa";

export async function prepareSchemaForSynchronize() {
  const client = new Client({ connectionString: env.databaseUrl });

  await client.connect();
  try {
    await prepareSimulatedMember(client);
    await prepareSimulatedTransaction(client);
  } finally {
    await client.end();
  }
}

async function tableExists(client: Client, tableName: string) {
  const table = await client.query<{ exists: string | null }>("select to_regclass($1) as exists", [`public.${tableName}`]);
  return Boolean(table.rows[0]?.exists);
}

async function columnExists(client: Client, tableName: string, columnName: string) {
  const column = await client.query(
    `
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
    `,
    [tableName, columnName]
  );
  return column.rowCount !== 0;
}

async function prepareSimulatedMember(client: Client) {
  if (!(await tableExists(client, "simulated_member"))) return;

  if (!(await columnExists(client, "simulated_member", "pinHash"))) {
    await client.query(`alter table "simulated_member" add column "pinHash" character varying`);
  }

  await client.query(`update "simulated_member" set "pinHash" = $1 where "pinHash" is null`, [DEMO_PIN_HASH]);
  await client.query(`alter table "simulated_member" alter column "pinHash" set not null`);
}

async function prepareSimulatedTransaction(client: Client) {
  if (!(await tableExists(client, "simulated_transaction"))) return;

  if (!(await columnExists(client, "simulated_transaction", "reference"))) {
    await client.query(`alter table "simulated_transaction" add column "reference" character varying`);
  }

  await client.query(`
    update "simulated_transaction"
    set "reference" = 'LEGACY' || upper(substr(replace("id"::text, '-', ''), 1, 10))
    where "reference" is null
  `);

  await client.query(`alter table "simulated_transaction" alter column "reference" set not null`);
}
