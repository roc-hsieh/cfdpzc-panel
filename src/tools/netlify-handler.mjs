import { handlePanel } from '../server.mjs';

/**
 * Netlify Function entry point.
 * Netlify invokes this exported `handler` with an event object.
 * We convert the event to a standard Request, delegate to the existing
 * panel handler, then translate the Response back to Netlify's format.
 */
export async function handler(event, context) {
  const url = new URL(event.rawUrl || `http://${event.headers.host}${event.path}`);
  const requestInit = {
    method: event.httpMethod,
    headers: event.headers,
    // Netlify supplies the raw body string; if it's base64‑encoded, it
    // will be decoded by the runtime when `isBase64Encoded` is true.
    body: event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body,
  };
  const request = new Request(url, requestInit);
  const response = await handlePanel(request);
  const responseBody = await response.text();
  const responseHeaders = {};
  for (const [key, value] of response.headers.entries()) {
    responseHeaders[key] = value;
  }
  return {
    statusCode: response.status,
    headers: responseHeaders,
    body: responseBody,
  };
}
