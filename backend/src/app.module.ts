import { Module } from '@nestjs/common';
import { Pool, types } from 'pg';
import { ColumnsController } from './columns.controller';
import { ContactsController } from './contacts.controller';

// Dates at local midnight, which can shift the day once serialized to JSON.
types.setTypeParser(types.builtins.DATE, (value) => value);

@Module({
  controllers: [ColumnsController, ContactsController],
  providers: [
    // One set of open connections shared by all requests. A controller gets it
    // by declaring `pool: Pool` in its constructor.
    { provide: Pool, useValue: new Pool({ connectionString: process.env.DATABASE_URL }) },
  ],
})
export class AppModule {}
