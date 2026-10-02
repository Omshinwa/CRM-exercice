// DDL - Data Definition Language
// this contains functions that change the structure of the DB ot just the data in it

import { type ClientBase } from 'pg';

export type ColumnType = 'text' | 'number' | 'date' | 'phone';

// Postgres type of the physical column backing each grid column type.
const SQL_TYPES: Record<ColumnType, string> = {
  text: 'text',
  number: 'double precision',
  date: 'date',
  phone: 'text', // E.164, e.g. +33612345678
};

// 1 -> "col_1"
// columns in the contact table are named col_1, col_2 etc they correspond to
// id 1, 2 in the column_defs
export function colIdent(id: number): string {
  if (!Number.isInteger(id) || id <= 0) throw new Error(`invalid column id: ${id}`);
  return `col_${id}`;
}

// Call inside a transaction so the INSERT and the ALTER TABLE succeed or fail
// together (DDL is transactional in Postgres).
export async function addColumn(
  client: ClientBase,
  name: string,
  type: ColumnType,
): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO column_defs (name, type, position)
     VALUES ($1, $2, (SELECT COALESCE(MAX(position) + 1, 0) FROM column_defs))
     RETURNING id`,
    [name, type],
  );
  const { id } = rows[0];
  await client.query(`ALTER TABLE contacts ADD COLUMN ${colIdent(id)} ${SQL_TYPES[type]}`);
  return id;
}
