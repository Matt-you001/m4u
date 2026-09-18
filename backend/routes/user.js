import bcrypt from "bcrypt";
import express from "express";
import { pool } from "../db.js";
import { PLAN_CREDITS, refreshCreditsIfDue } from "../lib/planCredits.js";
import {
  getRevenueCatActiveEntitlements,
  isRevenueCatServerVerificationConfigured,
} from "../lib/revenueCat.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

const PLAN_LIMITS = PLAN_CREDITS;

function getPlanFromRevenueCatSnapshot(entitlementIds = [], productIds = []) {
  const basicEntitlementId = String(
    process.env.REVENUECAT_BASIC_ENTITLEMENT_ID || "entl48c716552a"
  )
    .trim()
    .toLowerCase();
  const premiumEntitlementId = String(
    process.env.REVENUECAT_PREMIUM_ENTITLEMENT_ID || "entl459591f140"
  )
    .trim()
    .toLowerCase();
  const normalizedEntitlements = entitlementIds
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
  const normalizedProducts = productIds
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);

  if (
    normalizedProducts.some((item) => item.includes("premium")) ||
    normalizedEntitlements.some(
      (item) =>
        item === "premium" ||
        item === "m4u premium" ||
        item === premiumEntitlementId
    )
  ) {
    return "premium";
  }

  if (
    normalizedProducts.some((item) => item.includes("basic")) ||
    normalizedEntitlements.some(
      (item) =>
        item === "basic" ||
        item === "m4u basic" ||
        item === basicEntitlementId
    )
  ) {
    return "basic";
  }

  return "free";
}

function normalizeRevenueCatEntitlements(entitlements = []) {
  const now = Date.now();

  return entitlements
    .map((entitlement) => {
      const expirationMs = entitlement?.expirationDate
        ? Date.parse(entitlement.expirationDate)
        : null;

      return {
        identifier: String(entitlement?.identifier || "").trim(),
        productIdentifier: String(
          entitlement?.productIdentifier || ""
        ).trim(),
        isActive: entitlement?.isActive === true,
        isSandbox: entitlement?.isSandbox === true,
        expirationMs:
          Number.isFinite(expirationMs) && expirationMs > 0
            ? expirationMs
            : null,
      };
    })
    .filter(
      (entitlement) =>
        entitlement.identifier &&
        entitlement.isActive &&
        (entitlement.expirationMs === null || entitlement.expirationMs > now)
    );
}

function getSubscriptionMetadata(entitlements = []) {
  const expirationTimes = entitlements
    .map((entitlement) => entitlement.expirationMs)
    .filter((value) => Number.isFinite(value));
  const latestExpirationMs = expirationTimes.length
    ? Math.max(...expirationTimes)
    : null;

  return {
    expiresAt: latestExpirationMs
      ? new Date(latestExpirationMs).toISOString()
      : null,
    environment: entitlements.some((entitlement) => entitlement.isSandbox)
      ? "SANDBOX"
      : entitlements.length
        ? "PRODUCTION"
        : null,
    productId:
      entitlements.find((entitlement) =>
        entitlement.productIdentifier.toLowerCase().includes("premium")
      )?.productIdentifier ||
      entitlements[0]?.productIdentifier ||
      null,
  };
}

async function persistSubscriptionSnapshot(
  userId,
  {
    activeEntitlements = [],
    entitlementIds = [],
    productIds = [],
    hasDetailedEntitlements = false,
    serverVerified = false,
  } = {}
) {
  const effectiveEntitlementIds = hasDetailedEntitlements
    ? activeEntitlements.map((entitlement) => entitlement.identifier)
    : entitlementIds;
  const effectiveProductIds = hasDetailedEntitlements
    ? activeEntitlements.map((entitlement) => entitlement.productIdentifier)
    : productIds;
  const syncedPlan = getPlanFromRevenueCatSnapshot(
    effectiveEntitlementIds,
    effectiveProductIds
  );
  const subscriptionMetadata = hasDetailedEntitlements
    ? getSubscriptionMetadata(activeEntitlements)
    : { expiresAt: null, environment: null, productId: null };

  await pool.query(
    `
    UPDATE users
    SET
      plan = $1,
      credits = CASE
        WHEN plan = $1 THEN credits
        ELSE $2
      END,
      extra_credits = CASE
        WHEN plan = $1 THEN extra_credits
        ELSE 0
      END,
      last_credit_reset = CASE
        WHEN plan = $1 THEN last_credit_reset
        ELSE NOW()
      END,
      subscription_expires_at = CASE
        WHEN $7 THEN $3
        ELSE subscription_expires_at
      END,
      subscription_environment = CASE
        WHEN $7 THEN $4
        ELSE subscription_environment
      END,
      subscription_product_id = CASE
        WHEN $7 THEN $5
        ELSE subscription_product_id
      END,
      subscription_last_synced_at = NOW(),
      subscription_server_verified_at = CASE
        WHEN $8 THEN NOW()
        ELSE subscription_server_verified_at
      END
    WHERE id = $6
    `,
    [
      syncedPlan,
      PLAN_LIMITS[syncedPlan],
      subscriptionMetadata.expiresAt,
      subscriptionMetadata.environment,
      subscriptionMetadata.productId,
      userId,
      hasDetailedEntitlements,
      serverVerified,
    ]
  );

  return syncedPlan;
}

