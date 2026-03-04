const GOOGLE_CLIENT_ID =
  "191976318949-1et61pfo2d5dgjfp62iogt8it7kit6mb.apps.googleusercontent.com";
const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/generative-language";
const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;

const SESSION_KEYS = {
  codeVerifier: "googleOAuthCodeVerifier",
  tripId: "googleOAuthTripId",
  geminiToken: "googleGeminiToken",
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
    scope: GOOGLE_SCOPE,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
  });

  window.location.href = `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

export async function exchangeCodeForToken(
  code: string
): Promise<GoogleTokenResponse> {
  const codeVerifier = sessionStorage.getItem(SESSION_KEYS.codeVerifier);
  if (!codeVerifier) {
    throw new Error("Missing PKCE code verifier");
  }

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Token exchange failed: ${errorData.error_description || errorData.error}`
    );
  }

  const tokenData: GoogleTokenResponse = await response.json();

  sessionStorage.setItem(SESSION_KEYS.geminiToken, tokenData.access_token);
  sessionStorage.removeItem(SESSION_KEYS.codeVerifier);

  return tokenData;
}

export function getStoredTripId(): string | null {
  return sessionStorage.getItem(SESSION_KEYS.tripId);
}

export function clearOAuthTripId(): void {
  sessionStorage.removeItem(SESSION_KEYS.tripId);
}

export function getGeminiToken(): string | null {
  return sessionStorage.getItem(SESSION_KEYS.geminiToken);
}
