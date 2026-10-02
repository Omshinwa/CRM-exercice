import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Pool } from 'pg';
import { colIdent } from './db/column-ddl';

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

@Controller('contacts')
export class ContactsController {
  constructor(private readonly pool: Pool) {}

  // GET /api/contacts?limit=50&sort=5&dir=desc&afterId=42&afterValue=17
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

  // DELETE /api/contacts/12 -> 204 No Content, or 404 if there is no such contact
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const { rowCount } = await this.pool.query('DELETE FROM contacts WHERE id = $1', [id]);
    if (rowCount === 0) throw new NotFoundException();
  }
}
