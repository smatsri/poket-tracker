export const httpHost = "0.0.0.0";

export function httpPort(env: { PORT?: string } = process.env): number {
  return Number(env.PORT ?? "3001");
}

export const port = httpPort();

export const databaseUrl = process.env.DATABASE_URL;

export const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
