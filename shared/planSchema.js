import { z } from "zod";

// Shared transport boundary; client normalization can salvage individual stops.
export const planEnvelopeSchema = z.object({
  title: z.string().trim().min(1).max(1000),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  days: z.array(z.object({
    label: z.string().trim().min(1).max(200),
    stops: z.array(z.unknown()).max(50),
  })).max(30),
  packingList: z.array(z.unknown()).max(200).nullish(),
});
