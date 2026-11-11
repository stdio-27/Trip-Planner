/** @param {import("express").Response} res
 * @param {{status?:number,body?:any,raw?:string,contentType?:string,retryAfter?:string|number}} result */
export function sendResult(res, result) {
  res.status(result.status ?? 200);
  if (result.retryAfter !== undefined)
    res.set("Retry-After", String(result.retryAfter));
  if (result.raw !== undefined) {
    res.type(result.contentType ?? "application/json").send(result.raw);
    return;
  }
  if (result.body === undefined) {
    res.end();
    return;
  }
  res.json(result.body);
}
