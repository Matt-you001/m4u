/*import Purchases from "react-native-purchases";

/**
 * MUST run once before anything else.
 * This connects the app to RevenueCat.
 */
/*export async function configurePurchases() {
  await Purchases.configure({
    apiKey: "sk_DSNVVUhbzgdLSYLdeeSFbwLsxlIBJ",
  });
}

/**
 * Attach a logged in user to RevenueCat
 */
/*export async function initPurchases(userId: string) {
  await Purchases.logIn(userId);
}

/**
 * Buy a package
 */
/*export async function buyPackage(identifier: string) {
  const offerings = await Purchases.getOfferings();

  const pkg = offerings.current?.availablePackages.find(
    (p) => p.identifier === identifier
  );

  if (!pkg) throw new Error("Package not found");

  const { customerInfo } = await Purchases.purchasePackage(pkg);

  return customerInfo;
}*/
