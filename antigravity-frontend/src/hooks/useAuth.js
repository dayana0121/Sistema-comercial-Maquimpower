// src/hooks/useAuth.js
import { useAuthContext } from '../context/AuthContext';

// Hook unificado — lee del AuthContext
export function useAuth() {
  return useAuthContext();
}