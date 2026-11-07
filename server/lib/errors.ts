export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "UNVERIFIED_COMPANY"
  | "JOB_NOT_LINKABLE"
  | "POST_NOT_PUBLISHED"
  | "QUOTA_EXCEEDED"
  | "CONFIRM_REQUIRED"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthenticatedError extends ApiError {
  constructor(message = "Authentification requise.") {
    super(401, "UNAUTHENTICATED", message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Accès refusé.") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Ressource introuvable.") {
    super(404, "NOT_FOUND", message);
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Données invalides.", details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(409, "CONFLICT", message, details);
  }
}

export class UnverifiedCompanyError extends ApiError {
  constructor(message = "L'entreprise doit être revendiquée et vérifiée pour publier un post.") {
    super(403, "UNVERIFIED_COMPANY", message);
  }
}

export class JobNotLinkableError extends ApiError {
  constructor(message = "Le poste lié n'appartient pas à cette entreprise ou n'existe pas.") {
    super(400, "JOB_NOT_LINKABLE", message);
  }
}

export class PostNotPublishedError extends ApiError {
  constructor(message = "Cette action n'est possible que sur un post publié.") {
    super(409, "POST_NOT_PUBLISHED", message);
  }
}

export class QuotaExceededError extends ApiError {
  constructor(message = "Quota de lettres atteint pour aujourd'hui.") {
    super(429, "QUOTA_EXCEEDED", message);
  }
}

export class ConfirmRequiredError extends ApiError {
  constructor(message = "Confirmez explicitement l'envoi de la lettre.") {
    super(400, "CONFIRM_REQUIRED", message);
  }
}
