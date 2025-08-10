import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
export const api = axios.create({ baseURL: API_URL });

export function setAuthToken(token?: string) {
  if (token) {
    localStorage.setItem("token", token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem("token");
    delete api.defaults.headers.common.Authorization;
  }
}

// usar token si ya existe
const boot = localStorage.getItem("token");
if (boot) setAuthToken(boot);
