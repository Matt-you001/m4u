import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  webClientId: "323152840697-4r25a9k4fd0occ021iarr5s22o3qms9t.apps.googleusercontent.com",
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
