import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useSegments } from "expo-router";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";
import BrandedLoader from "../components/BrandedLoader";
import { setAuthStore } from "../store/authStore";
import { maybeShowAppOpenAd, primeAppOpenAd } from "../utils/admob";
import { clearHistory } from "../utils/history";
import { captureAndroidInstallReferralCode } from "../utils/installReferrer";
import api from "../utils/api";
import {
  configurePurchases,
  initPurchases,
  logoutPurchases,
  refreshRevenueCatSubscriptionState,
} from "../utils/purchases";

type Plan = "free" | "basic" | "premium";

type AuthContextType = {
  token: string | null;
  loading: boolean;
  plan: Plan;
  credits: number;
  firstName: string;
  lastName: string;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => Promise<void>;
  setAvailableCredits: (credits: number) => void;
  refreshUser: () => Promise<any>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const TOKEN_STORAGE_KEY = "token";
const USER_CACHE_STORAGE_KEY = "m4u_user_cache";

type CachedUser = {
  id?: string | number;
  plan?: Plan;
  credits?: number;
  firstName?: string;
  lastName?: string;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan>("free");
  const [credits, setCredits] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const router = useRouter();
  const segments = useSegments();

  const applyUserSnapshot = useCallback((user?: CachedUser | null) => {
    if (!user) {
      return;
    }

    setPlan((user.plan as Plan) || "free");
    setCredits(Math.max(0, Number(user.credits) || 0));
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
  }, []);

  const persistUserSnapshot = useCallback(async (user?: CachedUser | null) => {
    if (!user) {
      return;
    }

    await AsyncStorage.setItem(
      USER_CACHE_STORAGE_KEY,
      JSON.stringify({
        id: user.id,
        plan: (user.plan as Plan) || "free",
        credits: Math.max(0, Number(user.credits) || 0),
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      })
    );
  }, []);

  const clearSession = useCallback(async () => {
    await AsyncStorage.multiRemove([
      TOKEN_STORAGE_KEY,
      USER_CACHE_STORAGE_KEY,
    ]);
    delete api.defaults.headers.common.Authorization;
    await logoutPurchases();

    setToken(null);
    setPlan("free");
    setCredits(0);
    setFirstName("");
    setLastName("");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get("/user/me");
      const totalCredits =
        typeof res.data.totalCredits === "number"
          ? res.data.totalCredits
          : (res.data.credits ?? 0) + (res.data.extraCredits ?? 0);

      const userSnapshot: CachedUser = {
        id: res.data.id,
        plan: (res.data.plan as Plan) || "free",
        credits: totalCredits,
        firstName: res.data.firstName || "",
        lastName: res.data.lastName || "",
      };

      applyUserSnapshot(userSnapshot);
      await persistUserSnapshot(userSnapshot);

      console.log(
        "user refreshed:",
        res.data.plan,
        totalCredits,
        res.data.firstName,
        res.data.lastName
      );

      return res.data;
    } catch (err: any) {
      const errorCode = String(err?.response?.data?.code || "").trim();

      if (
        err?.response?.status === 401 &&
        (errorCode === "TOKEN_EXPIRED" || errorCode === "INVALID_TOKEN")
      ) {
        await clearSession();
      }

      console.log("failed to refresh user", err);
      return null;
    }
  }, [applyUserSnapshot, clearSession, persistUserSnapshot]);

  useEffect(() => {
    const bootstrap = async () => {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_STORAGE_KEY),
        AsyncStorage.getItem(USER_CACHE_STORAGE_KEY),
      ]);
      let cachedUser: CachedUser | null = null;

      if (storedToken) {
        setToken(storedToken);
        api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
      } else {
        delete api.defaults.headers.common.Authorization;
      }

      if (storedUser) {
        try {
          cachedUser = JSON.parse(storedUser);
          applyUserSnapshot(cachedUser);
        } catch (error) {
          console.log("failed to parse cached user", error);
          await AsyncStorage.removeItem(USER_CACHE_STORAGE_KEY);
        }
      }

      setLoading(false);

      void captureAndroidInstallReferralCode().catch((error) => {
        console.log("install referrer bootstrap failed", error);
      });

      void configurePurchases().catch((error) => {
        console.log("purchase configure failed", error);
      });

      if (storedToken) {
        primeAppOpenAd();
        void maybeShowAppOpenAd(cachedUser?.plan || "free", "launch").catch(
          (error) => {
            console.log("app open launch check failed", error);
          }
        );

        void refreshUser()
          .then((user) => {
            if (user?.id) {
              return initPurchases(String(user.id))
                .then(() => refreshUser())
                .catch((error) => {
                  console.log("purchase init bootstrap failed", error);
                });
            }

            return null;
          })
          .catch((error) => {
            console.log("user bootstrap refresh failed", error);
          });
      }
    };

    bootstrap();
  }, [applyUserSnapshot, refreshUser]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const subscription = AppState.addEventListener("change", async (state) => {
      if (state !== "active") {
        return;
      }

      try {
        void maybeShowAppOpenAd(plan, "resume").catch((error) => {
          console.log("resume app open ad failed", error);
        });

        const user = await refreshUser();

        if (user?.id && user?.plan && user.plan !== "free") {
          void refreshRevenueCatSubscriptionState("app-resume").catch(
            (error) => {
              console.log("resume subscription sync failed", error);
            }
          );
        }
      } catch (error) {
        console.log("resume refresh failed", error);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [plan, token, refreshUser]);

  useEffect(() => {
    setAuthStore({ refreshUser, clearSession });

    return () => {
      setAuthStore(null);
    };
  }, [clearSession, refreshUser]);

  useEffect(() => {
    if (loading) return;

    const inAuthRoute =
      segments[0] === "login" ||
      segments[0] === "signup" ||
      segments[0] === "verify-email" ||
      segments[0] === "forgot-password" ||
      segments[0] === "reset-password";

    if (!token && !inAuthRoute) router.replace("/signup");
    if (token && inAuthRoute) router.replace("/(tabs)");
  }, [token, segments, loading, router]);

  const login = async (newToken: string) => {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
    setToken(newToken);
    router.replace("/(tabs)");

    void refreshUser()
      .then((user) => {
        if (user?.id) {
          return initPurchases(String(user.id)).catch((error) => {
            console.log("purchase init after login failed", error);
          });
        }

        return null;
      })
      .catch((error) => {
        console.log("user refresh after login failed", error);
      });
  };

  const logout = async () => {
    await clearHistory();
    await clearSession();
    router.replace("/signup");
  };

  const setAvailableCredits = useCallback((nextCredits: number) => {
    setCredits(Math.max(0, Number(nextCredits) || 0));
  }, []);

  if (loading) {
    return <BrandedLoader />;
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        loading,
        login,
        logout,
        clearSession,
        setAvailableCredits,
        refreshUser,
        plan,
        credits,
        firstName,
        lastName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
