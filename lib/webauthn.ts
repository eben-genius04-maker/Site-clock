// Shared WebAuthn config. rpID must be the bare domain (no protocol, no port)
// that the app is served from — "localhost" in dev, your real domain once
// deployed. expectedOrigin must match exactly what the browser sends,
// including the port for local dev.

export function getRpID(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
}

export function getExpectedOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const RP_NAME = "SiteClock";