import { Router } from "express";
import { parse, sessionCreateRequest } from "../schemas.js";
import { submitSession } from "../services/sessionService.js";

export const sessionRouter = Router();

sessionRouter.post("/", (req, res) => {
  const result = submitSession(parse(sessionCreateRequest, req.body));
  res.status(result.status).json(result.session);
});
