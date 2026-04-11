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
import { ActivityIndicator, View } from "react-native";
import api from "../utils/api";
import { configurePurchases, initPurchases } from "../utils/purchases";

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
  refreshUser: () => Promise<any>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan>("free");
  const [credits, setCredits] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const router = useRouter();
  const segments = useSegments();

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get("/user/me");

      setPlan(res.data.plan || "free");
      setCredits(res.data.credits || 0);
      setFirstName(res.data.firstName || "");
      setLastName(res.data.lastName || "");

      console.log(
        "✅ user refreshed:",
        res.data.plan,
        res.data.credits,
        res.data.firstName,
        res.data.lastName
      );

      return res.data;
    } catch (err) {
      console.log("❌ failed to refresh user", err);
      return null;
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      await configurePurchases();

      const storedToken = await AsyncStorage.getItem("token");

      if (storedToken) {
        setToken(storedToken);
        api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;

        const user = await refreshUser();

        if (user?.id) {
          await initPurchases(String(user.id));
        }
      }

      setLoading(false);
    };

    bootstrap();
  }, [refreshUser]);

  useEffect(() => {
    if (loading) return;

    const inAuthRoute =
      segments[0] === "login" || segments[0] === "signup";

    if (!token && !inAuthRoute) router.replace("/signup");
    if (token && inAuthRoute) router.replace("/(tabs)");
  }, [token, segments, loading, router]);

  const login = async (newToken: string) => {
    await AsyncStorage.setItem("token", newToken);
    api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
    setToken(newToken);

    const user = await refreshUser();

    if (user?.id) {
      await initPurchases(String(user.id));
    }

    router.replace("/(tabs)");
  };

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    delete api.defaults.headers.common.Authorization;

    setToken(null);
    setPlan("free");
    setCredits(0);
    setFirstName("");
    setLastName("");

    router.replace("/signup");
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        loading,
        login,
        logout,
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