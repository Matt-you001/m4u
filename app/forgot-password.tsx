import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button, TextInput } from "react-native-paper";
import api from "../utils/api";

export default function ForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof params.email === "string" && params.email) {
      setEmail(params.email);
    }
  }, [params.email]);

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const normalizedEmail = email.trim().toLowerCase();
      const res = await api.post("/auth/forgot-password", {
        email: normalizedEmail,
      });

      const message =
        res.data.message ||
        "If an account with that email exists, a password reset code has been sent.";

      setInfo(message);

      router.push({
        pathname: "/reset-password",
        params: {
          email: normalizedEmail,
          message,
        },
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not send reset code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your email and we&apos;ll send a reset code you can use inside the app.
        </Text>

        <TextInput
          label="Email"
          mode="outlined"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!info && <Text style={styles.info}>{info}</Text>}

        <Button
          mode="contained"
          onPress={handleSendCode}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Send Reset Code
        </Button>

        <Link href="/login" asChild>
          <Pressable style={styles.linkWrap}>
            <Text style={styles.linkText}>Back to Login</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 16,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    color: "#4F46E5",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 20,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  linkWrap: {
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  error: {
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 10,
  },
  info: {
    color: "#2563EB",
    textAlign: "center",
    marginBottom: 10,
  },
});
