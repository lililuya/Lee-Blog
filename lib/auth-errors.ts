export class AuthFlowError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(input: {
    code: string;
    message: string;
    status?: number;
    details?: Record<string, unknown>;
  }) {
    super(input.message);
    this.name = "AuthFlowError";
    this.code = input.code;
    this.status = input.status ?? 400;
    this.details = input.details;
  }
}

export function isAuthFlowError(error: unknown): error is AuthFlowError {
  return error instanceof AuthFlowError;
}
