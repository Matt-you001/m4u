import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { buyPackage } from "../utils/purchases";


export default function UpgradeScreen() {
  const { refreshUser, plan } = useAuth();
  

  const buyBasic = async () => {
    try {
      await buyPackage("basic_monthly");
      await refreshUser();
    } catch (err) {
      console.log("upgrade failed", err);
    }
  };

  const buyPremium = async () => {
    try {
      await buyPackage("premium_monthly");
      await refreshUser();
    } catch (err) {
      console.log("upgrade failed", err);
    }
  };


  return (
    <View style={styles.container}>
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
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 10 },
  current: { marginBottom: 20, color: "#6B7280" },
  btn: {
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  text: { color: "#fff", textAlign: "center", fontWeight: "600" },
});
