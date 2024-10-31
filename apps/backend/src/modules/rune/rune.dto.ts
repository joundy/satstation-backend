import { z } from "zod";
import { hexSchema } from "../../utils/validation";

const bigintString = z
  .string()
  .regex(/^\d+$/)
  .transform((val) => BigInt(val));

export const EtchingRequestSchema = z.object({
  feeRate: z.number().int().default(1),
  runeName: z.string(),
  maxSupply: bigintString,
  userTapInternalKeyHex: hexSchema,
  divisibility: z.number().int().min(0).max(18).optional(),
  symbol: z.string().optional(),
  dataHex: hexSchema.optional(),
  dataMimeType: z.string().optional(),
  pricePerRune: z.string().default("0"),
  nearCreatorAddress: z.string().default(""),
});
export type EtchingRequest = z.infer<typeof EtchingRequestSchema>;

export const WithdrawRequestSchema = z.object({
  feeRate: z.number().int().default(1),
  runeName: z.string(),
  nearAccountAddress: z.string(),
  withdrawAddress: z.string(),
  paymentAddress: z.string(),
});
export type WithdrawRequest = z.infer<typeof WithdrawRequestSchema>;
