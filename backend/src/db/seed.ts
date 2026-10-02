// Create fake users
// Usage:
//   npm run seed         full reset: drop everything, migrate, insert demo data
//   npm run db:init      migrate, then insert demo data only if the database is empty
// SEED_COUNT sets the number of contacts (500 by default).
// From the host: make seed, or make seed COUNT=10

import { fakerFR as faker } from '@faker-js/faker';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Client } from 'pg';
import { addColumn, colIdent, type ColumnType } from './column-ddl';
import { runMigrations } from './migrate';

// || rather than ??: `make seed` without COUNT passes an empty SEED_COUNT.
const SEED_COUNT = Number(process.env.SEED_COUNT || 500);
// Proportion of empty cells in optional column.
const EMPTY_RATE = 0.1;

type SeedColumn = {
  name: string;
  type: ColumnType;
  required?: boolean;
  fake: () => string | number;
};

const DEFAULT_COLUMNS: SeedColumn[] = [
  { name: 'Nom', type: 'text', required: true, fake: () => faker.person.fullName() },
  { name: 'Entreprise', type: 'text', fake: () => faker.company.name() },
  { name: 'Téléphone', type: 'phone', fake: fakePhone },
  { name: 'Date', type: 'date', fake: fakeDate },
  { name: 'Score', type: 'number', fake: () => faker.number.int({ min: 0, max: 100 }) },
];

// Not every number faker formats is valid for libphonenumber, so retry.
function fakePhone(): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const phone = parsePhoneNumberFromString(faker.phone.number(), 'FR');
    if (phone?.isValid()) return phone.number; // E.164
  }
  throw new Error('could not generate a valid phone number');
}

function fakeDate(): string {
  return faker.date.between({ from: '2023-01-01', to: new Date() }).toISOString().slice(0, 10);
}

async function populate(client: Client): Promise<void> {
  const ids: number[] = [];
  for (const column of DEFAULT_COLUMNS) {
    ids.push(await addColumn(client, column.name, column.type));
  }

  const insert = `INSERT INTO contacts (${ids.map((id) => colIdent(id)).join(', ')})
                  VALUES (${ids.map((_, i) => `$${i + 1}`).join(', ')})`;
  for (let i = 0; i < SEED_COUNT; i++) {
    const values = DEFAULT_COLUMNS.map((column) =>
      !column.required && faker.datatype.boolean(EMPTY_RATE) ? null : column.fake(),
    );
    await client.query(insert, values);
  }
}

async function main(): Promise<void> {
  if (!Number.isInteger(SEED_COUNT) || SEED_COUNT < 1) {
    throw new Error(`invalid SEED_COUNT: ${process.env.SEED_COUNT}`);
  }
  const ifEmpty = process.argv.includes('--if-empty');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    if (!ifEmpty) {
      // Recreating the tables also resets Postgres's count of dropped columns.
      await client.query('DROP TABLE IF EXISTS contacts, column_defs, schema_migrations');
      console.log('database reset');
    }
    await runMigrations(client);

    if (ifEmpty) {
      const { rows } = await client.query<{ empty: boolean }>(
        `SELECT NOT EXISTS (SELECT 1 FROM column_defs)
            AND NOT EXISTS (SELECT 1 FROM contacts) AS empty`,
      );
      if (!rows[0].empty) {
        console.log('already seeded, skipping');
        return;
      }
    }

    // One transaction: either all columns and contacts are created, or none.
    try {
      await client.query('BEGIN');
      await populate(client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
    console.log(`seeded ${DEFAULT_COLUMNS.length} columns, ${SEED_COUNT} contacts`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
