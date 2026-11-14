import type { Server } from "node:http";
import type { Express } from "express";
import { httpHost } from "../config.js";

export function openHttpServer(app: Express, listenPort: number): Server {
  return app.listen(listenPort, httpHost);
}

export function stopServer(server: Server, closeDatabase: () => Promise<void>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  }).then(() => closeDatabase());
}
