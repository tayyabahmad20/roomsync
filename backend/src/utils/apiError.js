export class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {any} details
   */
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}
