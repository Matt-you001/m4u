import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  AdEventType,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

type AdmobConfig = {
  androidBannerAdUnitId?: string;
  iosBannerAdUnitId?: string;
  androidInterstitialAdUnitId?: string;
  iosInterstitialAdUnitId?: string;
  androidRewardedAdUnitId?: string;
  iosRewardedAdUnitId?: string;
};

const INTERSTITIAL_ACTION_COUNT_KEY = "admobInterstitialActionCount";
const INTERSTITIAL_LAST_SHOWN_AT_KEY = "admobInterstitialLastShownAt";
const INTERSTITIAL_TRIGGER_THRESHOLD = 4;
const INTERSTITIAL_COOLDOWN_MS = 10 * 60 * 1000;

const admobConfig = (Constants.expoConfig?.extra?.admob || {}) as AdmobConfig;

function pickUnitId(androidId?: string, iosId?: string, fallback?: string) {
  const configuredId = Platform.select({
    android: androidId,
    ios: iosId,
    default: fallback,
  });

  return configuredId || fallback || "";
}

export const bannerAdUnitId = pickUnitId(
  admobConfig.androidBannerAdUnitId,
  admobConfig.iosBannerAdUnitId,
  TestIds.BANNER
);

export const interstitialAdUnitId = pickUnitId(
  admobConfig.androidInterstitialAdUnitId,
  admobConfig.iosInterstitialAdUnitId,
  TestIds.INTERSTITIAL
);

export const rewardedAdUnitId = pickUnitId(
  admobConfig.androidRewardedAdUnitId,
  admobConfig.iosRewardedAdUnitId,
  TestIds.REWARDED
);

export const defaultBannerSize = BannerAdSize.ANCHORED_ADAPTIVE_BANNER;

export async function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const rewardedAd = RewardedAd.createForAdRequest(rewardedAdUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    let earnedReward = false;
    let settled = false;

    const unsubscribeLoaded = rewardedAd.addAdEventListener(AdEventType.LOADED, () => {
      rewardedAd.show().catch((error) => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(error);
        }
      });
    });

    const unsubscribeReward = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        earnedReward = true;
      }
    );

    const unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve(earnedReward);
      }
    });

    const unsubscribeError = rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(error);
      }
    });

    function cleanup() {
      unsubscribeLoaded();
      unsubscribeReward();
      unsubscribeClosed();
      unsubscribeError();
    }

    rewardedAd.load();
  });
}

async function showInterstitialAd(): Promise<void> {
  return new Promise((resolve, reject) => {
    const interstitialAd = InterstitialAd.createForAdRequest(interstitialAdUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    let settled = false;

    const unsubscribeLoaded = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      interstitialAd.show().catch((error) => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(error);
        }
      });
    });

    const unsubscribeClosed = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve();
      }
    });

    const unsubscribeError = interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(error);
      }
    });

    function cleanup() {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    }

    interstitialAd.load();
  });
}

export async function maybeShowInterstitialAd(plan?: string): Promise<boolean> {
  if ((plan || "").toLowerCase() !== "free") {
    return false;
  }

  const now = Date.now();
  const [countRaw, lastShownRaw] = await Promise.all([
    AsyncStorage.getItem(INTERSTITIAL_ACTION_COUNT_KEY),
    AsyncStorage.getItem(INTERSTITIAL_LAST_SHOWN_AT_KEY),
  ]);

  const nextCount = Number(countRaw || "0") + 1;
  const lastShownAt = Number(lastShownRaw || "0");
  const cooldownElapsed =
    !lastShownAt || Number.isNaN(lastShownAt) || now - lastShownAt >= INTERSTITIAL_COOLDOWN_MS;

  if (nextCount < INTERSTITIAL_TRIGGER_THRESHOLD || !cooldownElapsed) {
    await AsyncStorage.setItem(INTERSTITIAL_ACTION_COUNT_KEY, String(nextCount));
    return false;
  }

  await Promise.all([
    AsyncStorage.setItem(INTERSTITIAL_ACTION_COUNT_KEY, "0"),
    AsyncStorage.setItem(INTERSTITIAL_LAST_SHOWN_AT_KEY, String(now)),
  ]);

  try {
    await showInterstitialAd();
    return true;
  } catch {
    return false;
  }
}
