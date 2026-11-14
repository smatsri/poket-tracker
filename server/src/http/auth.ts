import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export const operatorUsername = "operator";
export const authenticateHeader = 'Basic realm="Poker Tracker"';

export function isProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "production";
}

export function configuredPassword(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const password = env.APP_PASSWORD;
  if (password === undefined || password.length === 0) {
    return undefined;
  }

  return password;
}

export function authGateEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return isProduction(env) || configuredPassword(env) !== undefined;
}

export function assertProductionPassword(env: NodeJS.ProcessEnv = process.env): void {
  if (isProduction(env) && configuredPassword(env) === undefined) {
    throw new Error("APP_PASSWORD is required in production");
  }
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function sameDigest(left: string, right: string): boolean {
  return timingSafeEqual(sha256(left), sha256(right));
}

function basicCredentials(header: string | undefined): { username: string; password: string } | undefined {
  if (header === undefined || !header.startsWith("Basic ")) {
    return undefined;
  }

  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) {
    return undefined;
  }

  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

export function requireOperator(password: string | undefined): RequestHandler {
  return (req, res, next) => {
    const credentials = basicCredentials(req.header("Authorization"));
    const username = credentials?.username ?? "";
    const providedPassword = credentials?.password ?? "";
    const usernameMatches = sameDigest(username, operatorUsername);
    const passwordMatches = password !== undefined && sameDigest(providedPassword, password);

    if (!usernameMatches || !passwordMatches) {
      if (req.path.startsWith("/api")) {
        res.setHeader("Cache-Control", "no-store");
      }
      res.setHeader("WWW-Authenticate", authenticateHeader);
      res.status(401).type("text/plain").send("Unauthorized");
      return;
    }

    next();
  };
}
