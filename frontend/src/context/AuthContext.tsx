import { useState, createContext } from "react";
import type { ReactNode } from "react";

type AuthContextType = {
  token: string | null;
  login: (newToken: string) => void;
  logout: () => void;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<AuthContextType["token"]>(
    localStorage.getItem("token")
  );

  const login = (newToken: string): void => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
