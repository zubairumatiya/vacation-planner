import { useState, createContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import refreshFn from "../utils/refreshFn";

type AuthContextType = {
  token: string | null;
  login: (newToken: string) => void;
  logout: () => Promise<void>;
  loggingOut: boolean;
  refreshInFlightRef: React.RefObject<Promise<{
    token: string | null;
    err: boolean;
  }> | null>;
  loggingOutRef: React.RefObject<boolean>;
  userEmail: string | null;
  userId: string | null;
  userUsername: string | null;
  userAvatar: string | null;
  setUserAvatar: (avatar: string | null) => void;
};

type AuthProviderProps = {
  children: ReactNode;
};

const apiURL = import.meta.env.VITE_API_URL; // will need this for logout route in PROD

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: AuthProviderProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const loggingOutRef = useRef<boolean>(false);
  const currentTimerRef = useRef<NodeJS.Timeout>(null);
  useEffect(() => {
    if (loggingOut && window.location.pathname === "/login") {
      setLoggingOut(false);
    }
  }, [loggingOut]);

  const refreshInFlightRef = useRef<Promise<{
    token: string | null;
    err: boolean;
  }> | null>(null);

  const [token, setToken] = useState<AuthContextType["token"]>(
    localStorage.getItem("token")
  );
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userUsername, setUserUsername] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  const fetchProfile = async (t: string) => {
    try {
      const res = await fetch(`${apiURL}/profile`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserEmail(data.email);
        setUserId(data.id);
        setUserUsername(data.username);
        setUserAvatar(data.avatar || null);
      }
    } catch {
      // silent fail
    }
  };

  // Fetch profile on mount if token exists
  useEffect(() => {
    if (token) {
      fetchProfile(token);
    }
  }, []);

  const login = (newToken: string): void => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    logoutOnceRef.current = false;
    loggingOutRef.current = false;
    fetchProfile(newToken);
  };

  const logoutOnceRef = useRef<boolean>(false);
  const logout = async (): Promise<void> => {
    if (logoutOnceRef.current) return;
    logoutOnceRef.current = true;
    loggingOutRef.current = true;
    try {
      await Promise.race([
        fetch(`${apiURL}/auth/logout`, {
          method: "POST",
          credentials: "include",
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 3000)
        ),
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoggingOut(true);
      localStorage.removeItem("token");
      setToken(null);
      setUserEmail(null);
      setUserId(null);
      setUserUsername(null);
      setUserAvatar(null);
    }
  };
  useEffect(() => {
    if (currentTimerRef.current != null) {
      clearTimeout(currentTimerRef.current);
    }
    if (token != null) {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      const msUntilExpiry = decoded.exp * 1000 - Date.now();
      const delay = Math.max(msUntilExpiry - 60_000, 0);
      currentTimerRef.current = setTimeout(async () => {
        try {
          const result: { token: string | null; err: boolean } =
            await refreshFn(apiURL, refreshInFlightRef);
          if (result.err || result.token == null) {
            await logout();
          } else {
            login(result.token);
          }
        } catch (err) {
          console.error(err);
        }
      }, delay);
    }
  }, [token]);
  return (
    <AuthContext.Provider
      value={{
        token,
        login,
        logout,
        loggingOut,
        refreshInFlightRef,
        loggingOutRef,
        userEmail,
        userId,
        userUsername,
        userAvatar,
        setUserAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
