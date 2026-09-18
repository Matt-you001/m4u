const REVENUECAT_API_BASE_URL = "https://api.revenuecat.com/v2";

export function isRevenueCatServerVerificationConfigured() {
  return Boolean(
    process.env.REVENUECAT_SECRET_API_KEY &&
      process.env.REVENUECAT_PROJECT_ID
  );
}

export async function getRevenueCatActiveEntitlements(customerId) {
  if (!isRevenueCatServerVerificationConfigured()) {
    return null;
  }

  const projectId = encodeURIComponent(process.env.REVENUECAT_PROJECT_ID);
  const encodedCustomerId = encodeURIComponent(String(customerId));
  const response = await fetch(
    `${REVENUECAT_API_BASE_URL}/projects/${projectId}/customers/${encodedCustomerId}/active_entitlements?limit=100`,
    {
      headers: {
        Authorization: `Bearer ${process.env.REVENUECAT_SECRET_API_KEY}`,
        Accept: "application/json",
      },
    }
  );

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `RevenueCat active-entitlements request failed (${response.status}): ${responseText.slice(0, 300)}`
    );
  }

  const payload = await response.json();
  const now = Date.now();

  return (Array.isArray(payload?.items) ? payload.items : [])
    .map((item) => {
      const expirationMs = Number(item?.expires_at);

      return {
        identifier: String(item?.entitlement_id || "").trim(),
        productIdentifier: "",
        isActive:
          !Number.isFinite(expirationMs) ||
          expirationMs <= 0 ||
          expirationMs > now,
        isSandbox: false,
        expirationDate:
          Number.isFinite(expirationMs) && expirationMs > 0
            ? new Date(expirationMs).toISOString()
            : null,
      };
    })
    .filter((item) => item.identifier && item.isActive);
}
