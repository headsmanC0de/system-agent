export const PRODUCTION_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

export const DEVELOPMENT_CSP =
  "default-src 'self' 'unsafe-inline' data: blob: http://localhost:* ws://localhost:*; connect-src 'self' http: https: ws: wss:; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
