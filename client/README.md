# Chez Huong Client

This is the frontend application for Chez Huong, built with React, TypeScript, and Vite.

## Setup

1. **Install Dependencies**:
   Navigate to the `client` directory and install the required packages:
   ```bash
   cd client
   npm install
   ```

2. **Environment Variables**:
   Ensure you have a `.env` file in the `client` directory with the following configuration:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

## Development

To run the application in development mode with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will be available at the URL provided in the terminal (usually `http://localhost:5173`).

## Production

To build the application for production:

```bash
npm run build
```

The output will be in the `dist` directory.

## Linting

To run the linter:

```bash
npm run lint
```
