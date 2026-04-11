import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { signInWithGoogle } from "../utils/googleAuth";

export default function Signup() {
  const { login } = useAuth();

  const [showForm, setShowForm] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("+234");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const passwordChecks = useMemo(() => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const isStrongPassword =
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.number &&
    passwordChecks.special;

  const validateForm = () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !countryCode.trim() ||
      !phoneNumber.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      return "All fields are required";
    }

    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      return "Please enter a valid email address";
    }

    if (!isStrongPassword) {
      return "Please create a stronger password";
    }

    return "";
  };

  const handleSignup = async () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const res = await api.post("/auth/signup", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: `${countryCode.trim()}${phoneNumber.trim()}`,
        email: email.trim().toLowerCase(),
        password,
      });

      setSuccessMessage(res?.data?.message || "Check your email to verify.");

      setFirstName("");
      setLastName("");
      setCountryCode("+234");
      setPhoneNumber("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ GOOGLE SIGN IN (NEW)
  const handleGoogleSignup = async () => {
    try {
      setGoogleLoading(true);
      setError("");

      const userInfo = await signInWithGoogle();
      const profile = userInfo?.user;

      if (!profile?.email) {
        setError("Google sign-in failed.");
        return;
      }

      const backendRes = await api.post("/auth/google", {
        email: profile.email,
        firstName: profile.givenName || "",
        lastName: profile.familyName || "",
      });

      await login(backendRes.data.token);
    } catch (err) {
      setError("Google sign-in failed. Try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  if (!showForm) {
    return (
      <KeyboardAvoidingView style={styles.wrapper}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome to m4U</Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.primaryText}>Go to Sign Up</Text>
          </Pressable>

          <Link href="/login">
            <Text style={styles.loginText}>Log in</Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.wrapper}>
      <View style={styles.card}>
        <ScrollView>

          <TextInput placeholder="First Name" style={styles.input} value={firstName} onChangeText={setFirstName} />
          <TextInput placeholder="Last Name" style={styles.input} value={lastName} onChangeText={setLastName} />

          <View style={styles.phoneRow}>
            <TextInput style={[styles.input, styles.codeInput]} value={countryCode} onChangeText={setCountryCode} />
            <TextInput style={[styles.input, styles.phoneInput]} value={phoneNumber} onChangeText={setPhoneNumber} />
          </View>

          <TextInput placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} />

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Password"
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} />
            </Pressable>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.primaryButton} onPress={handleSignup}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Create Account</Text>}
          </Pressable>

          {/* GOOGLE BUTTON */}
          <Pressable style={styles.googleButton} onPress={handleGoogleSignup}>
            {googleLoading ? (
              <ActivityIndicator />
            ) : (
              <Text>Continue with Google</Text>
            )}
          </Pressable>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: "center", padding: 16 },
  card: { backgroundColor: "#fff", padding: 20, borderRadius: 12 },
  input: { borderWidth: 1, padding: 12, marginBottom: 10, borderRadius: 8 },
  phoneRow: { flexDirection: "row", gap: 10 },
  codeInput: { flex: 1 },
  phoneInput: { flex: 2 },
  primaryButton: { backgroundColor: "#4F46E5", padding: 14, borderRadius: 10 },
  primaryText: { color: "#fff", textAlign: "center" },
  googleButton: { marginTop: 10, padding: 14, borderWidth: 1, borderRadius: 10, alignItems: "center" },
  error: { color: "red", marginBottom: 10 },
  passwordWrapper: { position: "relative" },
  passwordInput: { paddingRight: 40 },
  eyeButton: { position: "absolute", right: 10, top: 14 },
  loginText: { marginTop: 10, textAlign: "center" },
});