import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BrandedBackdrop from "../components/BrandedBackdrop";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "react-native-paper";
import { useAuth } from "../context/AuthContext";
import { getHistory } from "../utils/history";

export default function HistoryScreen() {
  const [items, setItems] = useState<any[]>([]);
  const router = useRouter();

  const { plan } = useAuth();

  const loadHistory = async () => {
    const data = await getHistory();
    setItems([...data].reverse());
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const isFree = plan === "free";
  const canAccessHistory = !isFree;

  return (
    <View style={styles.screen}>
      <BrandedBackdrop />
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#4F46E5" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>
            Revisit saved generations, replies, and translations whenever you need them.
          </Text>
        </View>

        {!canAccessHistory ? (
          <View style={styles.centerCard}>
            <Text style={styles.lockTitle}>History is for paid subscribers</Text>
            <Text style={styles.lockText}>
              Upgrade to Basic or Premium to unlock saved message history and reuse your best results later.
            </Text>

            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => router.push("/upgrade")}
            >
              <Text style={styles.upgradeText}>Upgrade Plan</Text>
            </TouchableOpacity>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centerCard}>
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>
              Your saved messages will appear here once you start generating or responding.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card style={styles.card}>
                <Card.Title
                  title={item.type.toUpperCase()}
                  subtitle={new Date(item.createdAt).toLocaleString()}
                />
                <Card.Content>
                  <Text style={styles.label}>Input</Text>
                  <Text style={styles.text}>{item.inputText}</Text>

                  <Text style={styles.label}>Output</Text>
                  <Text style={styles.text}>{item.outputText}</Text>
                </Card.Content>
              </Card>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  content: {
    flex: 1,
    paddingTop: 42,
    paddingHorizontal: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  backText: {
    color: "#4F46E5",
    fontWeight: "700",
    fontSize: 16,
  },
  headerCard: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(199, 210, 254, 0.9)",
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 8,
    color: "#667085",
    fontSize: 15,
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: 28,
  },
  card: {
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  label: {
    marginTop: 8,
    fontWeight: "700",
    color: "#374151",
  },
  text: {
    marginTop: 4,
    fontSize: 14,
    color: "#111827",
    lineHeight: 21,
  },
  centerCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(199, 210, 254, 0.9)",
    padding: 28,
  },
  emptyTitle: {
    color: "#1F2937",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  lockText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#6B7280",
    lineHeight: 24,
  },
  upgradeBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  upgradeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});
