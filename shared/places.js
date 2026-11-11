import { z } from "zod";

const hubIds = {
  airportId: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  stationCode: z
    .string()
    .regex(/^[A-Z0-9-]{1,16}$/)
    .nullable(),
};
const point = {
  stateCode: z.string().regex(/^\d{1,3}$/),
  lat: z.number().min(6).max(38),
  lon: z.number().min(68).max(98),
};
export const originSchema = z.strictObject({
  ...point,
  ...hubIds,
  district: z.string().trim().min(1).max(100),
});
export const destinationSchema = z.strictObject({
  ...point,
  ...hubIds,
  placeName: z.string().trim().min(1).max(100),
});
