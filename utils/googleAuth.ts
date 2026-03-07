import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId:
      "136204403181-mvra2qhlpbttc77h7uqip8eb9c9frr6q.apps.googleusercontent.com",

    androidClientId:
      "136204403181-9jakgssh8r0qgavcrjug79oslaf9kud2.apps.googleusercontent.com",

    iosClientId:
      "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
  });

  return { request, response, promptAsync };
}
