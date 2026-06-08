import BrandedBackdrop from "@/components/BrandedBackdrop";
import api from "@/utils/api";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const FEEDBACK_CATEGORIES = [
  "General",
  "Bug report",
  "Feature request",
  "Subscription",
  "Design",
] as const;

export default function FeedbackScreen() {
  const router = useRouter();
  const [category, setCategory] =
    useState<(typeof FEEDBACK_CATEGORIES)[number]>("General");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    if (loading) return;

    if (!message.trim() || message.trim().length < 10) {
      setError("Please enter a little more detail so we can help properly.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await api.post("/feedback", {
        category,
        message: message.trim(),
      });

      setSuccess(res.data.message || "Thanks for your feedback.");
      setMessage("");
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Unable to send feedback right now."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BrandedBackdrop light />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Share Feedback</Text>
        <Text style={styles.subtitle}>
          Tell us what you enjoy, what feels rough, or what you want us to add
          next.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.chipRow}>
            {FEEDBACK_CATEGORIES.map((item) => {
              const active = category === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Your feedback</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="For example: The app feels smooth, but I would love a quicker way to reuse old messages..."
            placeholderTextColor="#9CA3AF"
            multiline
            style={styles.textArea}
            textAlignVertical="top"
          />

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!success && <Text style={styles.success}>{success}</Text>}

          <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Feedback</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  container: {
    padding: 16,
    paddingTop: 44,
    paddingBottom: 60,
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    color: "#4F46E5",
    fontSize: 16,
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 22,
    color: "#667085",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(224, 231, 255, 0.95)",
    shadowColor: "#312E81",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  chipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#818CF8",
  },
  chipText: {
    color: "#4B5563",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#4338CA",
  },
  textArea: {
    minHeight: 170,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 16,
    padding: 14,
    color: "#111827",
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  error: {
    color: "#DC2626",
    marginBottom: 12,
  },
  success: {
    color: "#059669",
    marginBottom: 12,
  },
});
