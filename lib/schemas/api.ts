import { z } from "zod";

export const evmAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address")
  .transform((v) => v.toLowerCase());

export const aiAnalyzeRequestSchema = z.object({
  address: evmAddressSchema,
});

export const profileAnalyzeRequestSchema = z.object({
  address: evmAddressSchema,
});

export const utilityAccessRequestSchema = z.object({
  address: evmAddressSchema,
  message: z.string().min(8).max(500),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature"),
  feature: z.enum([
    "unlimited_ai",
    "whale_alerts",
    "advanced_risk",
    "private_watchlists",
    "csv_exports",
    "custom_alerts",
    "premium_dashboards",
  ]),
});

export const profileParamsSchema = z.object({
  address: evmAddressSchema,
});

export const authNonceRequestSchema = z.object({
  address: evmAddressSchema,
});

export const authVerifyRequestSchema = z.object({
  address: evmAddressSchema,
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature"),
  nonce: z.string().min(8).max(128),
});
