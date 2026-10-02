import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { Pool } from 'pg';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly pool: Pool) {}

  // GET /api/contacts?limit=10 -> [{ id: 1, values: { '1': 'Jean Dupont', ... } }, ...]
  // `values` is keyed by column id, so the client never sees the col_<id> names.
  @Get()
  async findAll(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be between 1 and 100');
    }
    const { rows } = await this.pool.query('SELECT * FROM contacts ORDER BY id LIMIT $1', [
      limit,
    ]);
    return rows.map(({ id, ...cols }) => ({
      id,
      values: Object.fromEntries(
        Object.entries(cols).map(([name, value]) => [name.slice('col_'.length), value]),
      ),
    }));
  }
}
