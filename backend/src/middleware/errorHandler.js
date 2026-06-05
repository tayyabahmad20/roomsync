import mongoose from "mongoose";
import { ApiError } from "../utils/apiError.js";

export function notFoundHandler(_req, _res, next) {
  next(new ApiError(404, "Route not found"));
}

export function errorHandler(err, _req, res, _next) {
  let statusCode = 500;
  let message = "Internal server error";
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err?.name === "ZodError") {
    statusCode = 400;
    message = "Validation error";
    details = err.errors;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation error";
    details = err.errors;
  } else if (err?.code === 11000) {
    statusCode = 409;
    message = "Duplicate key error";
    details = err.keyValue;
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  res.status(statusCode).json({
    ok: false,
    message,
    details
  });
}
