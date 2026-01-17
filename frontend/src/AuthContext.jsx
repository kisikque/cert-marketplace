import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthContext is missing");
  return ctx;
}
