import api from "@/utils/api";
import { Ionicons } from "@expo/vector-icons";
import BrandedBackdrop from "../components/BrandedBackdrop";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

type UserProfile = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  plan: "free" | "basic" | "premium";
  credits: number;
  extraCredits: number;
  totalCredits: number;
  baseCredits: number;
  usedCredits: number;
  referralCode?: string;
  successfulReferrals?: number;
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/user/me");
      const user = res.data;

      setProfile(user);
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      setProfileError("");
      setProfileSuccess("");

      const res = await api.patch("/user/profile", {
        firstName,
        lastName,
      });

      setProfile(res.data.user);
      setProfileSuccess(res.data.message || "Profile updated successfully");
    } catch (err: any) {
      setProfileError(
        err?.response?.data?.message || "Failed to update profile"
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setSavingPassword(true);
      setPasswordError("");
      setPasswordSuccess("");

      const res = await api.post("/user/change-password", {
        currentPassword,
        newPassword,
      });

      setPasswordSuccess(res.data.message || "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
    } catch (err: any) {
      setPasswordError(
        err?.response?.data?.message || "Failed to change password"
      );
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 20}
    >
      <BrandedBackdrop light />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account Info</Text>

          <Text style={styles.readonlyLabel}>Email</Text>
          <Text style={styles.readonlyValue}>{profile?.email}</Text>

          <Text style={styles.readonlyLabel}>Phone Number</Text>
          <Text style={styles.readonlyValue}>{profile?.phoneNumber || "Not set"}</Text>

          <TextInput
            placeholder="First Name"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
          />

          <TextInput
            placeholder="Last Name"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
          />

          {!!profileError && <Text style={styles.error}>{profileError}</Text>}
          {!!profileSuccess && <Text style={styles.success}>{profileSuccess}</Text>}

          <Pressable
            style={styles.primaryButton}
            onPress={handleSaveProfile}
            disabled={savingProfile}
          >
            <Text style={styles.primaryButtonText}>
              {savingProfile ? "Saving..." : "Save Profile"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Subscription & Credits</Text>

          <Text style={styles.infoText}>Plan: {profile?.plan?.toUpperCase()}</Text>
          <Text style={styles.infoText}>Base Credits: {profile?.baseCredits}</Text>
          <Text style={styles.infoText}>Used Credits: {profile?.usedCredits}</Text>
          <Text style={styles.infoText}>Bonus Credits: {profile?.extraCredits}</Text>
          <Text style={styles.infoText}>Available Credits: {profile?.totalCredits}</Text>
          <Text style={styles.infoText}>
            Referral Code: {profile?.referralCode || "Loading..."}
          </Text>
          <Text style={styles.infoText}>
            Successful Referrals: {profile?.successfulReferrals || 0}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Change Password</Text>

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Current Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showCurrentPassword}
              style={[styles.input, styles.passwordInput]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowCurrentPassword((prev) => !prev)}
            >
              <Ionicons
                name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#6B7280"
              />
            </Pressable>
          </View>

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="New Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showNewPassword}
              style={[styles.input, styles.passwordInput]}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <Pressable
              style={styles.eyeButton}
              onPress={() => setShowNewPassword((prev) => !prev)}
            >
              <Ionicons
                name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color="#6B7280"
              />
            </Pressable>
          </View>

          <Text style={styles.passwordHint}>
            New password must be at least 8 characters and include uppercase,
            lowercase, number, and special character.
          </Text>

          {!!passwordError && <Text style={styles.error}>{passwordError}</Text>}
          {!!passwordSuccess && <Text style={styles.success}>{passwordSuccess}</Text>}

          <Pressable
            style={styles.primaryButton}
            onPress={handleChangePassword}
            disabled={savingPassword}
          >
            <Text style={styles.primaryButtonText}>
              {savingPassword ? "Updating..." : "Change Password"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delete Account</Text>
          <Text style={styles.deleteCopy}>
            You can now permanently delete your Message4U account directly
            inside the app. This removes your account access and associated app
            data.
          </Text>
          <Pressable
            style={styles.dangerButton}
            onPress={() => router.push("/delete-account")}
          >
            <Text style={styles.dangerButtonText}>Manage Account Deletion</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  container: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 60,
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 28,
    fontWeight: "800",
    color: "#4F46E5",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.88)",
    padding: 18,
    borderRadius: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(199, 210, 254, 0.9)",
    shadowColor: "#312E81",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
    color: "#111827",
  },
  readonlyLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  readonlyValue: {
    fontSize: 15,
    color: "#111827",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
    marginBottom: 12,
    color: "#111827",
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
  infoText: {
    fontSize: 15,
    color: "#111827",
    marginBottom: 8,
  },
  passwordHint: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: "#4F46E5",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  deleteCopy: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 14,
    lineHeight: 21,
  },
  dangerButton: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  dangerButtonText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 15,
  },
  error: {
    color: "red",
    marginBottom: 10,
  },
  success: {
    color: "green",
    marginBottom: 10,
  },
});
