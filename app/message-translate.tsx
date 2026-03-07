import { useEffect } from "react";
import { Text, View } from "react-native";
import api from "../utils/api";

export default function TranslateMessage() {
  useEffect(() => {
    const translateMessage = async () => {
      const res = await api.post("/translate", {
        message: "Good morning my friend",
      });

      console.log("📱 TRANSLATION RESULT:", res.data);
    };

    translateMessage();
  }, []);

  return (
    <View>
      <Text>Translating…</Text>
    </View>
  );
}
