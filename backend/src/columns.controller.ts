import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import { addColumn, dropColumn, isColumnType } from './db/column-ddl';

@Controller('columns')
export class ColumnsController {
  constructor(private readonly pool: Pool) {}

  // GET /api/columns -> [{ id: 1, name: 'Nom', type: 'text' }, ...] in display order
  @Get()
  async findAll() {
    const { rows } = await this.pool.query(
      'SELECT id, name, type FROM column_defs ORDER BY position',
    );
    return rows;
  }

  // POST /api/columns { name: 'Ville', type: 'text' } -> { id: 6, name: 'Ville', type: 'text' }
  // The new column goes last, and is empty for every contact.
  @Post()
  async create(@Body() body: { name?: unknown; type?: unknown }) {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (name === '') throw new BadRequestException('name is required');
    const type = body.type;
    if (!isColumnType(type)) {
      throw new BadRequestException('type must be text, number, date or phone');
    }
    const id = await this.transaction((client) => addColumn(client, name, type));
    return { id, name, type };
  }

  // DELETE /api/columns/6 -> 204 No Content, or 404 if there is no such column
  // Also deletes the values of that column in every contact.
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const found = await this.transaction((client) => dropColumn(client, id));
    if (!found) throw new NotFoundException();
  }

  // Runs `work` on one connection between BEGIN and COMMIT, so column_defs
  // and the contacts table change together or not at all.
  private async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release(); // give the connection back to the pool
    }
  }
}
