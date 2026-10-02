-- Metadata of the grid columns. Each row owns a physical column
-- contacts.col_<id> whose SQL type depends on `type` (see src/db/column-ddl.ts).
CREATE TABLE column_defs (
  id       serial PRIMARY KEY,
  name     text NOT NULL,
  type     text NOT NULL CHECK (type IN ('text', 'number', 'date', 'phone')),
  position int  NOT NULL
);

-- One row per contact. Value columns are added at runtime by addColumn().
CREATE TABLE contacts (
  id serial PRIMARY KEY
);
