import { useState, createContext, useEffect, useRef } from "react";
import type { ReactNode } from "react";

type AuthContextType = {
  token: string | null;
  login: (newToken: string) => void;
  logout: () => Promise<void>;
  loggingOut: boolean;
  refreshInFlightRef: React.RefObject<Promise<{
    token: string | null;
    err: boolean;
  }> | null>;
};

type AuthProviderProps = {
  children: ReactNode;
};

const apiURL = import.meta.env.VITE_API_URL; // will need this for logout route in PROD

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: AuthProviderProps) {
  const [loggingOut, setLoggingOut] = useState(false);

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

  const login = (newToken: string): void => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };
  const logout = async (): Promise<void> => {
    try {
      await fetch(`${apiURL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setLoggingOut(true);
      localStorage.removeItem("token");
      setToken(null);
    } catch (err) {
      setLoggingOut(true);
      localStorage.removeItem("token");
      setToken(null);
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider
      value={{ token, login, logout, loggingOut, refreshInFlightRef }}
    >
      {children}
    </AuthContext.Provider>
  );
}
