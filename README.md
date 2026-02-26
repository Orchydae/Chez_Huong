# Chez Huong

## Architecture Diagrams
The architecture and design diagrams (Class, Use Case, Deployment, Package, and Bounded Context) can be found in the [`/docs/diagrams`](./docs/diagrams) directory.

## Getting Started with Docker (Recommended)
You can easily spin up the application and its databases using Docker.

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Start the application and dependencies:
   ```bash
   docker compose up -d --build
   ```
3. Stop the application:
   ```bash
   docker compose down
   ```

## Local Development (Without Docker)

### Build the App
Navigate to the `server` directory, install dependencies, and build:
```bash
cd server
npm install
npm run build
```

### Run the Tests
To run the automated test suite:
```bash
cd server
npm run test
```

## Prisma Database Commands
When working locally in the `server` directory, here are the essential Prisma commands you will use:

- **Run migrations**: `npx prisma migrate dev`
- **Generate Prisma Client**: `npx prisma generate`
- **Seed the database**: `npx prisma db seed`
- **Open Prisma Studio UI**: `npx prisma studio`
