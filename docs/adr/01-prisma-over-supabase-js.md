# Use Prisma as the ORM; Supabase is only the Postgres host

The database is hosted on Supabase, which tempts the assumption that the server should also use `supabase-js` (PostgREST) as its data-access layer. We keep **Prisma** instead, connecting directly to the Supabase Postgres via `DATABASE_URL`/`DIRECT_URL`. Supabase provides the Postgres instance (and unused Auth/Storage/Realtime); Prisma is how the Node server reads and writes it. The two are complementary, not competing.

## Why not supabase-js

- **No client-side transactions / nested inserts.** Saving a recipe is a single nested write (recipe → ingredient sections → ingredients, → step sections → steps, → particularities), and updates wrap delete-then-recreate in a `$transaction`. PostgREST has no multi-statement transactions and no multi-table nested insert; replicating atomicity would mean rewriting the write path as a `plpgsql` RPC function.
- **No migrations.** Prisma owns schema-as-code (`schema.prisma` + `migrate dev`). `supabase-js` would push migrations to hand-managed SQL or the dashboard.
- **Weaker types on deep joins.** Recipe reads include four levels of relations; Prisma types this fully, PostgREST embedding does not.

## Why not TypeORM (or another ORM)

NestJS docs reach for TypeORM first via `@nestjs/typeorm`, but Prisma is the better fit here:

- **Types hold up on deep joins.** Recipe reads include four levels of relations; Prisma's generated client types those fully. TypeORM's relation typings degrade quickly as joins nest.
- **Schema-as-code in one file.** `schema.prisma` is the single source of truth. TypeORM scatters the schema across `@Entity` / `@Column` / `@OneToMany` decorators on class files, coupling persistence metadata to whatever class shape happens to live there.
- **Migration tooling is stronger.** `prisma migrate dev` round-trips schema edits to SQL reliably. TypeORM's migration generation has long-running known issues.
- **Maintenance signal.** Prisma ships frequently with a paid backer; TypeORM has had multi-month maintenance gaps and a persistent bug backlog.

Query builders (Kysely, Drizzle) or raw `pg` would also work, but at the cost of writing the schema and migration story by hand — not worth it for a CRUD-shaped server.

## Revisit if

We move to a Backend-as-a-Service shape — client talking directly to Supabase with Row-Level-Security and Realtime. Then `supabase-js` becomes the right tool. As long as a Node API owns the data access, Prisma stays.
