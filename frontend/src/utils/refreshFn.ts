export default function refreshFn(
  apiURL: string,
  refreshInFlight: React.RefObject<Promise<{
    token: string | null;
    err: boolean;
  }> | null>
): Promise<{ token: string | null; err: boolean }> {
  if (!refreshInFlight.current) {
    refreshInFlight.current = (async () => {
      try {
        const res = await fetch(`${apiURL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          return { token: null, err: true };
        } else {
          const data = await res.json();
          return { token: data.token, err: false };
        }
      } catch {
        return { token: null, err: true };
      } finally {
        refreshInFlight.current = null;
      }
    })();
  }

  return refreshInFlight.current;
}
