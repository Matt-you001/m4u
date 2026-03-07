// utils/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { getAuthStore } from "../store/authStore";

const isDev = __DEV__;

const api = axios.create({
  baseURL: isDev
  ? "http://192.168.1.127:5000"
  : "https://api-f5s6ry7piq-uc.a.run.app",
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
      } catch (err) {
        console.log("auto refresh failed");
      } finally {
        refreshing = false;
      }
    }

    return response;
  },
  (error) => Promise.reject(error)
);

export default api;
