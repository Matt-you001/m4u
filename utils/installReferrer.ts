import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

const INSTALL_REFERRER_CHECKED_KEY = 'm4u_install_referrer_checked';
const STORED_REFERRAL_CODE_KEY = 'm4u_install_referral_code';

type InstallReferrerResponse = {
  installReferrer?: string | null;
  referrerClickTimestampSeconds?: number;
  installBeginTimestampSeconds?: number;
  googlePlayInstantParam?: boolean;
} | null;

type InstallReferrerNativeModule = {
  getInstallReferrer?: () => Promise<InstallReferrerResponse>;
};

function extractReferralCode(installReferrer: string) {
  const normalized = String(installReferrer || '').trim();

  if (!normalized) {
    return '';
  }

  const params = new URLSearchParams(normalized);
  const referralCode =
    params.get('referral_code') || params.get('ref') || params.get('referralCode') || '';

  return referralCode.trim().toUpperCase();
}

export async function getStoredReferralCode() {
  const code = await AsyncStorage.getItem(STORED_REFERRAL_CODE_KEY);
  return String(code || '').trim().toUpperCase();
}

export async function clearStoredReferralCode() {
  await AsyncStorage.removeItem(STORED_REFERRAL_CODE_KEY);
}

export async function captureAndroidInstallReferralCode() {
  if (Platform.OS !== 'android') {
    return '';
  }

  const alreadyChecked = await AsyncStorage.getItem(INSTALL_REFERRER_CHECKED_KEY);
  if (alreadyChecked) {
    return getStoredReferralCode();
  }

  const nativeModule =
    NativeModules.InstallReferrerModule as InstallReferrerNativeModule | undefined;

  if (!nativeModule?.getInstallReferrer) {
    await AsyncStorage.setItem(INSTALL_REFERRER_CHECKED_KEY, '1');
    return '';
  }

  try {
    const response = await nativeModule.getInstallReferrer();
    const referralCode = extractReferralCode(response?.installReferrer || '');

    if (referralCode) {
      await AsyncStorage.setItem(STORED_REFERRAL_CODE_KEY, referralCode);
    }

    await AsyncStorage.setItem(INSTALL_REFERRER_CHECKED_KEY, '1');
    return referralCode;
  } catch (error) {
    console.log('install referrer capture failed', error);
    await AsyncStorage.setItem(INSTALL_REFERRER_CHECKED_KEY, '1');
    return '';
  }
}
