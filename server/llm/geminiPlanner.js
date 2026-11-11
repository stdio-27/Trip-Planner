import { retrySeconds } from "../../shared/retryAfter.js";
import { extractJson } from "../extractJson.js";
import { buildTripPrompt, buildOptionsPrompt } from "../prompt.js";
import { parseOptions } from "../../shared/optionsSchema.js";
import { validateGeneratedPlan } from "../planSchema.js";
export function createGeminiPlanner({
  apiKey = undefined,
  getApiKey = () => apiKey,
  model: geminiModel,
  fetchImpl = fetch,
}) {
  return {
    generate: async function generate(tripDetails, isOptions) {
      const apiKey = getApiKey();
      const geminiTimeoutMs = 25000;
      let retryAfter;
      if (!apiKey) {
        return {
          status: 500,
          body: {
            error: "GEMINI_API_KEY is not configured.",
          },
          retryAfter: retryAfter,
        };
      }
      try {
        const url = new URL(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
        );
        const planResponseSchema = {
          type: "OBJECT",
          properties: {
            title: {
              type: "STRING",
            },
            currency: {
              type: "STRING",
            },
            days: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  label: {
                    type: "STRING",
                  },
                  stops: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: {
                        title: {
                          type: "STRING",
                        },
                        category: {
                          type: "STRING",
                          enum: [
                            "food",
                            "sight",
                            "activity",
                            "transport",
                            "stay",
                            "other",
                          ],
                        },
                        estCost: {
                          type: "NUMBER",
                        },
                        description: {
                          type: "STRING",
                        },
                        location: {
                          type: "STRING",
                        },
                        time: {
                          type: "STRING",
                        },
                      },
                      required: ["title", "category", "estCost"],
                    },
                  },
                },
                required: ["label", "stops"],
              },
            },
            packingList: {
              type: "ARRAY",
              items: {
                type: "STRING",
              },
            },
          },
          required: ["title", "currency", "days", "packingList"],
        };
        let returnedDays;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const response = await fetchImpl(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text:
                        (isOptions
                          ? buildOptionsPrompt(tripDetails)
                          : buildTripPrompt(tripDetails)) +
                        (attempt
                          ? isOptions
                            ? "\nCorrection: return the complete valid options object in the requested currency, with all three option groups."
                            : `\nCorrection: you returned ${returnedDays} days; return exactly ${tripDetails.days} day objects.`
                          : ""),
                    },
                  ],
                },
              ],
              generationConfig: {
                maxOutputTokens: 16384,
                responseMimeType: "application/json",
                ...(isOptions
                  ? {}
                  : {
                      responseSchema: planResponseSchema,
                    }),
              },
            }),
            signal: AbortSignal.timeout(geminiTimeoutMs),
          });
          if (!response.ok) {
            // Keep provider payloads and credentials out of browser errors and logs.
            console.error("Gemini API rejected request", {
              status: response.status,
              model: geminiModel,
            });
            const messages = {
              400: "Gemini rejected the request. Check the server API key and model configuration.",
              401: "Gemini authentication failed. Check GEMINI_API_KEY on the server.",
              403: "Gemini access denied. Check the API key permissions and project configuration.",
              404: `Gemini model ${geminiModel} is unavailable. Update GEMINI_MODEL and restart the server.`,
              429: "Gemini quota or rate limit reached. Check your Google AI quota and billing, then try again.",
            };
            if (response.status === 429)
              retryAfter = String(retrySeconds(response));
            return {
              status: response.status === 429 ? 429 : 502,
              body: {
                error:
                  messages[response.status] ??
                  "Gemini is temporarily unavailable. Please try again later.",
              },
              retryAfter: retryAfter,
            };
          }

          // Bound the upstream body before parsing or scanning model output.
          const reader = response.body.getReader();
          const chunks = [];
          let size = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 1_000_000) {
              await reader.cancel();
              return {
                status: 502,
                body: {
                  error: "Gemini response exceeded the size limit.",
                },
                retryAfter: retryAfter,
              };
            }
            chunks.push(Buffer.from(value));
          }
          const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          const generatedText = result.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? "")
            .join("")
            .trim();
          if (!generatedText) {
            if (attempt === 0) continue;
            return {
              status: 502,
              body: {
                error: "Gemini returned an empty response.",
              },
              retryAfter: retryAfter,
            };
          }
          const plan = extractJson(generatedText);
          if (!plan) {
            if (attempt === 0) continue;
            return {
              status: 502,
              body: {
                error:
                  "Gemini response did not contain a valid JSON itinerary.",
              },
              retryAfter: retryAfter,
            };
          }
          if (isOptions) {
            const parsed = parseOptions(plan);
            if (
              (!parsed.success ||
                parsed.data.currency !== tripDetails.currency) &&
              attempt === 0
            )
              continue;
            if (
              !parsed.success ||
              parsed.data.currency !== tripDetails.currency
            ) {
              return {
                status: 502,
                body: {
                  error: "Gemini returned invalid options.",
                },
                retryAfter: retryAfter,
              };
            }
            return {
              status: 200,
              body: parsed.data,
              retryAfter: retryAfter,
            };
          }
          returnedDays = plan.days?.length;
          if (
            Array.isArray(plan.days) &&
            plan.days.length > 0 &&
            plan.days.length !== tripDetails.days &&
            attempt === 0
          )
            continue;
          const validated = validateGeneratedPlan(plan, tripDetails);
          if (!validated.success) {
            return {
              status: 502,
              body: {
                error:
                  "Gemini returned an invalid itinerary shape, currency, or day count.",
              },
              retryAfter: retryAfter,
            };
          }
          return {
            status: 200,
            body: validated.data,
            retryAfter: retryAfter,
          };
        }
      } catch (error) {
        if (error?.name === "TimeoutError" || error?.name === "AbortError") {
          return {
            status: 504,
            body: {
              error: "Gemini API request timed out.",
            },
            retryAfter: retryAfter,
          };
        }
        console.error(
          "Trip plan generation failed:",
          error instanceof Error ? error.name : "UnknownError",
        );
        return {
          status: 502,
          body: {
            error: "Trip plan generation failed.",
          },
          retryAfter: retryAfter,
        };
      }
    },
  };
}
