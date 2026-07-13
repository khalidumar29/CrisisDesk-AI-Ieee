export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Report not found.") {
    super(404, "NOT_FOUND", message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication is required.") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class AiServiceError extends AppError {
  constructor(message = "AI classification failed. Please try again.") {
    super(503, "AI_SERVICE_UNAVAILABLE", message);
  }
}
