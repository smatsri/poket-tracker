import { Router } from "express";
import { identifier, parse, sessionCreateRequest, sessionListQuery } from "../schemas.js";
import { getSession, listSessions, submitSession } from "../services/sessionService.js";

export const sessionRouter = Router();

sessionRouter.get("/", (req, res) => {
  const query = parse(sessionListQuery, req.query);
  res.status(200).json({ sessions: listSessions(query) });
});

sessionRouter.get("/:sessionId", (req, res) => {
  const sessionId = parse(identifier, req.params.sessionId);
  res.status(200).json(getSession(sessionId));
});

sessionRouter.post("/", (req, res) => {
  const result = submitSession(parse(sessionCreateRequest, req.body));
  res.status(result.status).json(result.session);
});
