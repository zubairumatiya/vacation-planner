import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  exchangeCodeForToken,
  getStoredTripId,
  clearOAuthTripId,
} from "../utils/googleOAuth";

const GoogleOAuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const oauthError = params.get("error");

      if (oauthError) {
        setError(`Google authentication failed: ${oauthError}`);
        return;
      }

      if (!code) {
        setError("No authorization code received");
        return;
      }

      try {
        const tripId = getStoredTripId();
        await exchangeCodeForToken(code);
        clearOAuthTripId();

        if (tripId) {
          navigate(`/vacation/${tripId}/edit?ai=ready`, { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("[OAuth Callback] Error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to complete authentication"
        );
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "white",
          gap: "1rem",
        }}
      >
        <p style={{ color: "#ff6b6b", fontSize: "1.1rem" }}>{error}</p>
        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          style={{
            padding: "0.5rem 1.5rem",
            borderRadius: "8px",
            border: "1px solid white",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        color: "white",
        fontSize: "1.1rem",
      }}
    >
      Authenticating with Google...
    </div>
  );
};

export default GoogleOAuthCallback;
