NestJS is a framework for building server-side (backend) applications with Node.js, written in TypeScript.

Plain Node frameworks like Express are minimal: they handle HTTP and leave the app's structure up to you. NestJS sits on top of Express (or Fastify) and adds a fixed architecture.

`@Controller('columns')` marks the class as an HTTP controller and gives it the route prefix `columns`.

`@Get()` on `findAll()` handles `GET` requests on that prefix. You can pass it a sub-path, e.g. `@Get(':id')`.

# @Get(':id')

@Get(':id') adds a route parameter. The :id part matches one path segment, and you read it with @Param:

```ts
@Get(':id')
async findOne(@Param('id', ParseIntPipe) id: number) {
  const { rows } = await this.pool.query('SELECT ... WHERE id = $1', [id]);
  if (rows.length === 0) throw new NotFoundException();
  return rows[0];
}
```