import { GoogleSignin } from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  webClientId: "323152840697-4r25a9k4fd0occ021iarr5s22o3qms9t.apps.googleusercontent.com",
});

export async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices();

    const userInfo = await GoogleSignin.signIn();

    return userInfo;
  } catch (error: any) {
    console.log("Google Sign-In Error:", error);
    throw error;
  }
}