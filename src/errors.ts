/**
 * Error thrown when required placeholders are missing from translation values
 */
export class InvalidPlaceholderError extends Error {
  /**
   * Array of missing placeholder names
   */
  public readonly missingPlaceholders: string[];

  /**
   * The original message template that contained the placeholders
   */
  public readonly template: string;

  constructor(missingPlaceholders: string[], template: string) {
    const placeholderList = missingPlaceholders.join(", ");
    super(
      `Missing required placeholder(s): ${placeholderList}. Message: "${template}"`
    );
    this.name = "InvalidPlaceholderError";
    this.missingPlaceholders = missingPlaceholders;
    this.template = template;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidPlaceholderError);
    }
  }
}
