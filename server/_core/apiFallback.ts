import type { RequestHandler } from "express";

export const apiNotFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({ error: "Endpoint de API não encontrado." });
};
