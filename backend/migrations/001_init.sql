-- Each row describes a column in contact.
-- column_defs.<id> <=> contacts.col_<id>
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
