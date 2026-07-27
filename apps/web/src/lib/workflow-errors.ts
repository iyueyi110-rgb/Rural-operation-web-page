export class WorkflowConflictError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_TRANSITION"
      | "VERSION_CONFLICT" = "INVALID_TRANSITION",
  ) {
    super(message)
  }
}
