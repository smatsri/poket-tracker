import { Router } from "express";
import { parse, playerCreateRequest } from "../schemas.js";
import { createPlayer, listPlayers } from "../services/playerService.js";

export const playerRouter = Router();

playerRouter.get("/", async (_req, res) => {
  res.status(200).json({ players: await listPlayers() });
});

playerRouter.post("/", async (req, res) => {
  const body = parse(playerCreateRequest, req.body);
  res.status(201).json(await createPlayer(body.name));
});
