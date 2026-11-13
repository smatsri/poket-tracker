export const port = Number(process.env.PORT ?? "3001");

export const databaseUrl = process.env.DATABASE_URL;

export const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
