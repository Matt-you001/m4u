import Constants from "expo-constants";
import Purchases from "react-native-purchases";

const TEST_KEY = "test_hAUFSXISuwFRqhWKUcatrdmbimr";
const LIVE_KEY = "rc_live_xxxxxxxxx";

export async function configurePurchases() {
  try {
    const isExpoGo =
      Constants.executionEnvironment === "storeClient";

    const key = isExpoGo ? TEST_KEY : LIVE_KEY;

    await Purchases.configure({ apiKey: key });

    console.log("✅ RevenueCat configured");
  } catch (e) {
    console.log("❌ configure error:", e);
  }
}

export async function initPurchases(userId: string) {
  try {
    await Purchases.logIn(String(userId));
    console.log("✅ RevenueCat login:", userId);
  } catch (e) {
    console.log("❌ RevenueCat login error:", e);
  }
}

export async function buyPackage(identifier: string) {
  const offerings = await Purchases.getOfferings();

  const pkg = offerings.current?.availablePackages.find(
    (p) => p.identifier === identifier
  );

  if (!pkg) throw new Error("Package not found");

  const { customerInfo } = await Purchases.purchasePackage(pkg);

  return customerInfo;
}
