import type { FC } from "react";
import type { FallbackProps } from "react-error-boundary";

const ErrorFallback: FC<FallbackProps & { retryCount: number }> = ({
  error,
  resetErrorBoundary,
  retryCount,
}) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isFinalReset = retryCount >= 3;
  return (
    <div
      role="alert"
      style={{
        padding: "1rem",
        zIndex: "2",
        border: "1px solid red",
        borderRadius: "4px",
      }}
    >
      {isFinalReset ? (
        <p>try refreshing...</p>
      ) : (
        <div>
          {" "}
          <p>Something went wrong:</p>
          <pre style={{ color: "red" }}>{errorMessage}</pre>
          <button onClick={resetErrorBoundary} style={{ marginTop: "0.5rem" }}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

export default ErrorFallback;
