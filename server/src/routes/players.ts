import { Router } from "express";
import { parse, playerCreateRequest } from "../schemas.js";
import { createPlayer, listPlayers } from "../services/playerService.js";

export const playerRouter = Router();

playerRouter.get("/", (_req, res) => {
  res.status(200).json({ players: listPlayers() });
});

playerRouter.post("/", (req, res) => {
  const body = parse(playerCreateRequest, req.body);
  res.status(201).json(createPlayer(body.name));
});
