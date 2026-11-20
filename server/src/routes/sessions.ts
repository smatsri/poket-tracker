import { Router } from "express";
import { identifier, parse, sessionCreateRequest, sessionListQuery } from "../schemas.js";
import { archiveSession, getSession, listSessions, removeSession, restoreSession, submitSession } from "../services/sessionService.js";

export const sessionRouter = Router();

sessionRouter.get("/", async (req, res) => {
  const query = parse(sessionListQuery, req.query);
  res.status(200).json({ sessions: await listSessions(query) });
});

sessionRouter.get("/:sessionId", async (req, res) => {
  const sessionId = parse(identifier, req.params.sessionId);
  res.status(200).json(await getSession(sessionId));
});

sessionRouter.post("/:sessionId/archive", async (req, res) => {
  const sessionId = parse(identifier, req.params.sessionId);
  res.status(200).json(await archiveSession(sessionId));
});

sessionRouter.post("/:sessionId/restore", async (req, res) => {
  const sessionId = parse(identifier, req.params.sessionId);
  res.status(200).json(await restoreSession(sessionId));
});

sessionRouter.delete("/:sessionId", async (req, res) => {
  const sessionId = parse(identifier, req.params.sessionId);
  await removeSession(sessionId);
  res.status(204).send();
});

sessionRouter.post("/", async (req, res) => {
  const result = await submitSession(parse(sessionCreateRequest, req.body));
  res.status(result.status).json(result.session);
});