async function refreshSubscriptionFromRevenueCatServer(userId) {
  if (!isRevenueCatServerVerificationConfigured()) {
    return null;
  }

  const verificationStatus = await pool.query(
    `
    SELECT subscription_server_verified_at
    FROM users
    WHERE id = $1
    `,
    [userId]
  );
  const lastVerifiedAt = verificationStatus.rows[0]?.subscription_server_verified_at;

  if (
    lastVerifiedAt &&
    Date.now() - new Date(lastVerifiedAt).getTime() < 5 * 60 * 1000
  ) {
    return null;
  }

  const serverEntitlements = await getRevenueCatActiveEntitlements(userId);
  const activeEntitlements = normalizeRevenueCatEntitlements(
    serverEntitlements || []
  );

  return persistSubscriptionSnapshot(userId, {
    activeEntitlements,
    hasDetailedEntitlements: true,
    serverVerified: true,
  });
}

router.post("/upgrade", authenticateUser, async (req, res) => {
  return res.status(403).json({
    error: "Plan changes must be verified through RevenueCat",
  });
});

/**
 * GET /user/me
 */
router.get("/me", authenticateUser, async (req, res) => {
  try {
    try {
      await refreshSubscriptionFromRevenueCatServer(req.user.id);
    } catch (error) {
      console.error("RevenueCat /user/me verification failed:", error);
    }

    await refreshCreditsIfDue(req.user.id);

    const { rows } = await pool.query(
      `
      SELECT
        id,
        first_name,
        last_name,
        phone_number,
        email,
        plan,
        credits,
        extra_credits,
        last_credit_reset,
        subscription_expires_at,
        subscription_environment,
        subscription_product_id,
        subscription_last_synced_at,
        subscription_server_verified_at,
        referral_code,
        COALESCE((
          SELECT COUNT(*)::int
          FROM users referrals
          WHERE referrals.referred_by_user_id = users.id
            AND referrals.referral_rewarded_at IS NOT NULL
        ), 0) AS successful_referrals
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    const baseCredits = PLAN_LIMITS[user.plan] || 10;
    const usedCredits = Math.max(baseCredits - user.credits, 0);

    res.json({
      id: user.id,
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      phoneNumber: user.phone_number || "",
      email: user.email,
      plan: user.plan,
      credits: user.credits,
      extraCredits: user.extra_credits,
      totalCredits: user.credits + user.extra_credits,
      baseCredits,
      usedCredits,
      referralCode: user.referral_code || `M4U${user.id}`,
      successfulReferrals: Number(user.successful_referrals) || 0,
      subscriptionExpiresAt: user.subscription_expires_at,
      subscriptionEnvironment: user.subscription_environment,
      subscriptionProductId: user.subscription_product_id,
      subscriptionLastSyncedAt: user.subscription_last_synced_at,
      subscriptionServerVerifiedAt: user.subscription_server_verified_at,
      lastCreditReset: user.last_credit_reset,
    });
  } catch (err) {
    console.error("ME endpoint error:", err);
    res.status(500).json({ error: "Failed to load user" });
  }
});

/**
 * PATCH /user/profile
 * Body: { firstName, lastName}
 */
router.patch("/profile", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName } = req.body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({
        message: "First name and last name are required",
      });
    }

    const { rows } = await pool.query(
      `
      UPDATE users
      SET
        first_name = $1,
        last_name = $2
      WHERE id = $3
      RETURNING
        id,
        first_name,
        last_name,
        phone_number,
        email,
        plan,
        credits,
        extra_credits
      `,
      [firstName.trim(), lastName.trim(), userId]
    );

    const user = rows[0];
    const baseCredits = PLAN_LIMITS[user.plan] || 10;
    const usedCredits = Math.max(baseCredits - user.credits, 0);

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        phoneNumber: user.phone_number || "",
        email: user.email,
        plan: user.plan,
        credits: user.credits,
        extraCredits: user.extra_credits,
        totalCredits: user.credits + user.extra_credits,
        baseCredits,
        usedCredits,
      },
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

/**
 * POST /user/change-password
 * Body: { currentPassword, newPassword }
 */
router.post("/change-password", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    const strongPassword =
      newPassword.length >= 8 &&
      /[A-Z]/.test(newPassword) &&
      /[a-z]/.test(newPassword) &&
      /[0-9]/.test(newPassword) &&
      /[^A-Za-z0-9]/.test(newPassword);

    if (!strongPassword) {
      return res.status(400).json({
        message:
          "New password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      });
    }

    const result = await pool.query(
      `
      SELECT password_hash
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      `,
      [newPasswordHash, userId]
    );

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Failed to change password" });
  }
});

router.post("/sync-subscription", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const hasClientEntitlements = Array.isArray(req.body?.entitlements);
    const clientEntitlements = hasClientEntitlements
      ? normalizeRevenueCatEntitlements(req.body.entitlements)
      : [];
    let serverEntitlements = null;

    if (isRevenueCatServerVerificationConfigured()) {
      try {
        serverEntitlements = await getRevenueCatActiveEntitlements(userId);
      } catch (error) {
        console.error("RevenueCat server verification failed:", error);
      }
    }

    const hasDetailedEntitlements = Array.isArray(serverEntitlements)
      || hasClientEntitlements;
    const activeEntitlements = Array.isArray(serverEntitlements)
      ? normalizeRevenueCatEntitlements(serverEntitlements)
      : clientEntitlements;
    const entitlementIds = Array.isArray(req.body?.entitlementIds)
      ? req.body.entitlementIds
      : [];
    const productIds = Array.isArray(req.body?.productIds)
      ? req.body.productIds
      : [];

    await persistSubscriptionSnapshot(userId, {
      activeEntitlements,
      entitlementIds,
      productIds,
      hasDetailedEntitlements,
      serverVerified: Array.isArray(serverEntitlements),
    });

    await refreshCreditsIfDue(userId);

    const { rows } = await pool.query(
      `
      SELECT
        id,
        first_name,
        last_name,
        phone_number,
        email,
        plan,
        credits,
        extra_credits,
        last_credit_reset,
        subscription_expires_at,
        subscription_environment,
        subscription_product_id,
        subscription_last_synced_at,
        subscription_server_verified_at,
        referral_code,
        COALESCE((
          SELECT COUNT(*)::int
          FROM users referrals
          WHERE referrals.referred_by_user_id = users.id
            AND referrals.referral_rewarded_at IS NOT NULL
        ), 0) AS successful_referrals
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    const baseCredits = PLAN_LIMITS[user.plan] || 10;
    const usedCredits = Math.max(baseCredits - user.credits, 0);

    return res.json({
      synced: true,
      id: user.id,
      firstName: user.first_name || "",
      lastName: user.last_name || "",
      phoneNumber: user.phone_number || "",
      email: user.email,
      plan: user.plan,
      credits: user.credits,
      extraCredits: user.extra_credits,
      totalCredits: user.credits + user.extra_credits,
      baseCredits,
      usedCredits,
      referralCode: user.referral_code || `M4U${user.id}`,
      successfulReferrals: Number(user.successful_referrals) || 0,
      subscriptionExpiresAt: user.subscription_expires_at,
      subscriptionEnvironment: user.subscription_environment,
      subscriptionProductId: user.subscription_product_id,
      subscriptionLastSyncedAt: user.subscription_last_synced_at,
      subscriptionServerVerifiedAt: user.subscription_server_verified_at,
      lastCreditReset: user.last_credit_reset,
    });
  } catch (err) {
    console.error("Subscription sync error:", err);
    return res.status(500).json({ error: "Failed to sync subscription" });
  }
});

/**
 * POST /user/delete-account
 * Body: { currentPassword, confirmationText }
 */
router.post("/delete-account", authenticateUser, async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const userId = req.user.id;
    const { currentPassword, confirmationText } = req.body;

    if (!currentPassword?.trim()) {
      return res.status(400).json({
        message: "Current password is required to delete your account",
      });
    }

    if (confirmationText?.trim().toUpperCase() !== "DELETE") {
      return res.status(400).json({
        message: 'Type DELETE to confirm account deletion',
      });
    }

    const result = await client.query(
      `
      SELECT password_hash
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    await client.query("BEGIN");
    transactionStarted = true;
    await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
    await client.query("COMMIT");
    transactionStarted = false;

    res.json({
      message: "Your Message4U account has been deleted successfully",
    });
  } catch (err) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    console.error("Delete account error:", err);
    res.status(500).json({ message: "Failed to delete account" });
  } finally {
    client.release();
  }
});

export default router;
