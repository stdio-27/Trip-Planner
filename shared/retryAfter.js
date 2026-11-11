export function retrySeconds(response, now = Date.now()) {
  const value = response.headers?.get("Retry-After");
  if (!value) return 60;
  const seconds = /^\d+$/.test(value) ? Number(value) : (Date.parse(value) - now) / 1000;
  return Number.isFinite(seconds) ? Math.max(1, Math.min(86400, Math.ceil(seconds))) : 60;
}
export const cooldownMessage = (seconds) => `Too many requests, try again in ${seconds} seconds.`;
