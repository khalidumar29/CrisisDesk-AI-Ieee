import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(404, "ROUTE_NOT_FOUND", `Route ${request.method} ${request.path} was not found.`));
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "The request contains invalid data.",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    response.status(409).json({
      success: false,
      code: "DATABASE_CONFLICT",
      message: "The operation conflicts with stored data.",
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred.",
  });
};
