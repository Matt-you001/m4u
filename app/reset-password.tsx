import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; message?: string }>();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const passwordChecks = useMemo(() => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const isStrongPassword = Object.values(passwordChecks).every(Boolean);

  const renderCheck = (label: string, valid: boolean) => (
    <Text style={{ color: valid ? "#059669" : "#9CA3AF", fontSize: 12 }}>
      {valid ? "• " : "• "} {label}
    </Text>
  );

  const handleResetPassword = async () => {
    if (!email.trim() || !code.trim() || !password.trim()) {
      setError("Email, reset code, and new password are required");
      return;
    }

    if (!isStrongPassword) {
      setError("Password is not strong enough");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setInfo("");

      const normalizedEmail = email.trim().toLowerCase();
      const res = await api.post("/auth/reset-password", {
        email: normalizedEmail,
        code: code.trim(),
        password,
      });

      router.replace({
        pathname: "/login",
        params: {
          email: normalizedEmail,
          message: res.data.message || "Password reset successful. Please log in.",
        },
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email.trim()) {
      setError("Enter your email address first");
      return;
    }

    try {
      setResending(true);
      setError("");
      const res = await api.post("/auth/forgot-password", {
        email: email.trim().toLowerCase(),
      });
      setInfo(
        res.data.message ||
          "If an account with that email exists, a password reset code has been sent."
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not resend reset code");
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
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter the reset code from your email and choose a new password.
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
          <Text style={styles.codeLabel}>Reset Code</Text>
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

        <View style={styles.passwordWrapper}>
          <TextInput
            label="New Password"
            mode="outlined"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
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

        <View style={styles.passwordRules}>
          {renderCheck("At least 8 characters", passwordChecks.length)}
          {renderCheck("Uppercase letter", passwordChecks.uppercase)}
          {renderCheck("Lowercase letter", passwordChecks.lowercase)}
          {renderCheck("Number", passwordChecks.number)}
          {renderCheck("Special character", passwordChecks.special)}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!info && <Text style={styles.info}>{info}</Text>}

        <Button
          mode="contained"
          onPress={handleResetPassword}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Reset Password
        </Button>

        <Button
          mode="outlined"
          onPress={handleResendCode}
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
  passwordWrapper: {
    position: "relative",
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 16,
    zIndex: 10,
  },
  passwordRules: {
    marginBottom: 12,
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
