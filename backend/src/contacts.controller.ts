import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Pool } from 'pg';
import { colIdent, type ColumnType } from './db/column-ddl';

// { id: 1, col_1: 'Jean', col_3: null } -> { id: 1, values: { '1': 'Jean', '3': null } }
// `values` is keyed by column id, so the client never sees the col_<id> names.
function toContact({ id, ...cols }: Record<string, unknown>) {
  return {
    id,
    values: Object.fromEntries(
      Object.entries(cols).map(([name, value]) => [name.slice('col_'.length), value]),
    ),
  };
}

// Checks a value sent for a cell of the given type and returns what to store.
// null or '' empties the cell.
function parseValue(type: ColumnType, value: unknown): string | number | null {
  if (value === null || value === '') return null;
  if (type === 'text' && typeof value === 'string') return value;
  if (type === 'number' && typeof value === 'number' && Number.isFinite(value)) return value;
  if (type === 'date' && typeof value === 'string' && isDay(value)) return value;
  if (type === 'phone' && typeof value === 'string') {
    // Numbers without a country code are read as French: 06 12 34 56 78.
    // extract: false, so '0612345678abc' is refused instead of losing 'abc'.
    const phone = parsePhoneNumberFromString(value, { defaultCountry: 'FR', extract: false });
    // E.164 (+33612345678) has no room for an extension, so refuse one.
    if (phone?.isValid() && !phone.ext) return phone.number;
  }
  throw new BadRequestException(`invalid ${type}: ${JSON.stringify(value)}`);
}

// '2026-02-28' -> true. '2026-02-30' -> false: JS would roll it over to March 2,
// so the day must come back unchanged.
function isDay(value: string): boolean {
  const time = Date.parse(value);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(time) &&
    new Date(time).toISOString().slice(0, 10) === value
  );
}

@Controller('contacts')
export class ContactsController {
  constructor(private readonly pool: Pool) {}

  // GET /api/contacts? limit=50 & sort=5 & dir=desc & afterId=42 & afterValue=17
  //   -> [{ id: 1, values: { '1': 'Jean Dupont', ... } }, ...]
  // Rows are ordered by the `sort` column (empty cells last), then by id.
  // Paging uses a cursor: afterId/afterValue are the id and sort value of the
  // last row the client already has (no afterValue when that cell is empty),
  // and the page starts right after it. Unlike OFFSET, adding or deleting
  // contacts while scrolling does not shift the next pages.
  @Get()
  async findAll(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('sort', new ParseIntPipe({ optional: true })) sort: number | undefined,
    @Query('dir', new DefaultValuePipe('asc')) dir: string,
    @Query('afterId', new ParseIntPipe({ optional: true })) afterId: number | undefined,
    @Query('afterValue') afterValue: string | undefined,
  ) {
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be between 1 and 100');
    }
    if (dir !== 'asc' && dir !== 'desc') {
      throw new BadRequestException('dir must be asc or desc');
    }

    const params: unknown[] = [];
    let where = '';
    let orderBy = 'id';
    if (sort !== undefined) {
      const { rowCount } = await this.pool.query('SELECT 1 FROM column_defs WHERE id = $1', [
        sort,
      ]);
      if (rowCount === 0) throw new BadRequestException(`unknown column: ${sort}`);
      const col = colIdent(sort);
      orderBy = `${col} ${dir} NULLS LAST, id`;
      if (afterId !== undefined) {
        params.push(afterId); // $1
        if (afterValue === undefined) {
          // The last row had an empty cell: only empty cells (sorted last) remain.
          where = `WHERE ${col} IS NULL AND id > $1`;
        } else {
          // Postgres converts the text of $2 to the column's type (number, date...).
          params.push(afterValue); // $2
          where = `WHERE ${col} ${dir === 'asc' ? '>' : '<'} $2
                      OR (${col} = $2 AND id > $1)
                      OR ${col} IS NULL`;
        }
      }
    } else if (afterId !== undefined) {
      params.push(afterId);
      where = 'WHERE id > $1';
    }
    params.push(limit);

    const { rows } = await this.pool.query(
      `SELECT * FROM contacts ${where} ORDER BY ${orderBy} LIMIT $${params.length}`,
      params,
    );
    return rows.map(toContact);
  }

  // POST /api/contacts -> { id: 501, values: { '1': null, ... } }
  // Creates a contact with every cell empty; the grid then fills it in.
  @Post()
  async create() {
    const { rows } = await this.pool.query('INSERT INTO contacts DEFAULT VALUES RETURNING *');
    return toContact(rows[0]);
  }

  // PUT /api/contacts/12/values/3 { value: '06 12 34 56 78' }
  //   -> { id: 12, values: { '1': 'Jean Dupont', '3': '+33612345678', ... } }
  // Sets one cell. Returns the whole contact, with the value as stored.
  @Put(':id/values/:columnId')
  async setValue(
    @Param('id', ParseIntPipe) id: number,
    @Param('columnId', ParseIntPipe) columnId: number,
    @Body() body: { value?: unknown },
  ) {
    const { rows: columns } = await this.pool.query<{ type: ColumnType }>(
      'SELECT type FROM column_defs WHERE id = $1',
      [columnId],
    );
    if (columns.length === 0) throw new NotFoundException(`unknown column: ${columnId}`);
    const value = parseValue(columns[0].type, body?.value);
    const { rows } = await this.pool.query(
      `UPDATE contacts SET ${colIdent(columnId)} = $1 WHERE id = $2 RETURNING *`,
      [value, id],
    );
    if (rows.length === 0) throw new NotFoundException(`unknown contact: ${id}`);
    return toContact(rows[0]);
  }

  // DELETE /api/contacts/12 -> 204 No Content, or 404 if there is no such contact
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const { rowCount } = await this.pool.query('DELETE FROM contacts WHERE id = $1', [id]);
    if (rowCount === 0) throw new NotFoundException();
  }
}
