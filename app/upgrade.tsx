import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { buyPackage } from "../utils/purchases";

export default function UpgradeScreen() {
  const { refreshUser, plan } = useAuth();
  const router = useRouter();

  const buyBasic = async () => {
    try {
      await buyPackage("basic_monthly");
      await refreshUser();
      router.back(); // 👈 go back after success
    } catch (err) {
      console.log("upgrade failed", err);
    }
  };

  const buyPremium = async () => {
    try {
      await buyPackage("premium_monthly");
      await refreshUser();
      router.back(); // 👈 go back after success
    } catch (err) {
      console.log("upgrade failed", err);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* 🔙 BACK BUTTON */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={22} color="#4F46E5" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Upgrade your plan 🚀</Text>

      <Text style={styles.current}>Current: {plan.toUpperCase()}</Text>

      <TouchableOpacity style={styles.btn} onPress={buyBasic}>
        <Text style={styles.text}>Buy Basic</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btn} onPress={buyPremium}>
        <Text style={styles.text}>Buy Premium</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  backText: {
    marginLeft: 6,
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "600",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },

  current: {
    marginBottom: 20,
    color: "#6B7280",
  },

  btn: {
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
  },

  text: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
});