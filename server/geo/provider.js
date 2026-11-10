import { z } from "zod";

const upstreamPlace = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  country_code: z.string().length(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  admin1: z.string().max(200).optional(),
  admin2: z.string().max(200).optional(),
  feature_code: z.string().max(20).optional(),
  population: z.number().int().nonnegative().optional(),
});
const payload = z
  .object({
    results: z.array(upstreamPlace).max(10).optional(),
    generationtime_ms: z.number().optional(),
    error: z.literal(false).optional(),
  })
  .strict();

/** @typedef {z.output<typeof upstreamPlace>} ProviderPlace */
/** @typedef {{ search: (query: string) => Promise<ProviderPlace[]> }} GeoProvider */
export function createOpenMeteoProvider(fetchImpl = fetch, timeoutMs = 5000) {
  return {
    async search(query) {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.search = new URLSearchParams({
        name: query,
        count: "10",
        language: "en",
        countryCode: "IN",
        format: "json",
      }).toString();
      const response = await fetchImpl(url, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw Error("Geocoding service rejected request");
      return payload.parse(await response.json()).results ?? [];
    },
  };
}
