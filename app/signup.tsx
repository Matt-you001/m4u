import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

export default function Signup() {
  const { login } = useAuth();
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("+234");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // 🔥 Password rules
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

  // 📱 Nigerian phone formatting
  const formatPhone = (value: string) => {
    let digits = value.replace(/\D/g, "");

    if (digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length > 10) digits = digits.slice(0, 10);

    return digits;
  };

  const validateForm = () => {
    if (
      !firstName ||
      !lastName ||
      !phoneNumber ||
      !email ||
      !password
    ) {
      return "All fields are required";
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return "Invalid email";
    }

    if (!isStrongPassword) {
      return "Password is not strong enough";
    }

    return "";
  };

  const handleSignup = async () => {
    const validationError = validateForm();
    if (validationError) return setError(validationError);

    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const res = await api.post("/auth/signup", {
        firstName,
        lastName,
        phoneNumber: `${countryCode}${phoneNumber}`,
        email: email.toLowerCase(),
        password,
      });

      setSuccessMessage(res?.data?.message || "Check your email to verify.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const renderCheck = (label: string, valid: boolean) => (
    <Text style={{ color: valid ? "#059669" : "#9CA3AF", fontSize: 12 }}>
      {valid ? "✓ " : "• "} {label}
    </Text>
  );

  if (!showForm) {
    return (
      <KeyboardAvoidingView style={styles.wrapper}>
        <View style={styles.heroCard}>
          <View style={styles.logoFrame}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              contentFit="contain"
            />
          </View>

          <Text style={styles.heroTitle}>Welcome to m4U</Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.primaryText}>Sign Up</Text>
          </Pressable>

          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.secondaryLinkText}>Log In</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <ScrollView showsVerticalScrollIndicator={false}>
          
          {/* HEADER */}
          <View style={styles.formHeader}>
            <Pressable onPress={() => setShowForm(false)}>
              <Text>← Back</Text>
            </Pressable>

            <Pressable onPress={() => router.replace("/login")}>
              <Text style={styles.link}>Login</Text>
            </Pressable>
          </View>

          {/* FLOATING INPUTS */}
          <FloatingInput label="First Name" value={firstName} setValue={setFirstName} />
          <FloatingInput label="Last Name" value={lastName} setValue={setLastName} />

          {/* PHONE */}
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.phoneRow}>
            <TextInput style={styles.codeInput} value={countryCode} editable={false} />
            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={(v) => setPhoneNumber(formatPhone(v))}
              keyboardType="phone-pad"
              placeholder="8012345678"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* EMAIL */}
          <FloatingInput
            label="Email"
            value={email}
            setValue={setEmail}
            keyboardType="email-address"
          />

          {/* PASSWORD */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="Create password"
              placeholderTextColor="#9CA3AF"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eye}>
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} />
            </Pressable>
          </View>

          {/* PASSWORD RULES */}
          <View style={{ marginBottom: 12 }}>
            {renderCheck("At least 8 characters", passwordChecks.length)}
            {renderCheck("Uppercase letter", passwordChecks.uppercase)}
            {renderCheck("Lowercase letter", passwordChecks.lowercase)}
            {renderCheck("Number", passwordChecks.number)}
            {renderCheck("Special character", passwordChecks.special)}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!successMessage && <Text style={styles.success}>{successMessage}</Text>}

          <Pressable style={styles.primaryButton} onPress={handleSignup}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Create Account</Text>}
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/* FLOATING INPUT COMPONENT */
const FloatingInput = ({ label, value, setValue, ...props }: any) => {
  const active = value.length > 0;

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.floatingLabel, active && { color: "#4F46E5" }]}>
        {label}
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder={label}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: "center", padding: 16, backgroundColor: "#F3F4F6" },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 12 },

  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 12,
    borderRadius: 8,
    color: "#111827",
    backgroundColor: "#fff"
  },

  floatingLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: "600"
  },

  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },

  phoneRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  codeInput: { borderWidth: 1, padding: 12, borderRadius: 8, width: 80 },
  phoneInput: { borderWidth: 1, padding: 12, borderRadius: 8, flex: 1 },

  passwordWrapper: { position: "relative", marginBottom: 10 },
  eye: { position: "absolute", right: 10, top: 14 },

  primaryButton: { backgroundColor: "#4F46E5", padding: 14, borderRadius: 10 },
  primaryText: { color: "#fff", textAlign: "center", fontWeight: "600" },

  link: { color: "#4F46E5", fontWeight: "600" },

  error: { color: "red", marginBottom: 10 },
  success: { color: "green", marginBottom: 10 },

  formHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },

  heroCard: { backgroundColor: "#fff", padding: 24, borderRadius: 24, alignItems: "center" },
  logoFrame: { width: 100, height: 100, justifyContent: "center", alignItems: "center" },
  logo: { width: 80, height: 80 },
  heroTitle: { fontSize: 28, fontWeight: "800", marginBottom: 20 },
  secondaryLinkText: { marginTop: 10, color: "#4F46E5" }
});