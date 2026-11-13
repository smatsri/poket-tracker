import { Router } from "express";
import { identifier, parse, sessionCreateRequest, sessionListQuery } from "../schemas.js";
import { getSession, listSessions, submitSession } from "../services/sessionService.js";

export const sessionRouter = Router();

sessionRouter.get("/", async (req, res) => {
  const query = parse(sessionListQuery, req.query);
  res.status(200).json({ sessions: await listSessions(query) });
});

sessionRouter.get("/:sessionId", async (req, res) => {
  const sessionId = parse(identifier, req.params.sessionId);
  res.status(200).json(await getSession(sessionId));
});

sessionRouter.post("/", async (req, res) => {
  const result = await submitSession(parse(sessionCreateRequest, req.body));
  res.status(result.status).json(result.session);
});
