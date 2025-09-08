# Project Setup Guide

## How it was initialized (skip this part if you're not interested on knowing how the project was set up)
1. Create GitHub repo
2. Initialize npm project:
   ```bash
   npm init -y
   ```
   → creates `package.json`
3. Install dependencies:
   ```bash
   npm i --save-dev prisma typescript ts-node @types/node nodemon
   ```
4. Create `tsconfig.json`
5. Initialize Prisma:
   ```bash
   npx prisma init
   ```

### Prisma Migrations
- Define models in `schema.prisma`
- Run migration:
  ```bash
  npx prisma migrate dev --name init
  ```
- Install Prisma Client:
  ```bash
  npm i @prisma/client
  ```
- For new migrations:
  ```bash
  npx prisma migrate dev -n <migration_name>
  ```

### Prisma Seed
1. Create `prisma/seed.ts`
2. Run seed:
   ```bash
   npx prisma db seed
   ```
   → executes `prisma/seed.ts` via ts-node
3. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```
   → regenerates Prisma Client after schema changes

### Prisma GUI
```bash
npx prisma studio
```

---

## BACKEND – NestJS (skip this part if you want for the same reason as before)
We use NestJS because it supports TypeScript and provides robust functionality.

1. From root folder (`chez_huong`):
   ```bash
   nest new _tmp_api --skip-git --package-manager=npm
   ```
2. Copy files (except `package.json` and `node_modules`) into `/server`
3. Reference: [First steps | NestJS](https://docs.nestjs.com/first-steps)
4. Start server:
   ```bash
   npm run start
   ```
   → Server available at `http://localhost:3000` → *Hello World!*

### How NestJS Works
1. `main.ts` bootstraps the application using `AppModule`
2. `AppModule` defines what exists (modules, controllers, providers)
   - `AppController` → handles routes
   - `AppService` → provides injectable logic
3. `AppController` defines the application routes

### Connecting Prisma to NestJS
Follow the [Prisma + NestJS documentation](https://docs.nestjs.com/recipes/prisma) to integrate Prisma into the NestJS backend.
