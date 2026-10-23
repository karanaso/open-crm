import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  IMAGE_STORAGE_DIR: z.string().min(1).default("./storage/listing-images"),
});

export const env = envSchema.parse(process.env);

export const appUrl = env.AUTH_URL ?? "http://localhost:3000";

export const imageStorageDir = path.resolve(process.cwd(), env.IMAGE_STORAGE_DIR);
