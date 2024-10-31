import * as z from "zod";

export const postgresUrlSchema = z
  .string()
  .url()
  .refine((url) => {
    try {
      const parsedUrl = new URL(url);
      return (
        parsedUrl.protocol === "postgres:" ||
        parsedUrl.protocol === "postgresql:"
      );
    } catch {
      return false;
    }
  }, "Invalid PostgreSQL URL")
  .refine((url) => {
    const parsedUrl = new URL(url);
    return !!parsedUrl.hostname && !!parsedUrl.pathname.slice(1); // Ensure hostname and database name are present
  }, "PostgreSQL URL must include hostname and database name");

export const hexSchema = z
  .string()
  .regex(/^[0-9A-Fa-f]+$/, "Must be valid hex");
