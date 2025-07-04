import { useState, createContext, useEffect } from "react";
import type { ReactNode } from "react";

type AuthContextType = {
  token: string | null;
  login: (newToken: string) => void;
  logout: () => void;
  loggingOut: boolean;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: AuthProviderProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (loggingOut && window.location.pathname === "/login") {
      setLoggingOut(false);
    }
  }, [loggingOut]);

  const [token, setToken] = useState<AuthContextType["token"]>(
    localStorage.getItem("token")
  );

  const login = (newToken: string): void => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    setLoggingOut(true);
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, loggingOut }}>
      {children}
    </AuthContext.Provider>
  );
}
