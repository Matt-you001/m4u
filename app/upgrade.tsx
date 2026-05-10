import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BannerAd } from "react-native-google-mobile-ads";
import { useAuth } from "../context/AuthContext";
import { bannerAdUnitId, defaultBannerSize } from "../utils/admob";
import { presentSubscriptionPaywall } from "../utils/purchases";

export default function UpgradeScreen() {
  const { refreshUser, plan } = useAuth();
  const router = useRouter();
  const [paywallLoading, setPaywallLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const planCopy = {
    free: {
      title: "Upgrade your plan",
      cardTitle: "Choose Basic or Premium",
      cardBody:
        "Compare both paid plans and pick the one that fits your message needs best.",
      ctaLabel: "View plans",
    },
    basic: {
      title: "Upgrade to Premium",
      cardTitle: "Move up to Premium",
      cardBody:
        "You already have Basic. Open the paywall to compare Premium benefits and upgrade when you're ready.",
      ctaLabel: "View Premium options",
    },
    premium: {
      title: "Premium active",
      cardTitle: "You're already on Premium",
      cardBody:
        "Your highest plan is already active. You can still open the paywall if you want to review your subscription options.",
      ctaLabel: "Review subscription",
    },
  }[plan];

  const openPaywall = async () => {
    try {
      setPaywallLoading(true);
      setErrorMessage("");

      const didUnlockPlan = await presentSubscriptionPaywall();
      await refreshUser();

      if (didUnlockPlan) {
        router.back();
      }
    } catch (error) {
      console.log("paywall failed", error);
      setErrorMessage("Unable to open subscriptions right now. Please try again.");
    } finally {
      setPaywallLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#4F46E5" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{planCopy.title}</Text>
      <Text style={styles.current}>Current: {plan.toUpperCase()}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{planCopy.cardTitle}</Text>
        <Text style={styles.cardBody}>{planCopy.cardBody}</Text>

        <TouchableOpacity
          style={[styles.btn, paywallLoading && styles.btnDisabled]}
          onPress={openPaywall}
          disabled={paywallLoading}
        >
          {paywallLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.text}>{planCopy.ctaLabel}</Text>
          )}
        </TouchableOpacity>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </View>

      {plan === "free" ? (
        <View style={styles.bannerWrap}>
          <BannerAd
            unitId={bannerAdUnitId}
            size={defaultBannerSize}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#fff",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    marginLeft: 6,
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111827",
  },
  current: {
    marginBottom: 20,
    color: "#6B7280",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    backgroundColor: "#F9FAFB",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4B5563",
    marginBottom: 16,
  },
  btn: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.75,
  },
  text: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
  error: {
    marginTop: 12,
    color: "#DC2626",
    fontSize: 14,
  },
  bannerWrap: {
    marginTop: 24,
    alignItems: "center",
  },
});
