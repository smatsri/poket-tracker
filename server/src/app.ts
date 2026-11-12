import express from "express";
import { clientOrigin } from "./config.js";

export function createApp(): express.Express {
  const app = express();

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

  app.use("/api", (_req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Not found",
      },
    });
  });

  return app;
}
