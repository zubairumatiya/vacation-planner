const GOOGLE_CLIENT_ID =
  "191976318949-1et61pfo2d5dgjfp62iogt8it7kit6mb.apps.googleusercontent.com";
const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/generative-language.retriever",
].join(" ");
const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;

const SESSION_KEYS = {
  codeVerifier: "googleOAuthCodeVerifier",
  tripId: "googleOAuthTripId",
} as const;

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function startGoogleOAuth(tripId: string): Promise<void> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  sessionStorage.setItem(SESSION_KEYS.codeVerifier, codeVerifier);
  sessionStorage.setItem(SESSION_KEYS.tripId, tripId);

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
  });

  window.location.href = `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export async function sendCodeToBackend(code: string): Promise<void> {
  const codeVerifier = sessionStorage.getItem(SESSION_KEYS.codeVerifier);
  if (!codeVerifier) throw new Error("Missing PKCE code verifier");

  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/gemini/token-exchange`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code,
        codeVerifier,
        redirectUri: REDIRECT_URI,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Token exchange failed");
  }

  sessionStorage.removeItem(SESSION_KEYS.codeVerifier);
}

export function getStoredTripId(): string | null {
  return sessionStorage.getItem(SESSION_KEYS.tripId);
}

export function clearOAuthTripId(): void {
  sessionStorage.removeItem(SESSION_KEYS.tripId);
}
