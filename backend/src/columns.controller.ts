import { Controller, Get } from '@nestjs/common';
import { Pool } from 'pg';

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
}
