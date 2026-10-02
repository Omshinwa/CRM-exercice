AI suggested me:

1 JSON per contact.
Adding a column = 1 insert, no schema change. Sort/filter casts the JSON value by column type

or

1 row per CELL

I asked why cant we make a relational table with 1 row per contact too?

Faker is a library that makes up fake but realistic-looking data.

# Data model

- `column_defs` holds the type of each grid column (name, type, position).
  Each row owns a real column `contacts.col_<id>`, whose SQL type comes from
  `SQL_TYPES` in `backend/src/db/column-ddl.ts`.
- Why: Postgres enforces the value types (it rejects `'abc'` in a number or date
  column), and sorting and filtering work on native types without casts.
  Renaming and reordering a column only update `column_defs`.
  Baserow stores data the same way (`field_<id>` columns plus a metadata table).
- Column names in SQL are built only from the numeric id and escaped
  (`colIdent`), never from user input.

Rejected alternatives:

# LIMITATION

phone numbers are stored as `text`, so the API has to validate them (libphonenumber)

no pool of database connections kept open and reused

adding or deleting a column runs `ALTER TABLE` at runtime, which briefly locks `contacts` (fine at this scale)

Postgres caps a table at 1600 columns, dropped columns included.

# AI use

Used to set up the environment (vite, the modules etc..)

afterId and afterValue vs OFFSET

docker compose exec backend npm run seed:small

# Observer API

The Intersection Observer API provides a way to asynchronously observe changes in the intersection of a target element with an ancestor element
. For example, if we want to detect if some element is visible in the viewport we can use this API for that purpose.
