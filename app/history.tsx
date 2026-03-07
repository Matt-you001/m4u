import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Appbar, Card } from "react-native-paper";
import { useAuth } from "../context/AuthContext";
import { getHistory } from "../utils/history";

export default function HistoryScreen() {
  const [items, setItems] = useState<any[]>([]);
  const router = useRouter();

  const { plan } = useAuth();

  const loadHistory = async () => {
    const data = await getHistory();
    setItems(data.reverse());
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const isFree = plan === "free";

  return (
    <View style={{ flex: 1 }}>
      <Appbar.Header>
        <Appbar.Content title="History" />
      </Appbar.Header>

      {isFree ? (
        <View style={styles.center}>
          <Text style={styles.lockText}>
            History is unavailable for Free subscribers.
            {"\n"}
            Upgrade to unlock past messages.
          </Text>

          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => router.push("/upgrade")}
          >
            <Text style={styles.upgradeText}>Upgrade Plan</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No history yet</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
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
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  Appbar: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: "#4F46E5",
    marginTop: 30,
    marginBottom: 25,
  },
  label: {
    marginTop: 8,
    fontWeight: "600",
    color: "#374151",
  },
  text: {
    marginTop: 4,
    fontSize: 14,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  lockText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },

  /* NEW */
  upgradeBtn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  upgradeText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
});
