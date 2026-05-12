// utils/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { getAuthStore } from "../store/authStore";

const api = axios.create({
  baseURL: __DEV__
    ? "http://192.168.1.127:5000"
    : "https://m4u-1.onrender.com",
});


// 🔐 Attach token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// 🧠 Auto refresh AFTER credit usage
let refreshing = false;

api.interceptors.response.use(
  async (response) => {
    const url = response.config.url || "";

    const isAiCall =
      url.includes("/generate") ||
      url.includes("/respond") ||
      url.includes("/translate");

    if (isAiCall && !refreshing) {
      try {
        refreshing = true;

        const store = getAuthStore();
        if (store?.refreshUser) {
          await store.refreshUser();
        }
      } catch {
        console.log("auto refresh failed");
      } finally {
        refreshing = false;
      }
    }

    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const isAuthRequest = url.includes("/auth/");

    if (status === 401 && !isAuthRequest) {
      try {
        const store = getAuthStore();
        if (store?.clearSession) {
          await store.clearSession();
        }
      } catch {
        console.log("session clear failed");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
