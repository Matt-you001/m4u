import Constants from "expo-constants";
import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

type RevenueCatConfig = {
  testApiKey?: string;
  androidApiKey?: string;
  iosApiKey?: string;
  basicEntitlementId?: string;
  premiumEntitlementId?: string;
  offeringIdentifier?: string;
};

const FALLBACK_CONFIG: RevenueCatConfig = {
  testApiKey: "test_hAUFSXISuwFRqhWKUcatrdmbimr",
  androidApiKey: "goog_eKUGwhpPpECQZLEkXWKauvTitnn",
  iosApiKey: "",
  basicEntitlementId: "entl17867c319b",
  premiumEntitlementId: "entl5d25ec99ce",
  offeringIdentifier: "default",
};

let isPurchasesConfigured = false;

function getRevenueCatConfig(): RevenueCatConfig {
  const extra = Constants.expoConfig?.extra as
    | {
        revenuecat?: RevenueCatConfig;
      }
    | undefined;

  return {
    testApiKey:
      extra?.revenuecat?.testApiKey || FALLBACK_CONFIG.testApiKey,
    androidApiKey:
      extra?.revenuecat?.androidApiKey || FALLBACK_CONFIG.androidApiKey,
    iosApiKey: extra?.revenuecat?.iosApiKey || FALLBACK_CONFIG.iosApiKey,
    basicEntitlementId:
      extra?.revenuecat?.basicEntitlementId ||
      FALLBACK_CONFIG.basicEntitlementId,
    premiumEntitlementId:
      extra?.revenuecat?.premiumEntitlementId ||
      FALLBACK_CONFIG.premiumEntitlementId,
    offeringIdentifier:
      extra?.revenuecat?.offeringIdentifier ||
      FALLBACK_CONFIG.offeringIdentifier,
  };
}

function getRevenueCatApiKey() {
  const isExpoGo = Constants.executionEnvironment === "storeClient";
  const config = getRevenueCatConfig();

  if (isExpoGo) {
    return config.testApiKey;
  }

  if (Platform.OS === "android") {
    return config.androidApiKey;
  }

  if (Platform.OS === "ios") {
    return config.iosApiKey;
  }

  return null;
}

async function getConfiguredOffering() {
  const { offeringIdentifier } = getRevenueCatConfig();

  if (!offeringIdentifier) {
    return null;
  }

  const offerings = await Purchases.getOfferings();

  if (offeringIdentifier === "default") {
    return offerings.current ?? null;
  }

  return offerings.all[offeringIdentifier] ?? offerings.current ?? null;
}

export async function configurePurchases() {
  if (isPurchasesConfigured) {
    return;
  }

  try {
    const apiKey = getRevenueCatApiKey();

    if (!apiKey) {
      throw new Error(
        `Missing RevenueCat API key for platform "${Platform.OS}".`
      );
    }

    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    await Purchases.configure({ apiKey });

    isPurchasesConfigured = true;
    console.log("RevenueCat configured");
  } catch (e) {
    console.log("RevenueCat configure error:", e);
  }
}

export async function initPurchases(userId: string) {
  try {
    await configurePurchases();

    if (!userId) {
      return;
    }

    await Purchases.logIn(String(userId));
    console.log("RevenueCat login:", userId);
  } catch (e) {
    console.log("RevenueCat login error:", e);
  }
}

export async function presentSubscriptionPaywall() {
  await configurePurchases();

  const { premiumEntitlementId } = getRevenueCatConfig();
  const offering = await getConfiguredOffering();

  const paywallResult = premiumEntitlementId
    ? await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: premiumEntitlementId,
        offering: offering ?? undefined,
      })
    : await RevenueCatUI.presentPaywall({
        offering: offering ?? undefined,
      });

  switch (paywallResult) {
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
      return true;
    case PAYWALL_RESULT.NOT_PRESENTED:
    case PAYWALL_RESULT.ERROR:
    case PAYWALL_RESULT.CANCELLED:
    default:
      return false;
  }
}
