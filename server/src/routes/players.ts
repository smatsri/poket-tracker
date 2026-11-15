import { Router } from "express";
import { identifier, parse, playerCreateRequest } from "../schemas.js";
import { createPlayer, listPlayers, removePlayer, renamePlayer } from "../services/playerService.js";

export const playerRouter = Router();

playerRouter.get("/", async (_req, res) => {
  res.status(200).json({ players: await listPlayers() });
});

playerRouter.post("/", async (req, res) => {
  const body = parse(playerCreateRequest, req.body);
  res.status(201).json(await createPlayer(body.name));
});

playerRouter.patch("/:playerId", async (req, res) => {
  const playerId = parse(identifier, req.params.playerId);
  const body = parse(playerCreateRequest, req.body);
  res.status(200).json(await renamePlayer(playerId, body.name));
});

playerRouter.delete("/:playerId", async (req, res) => {
  const playerId = parse(identifier, req.params.playerId);
  await removePlayer(playerId);
  res.status(204).send();
});
