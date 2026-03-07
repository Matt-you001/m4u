import { Link } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { useGoogleAuth } from "../utils/googleAuth";



export default function Signup() {
  const { login } = useAuth();
  const { request, response, promptAsync } = useGoogleAuth();


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (response?.type === "success") {
      const { accessToken } = response.authentication!;

      (async () => {
        try {
          const res = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          const profile = await res.json();

          const backendRes = await api.post("/auth/google", {
            email: profile.email,
          });

          await login(backendRes.data.token);
        } catch (err) {
          console.log("❌ Google sign-in failed", err);
        }
      })();
    }
  }, [response]);


  const handleSignup = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await api.post("/auth/signup", {
        email,
        password,
      });

      // 🔐 Permanently sign user in
      await login(res.data.token);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Signup failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>

      <TextInput
        placeholder="Email address"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.primaryButton} onPress={handleSignup}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Create Account</Text>
        )}
      </Pressable>

       {/* Divider */}
      <Text style={styles.orText}>Already have an account?</Text>

      <Link href="/login">
        <Text style={styles.loginText}>Log in</Text>
      </Link>


      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.or}>OR</Text>
        <View style={styles.line} />
      </View>

      {/* Google */}
      <Pressable
        style={styles.socialButton}
        disabled={!request}
        onPress={() => promptAsync()}
      >
        <Text style={styles.socialText}>Continue with Google</Text>
      </Pressable>



      {/* Apple */}
      <Pressable style={styles.socialButton}>
        <Text style={styles.socialText}>Continue with Apple</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
    color: "#4F46E5",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  primaryButton: {
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  or: {
    marginHorizontal: 12,
    color: "#666",
    fontSize: 12,
  },
  socialButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  socialText: {
    fontSize: 15,
    fontWeight: "500",
  },
  error: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
   orText: {
    marginTop: 24,
    textAlign: "center",
    color: "#666",
  },
  loginText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
});
