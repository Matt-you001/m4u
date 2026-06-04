import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

export default function DeleteAccountPage() {
  const router = useRouter();
  const { logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [understandsSubscription, setUnderstandsSubscription] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit =
    currentPassword.trim().length > 0 &&
    confirmationText.trim().toUpperCase() === "DELETE" &&
    understandsSubscription &&
    !submitting;

  const performDeletion = async () => {
    try {
      setSubmitting(true);
      setError("");

      await api.post("/user/delete-account", {
        currentPassword,
        confirmationText,
      });

      Alert.alert(
        "Account deleted",
        "Your Message4U account has been deleted successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              logout();
            },
          },
        ]
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to delete account"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete your account?",
      "This will permanently delete your Message4U account and associated app data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: performDeletion,
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Delete Account</Text>
        <Text style={styles.subtitle}>
          Permanently delete your Message4U account from inside the app.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Before you continue</Text>

          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              • Your Message4U account and associated app data will be permanently deleted.
            </Text>
            <Text style={styles.bulletItem}>
              • You will lose access to your current credits and account history tied to this account.
            </Text>
            <Text style={styles.bulletItem}>
              • Deleting your app account does not automatically cancel a Google Play subscription.
            </Text>
            <Text style={styles.bulletItem}>
              • If you have an active subscription, cancel it in Google Play first to avoid future renewals.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Confirm your identity</Text>

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Current Password"
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowPassword((prev) => !prev)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#6B7280"
              />
            </Pressable>
          </View>

          <Text style={styles.label}>
            Type <Text style={styles.labelStrong}>DELETE</Text> to confirm
          </Text>
          <TextInput
            placeholder="DELETE"
            style={styles.input}
            value={confirmationText}
            onChangeText={setConfirmationText}
            autoCapitalize="characters"
            placeholderTextColor="#9CA3AF"
          />

          <Pressable
            style={styles.checkboxRow}
            onPress={() =>
              setUnderstandsSubscription((prev) => !prev)
            }
          >
            <View
              style={[
                styles.checkbox,
                understandsSubscription && styles.checkboxChecked,
              ]}
            >
              {understandsSubscription ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : null}
            </View>
            <Text style={styles.checkboxText}>
              I understand that deleting my Message4U account does not
              automatically cancel any Google Play subscription.
            </Text>
          </Pressable>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[
              styles.deleteButton,
              !canSubmit && styles.deleteButtonDisabled,
            ]}
            onPress={handleDelete}
            disabled={!canSubmit}
          >
            <Text style={styles.deleteButtonText}>
              {submitting ? "Deleting..." : "Delete My Account"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 60,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 12,
  },
  backText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#4F46E5",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 18,
    lineHeight: 21,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
    color: "#111827",
  },
  bulletList: {
    gap: 10,
  },
  bulletItem: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 21,
  },
  passwordWrapper: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 46,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  labelStrong: {
    color: "#B91C1C",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    marginBottom: 14,
    color: "#111827",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: "#B91C1C",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteButtonDisabled: {
    backgroundColor: "#FCA5A5",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  error: {
    color: "#B91C1C",
    marginBottom: 12,
  },
});
