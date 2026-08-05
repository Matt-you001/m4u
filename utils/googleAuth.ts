import Constants from "expo-constants";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

type GoogleAuthConfig = {
  androidClientId?: string;
  webClientId?: string;
};

function getGoogleAuthConfig(): GoogleAuthConfig {
  const extra = Constants.expoConfig?.extra as
    | {
        googleAuth?: GoogleAuthConfig;
      }
    | undefined;

  return {
    androidClientId:
      extra?.googleAuth?.androidClientId ||
      "1051139924143-khl8kl4um2jhn13kgvgjm4c2eqs44uq1.apps.googleusercontent.com",
    webClientId:
      extra?.googleAuth?.webClientId ||
      "1051139924143-mm1c6klh2tcde54kr0jhgmj5scvbjf2q.apps.googleusercontent.com",
  };
}

const googleAuthConfig = getGoogleAuthConfig();

GoogleSignin.configure({
  webClientId: googleAuthConfig.webClientId,
  offlineAccess: false,
});

export function getGoogleSignInErrorMessage(error: any) {
  const code = error?.code ? String(error.code) : "";
  const message = error?.message ? String(error.message) : "";

  if (code === statusCodes.SIGN_IN_CANCELLED) {
    return "Google sign-in was cancelled.";
  }

  if (code === statusCodes.IN_PROGRESS) {
    return "Google sign-in is already in progress.";
  }

  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return "Google Play Services is not available on this device.";
  }

  if (code === "10" || message.includes("DEVELOPER_ERROR")) {
    return "Google Sign-In is not configured correctly for this Android app yet. Add the correct SHA certificate in Firebase and download an updated google-services.json file.";
  }

  return message || "Google sign-in failed. Try again.";
}

export async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices();
    await GoogleSignin.signOut();
    const userInfo = await GoogleSignin.signIn();

    return userInfo;
  } catch (error: any) {
    console.log("Google Sign-In Error:", {
      code: error?.code,
      message: error?.message,
      details: error,
    });
    throw error;
  }
}

export function mapGoogleUser(userInfo: any) {
  const user = userInfo?.data?.user || userInfo?.user || {};

  return {
    email: String(user.email || "").trim().toLowerCase(),
    firstName: String(user.givenName || user.firstName || "").trim(),
    lastName: String(user.familyName || user.lastName || "").trim(),
  };
}
