import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  View,
} from "react-native";
import { Button, TextInput } from "react-native-paper";
import api from "../utils/api";

export default function VerifyEmail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; message?: string }>();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const codeInputRef = useRef<NativeTextInput | null>(null);

  useEffect(() => {
    if (typeof params.email === "string" && params.email) {
      setEmail(params.email);
    }

    if (typeof params.message === "string" && params.message) {
      setInfo(params.message);
    }
  }, [params.email, params.message]);

  const handleVerify = async () => {
    if (!email.trim() || !code.trim()) {
      setError("Email and verification code are required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setInfo("");

      const res = await api.post("/auth/verify-email-otp", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });

      router.replace({
        pathname: "/login",
        params: {
          email: email.trim().toLowerCase(),
          message: res.data.message || "Email verified successfully. Please log in.",
        },
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setError("Enter your email address first");
      return;
    }

    try {
      setResending(true);
      setError("");
      const res = await api.post("/auth/resend-verification-code", {
        email: email.trim().toLowerCase(),
      });
      setInfo(res.data.message || "A new verification code has been sent.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not resend verification code");
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code we sent to your email to activate your account.
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

        <View style={styles.codeSection}>
          <Text style={styles.codeLabel}>Verification Code</Text>
          <Pressable
            style={styles.codeBoxesRow}
            onPress={() => codeInputRef.current?.focus()}
          >
            {Array.from({ length: 6 }).map((_, index) => {
              const digit = code[index] || "";
              const isActive = index === Math.min(code.length, 5);

              return (
                <View
                  key={index}
                  style={[
                    styles.codeBox,
                    digit && styles.codeBoxFilled,
                    !digit && isActive && styles.codeBoxActive,
                  ]}
                >
                  <Text style={styles.codeDigit}>{digit}</Text>
                </View>
              );
            })}
          </Pressable>
          <NativeTextInput
            ref={codeInputRef}
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            style={styles.hiddenCodeInput}
          />
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!info && <Text style={styles.info}>{info}</Text>}

        <Button
          mode="contained"
          onPress={handleVerify}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Verify Email
        </Button>

        <Button
          mode="outlined"
          onPress={handleResend}
          loading={resending}
          disabled={resending}
          style={styles.outlineButton}
        >
          Resend Code
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
  codeSection: {
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
    marginLeft: 4,
    fontWeight: "600",
  },
  codeBoxesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  codeBox: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  codeBoxActive: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  codeBoxFilled: {
    borderColor: "#818CF8",
    backgroundColor: "#F8FAFF",
  },
  codeDigit: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  hiddenCodeInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  outlineButton: {
    marginTop: 12,
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
