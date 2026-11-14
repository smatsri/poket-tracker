import { join } from "node:path";
import express from "express";
import { clientOrigin } from "./config.js";
import { errorDocument, errorHandler } from "./http/errors.js";
import { takeFailure } from "./http/failure.js";
import { playerRouter } from "./routes/players.js";
import { sessionRouter } from "./routes/sessions.js";

export function clientDistDirectory(): string {
  return join(__dirname, "../../client/dist");
}

export function createApp(options: { clientDist?: string } = {}): express.Express {
  const clientDist = options.clientDist ?? clientDistDirectory();
  const app = express();

  app.get("/health", (_req, res) => {
    res.status(200).type("text/plain").send("ok");
  });

  app.use((req, res, next) => {
    const origin = req.header("Origin");
    if (origin === clientOrigin) {
      res.setHeader("Access-Control-Allow-Origin", clientOrigin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }

    if (req.method === "OPTIONS") {
      res.sendStatus(origin === clientOrigin ? 204 : 403);
      return;
    }

    next();
  });

  app.use(express.json());
  app.use((_req, _res, next) => {
    const failure = takeFailure();
    if (failure) {
      next(failure);
      return;
    }
    next();
  });
  app.use("/api/players", playerRouter);
  app.use("/api/sessions", sessionRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json(errorDocument("NOT_FOUND", "Not found"));
  });

  app.use(express.static(clientDist, { index: "index.html", fallthrough: true }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    res.sendFile(join(clientDist, "index.html"), (error) => {
      if (error) {
        next(error);
      }
    });
  });

  app.use(errorHandler);

  return app;
}
