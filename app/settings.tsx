import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";

const RESPONSE_LANGUAGE_OPTIONS = [
  "English",
  "French",
  "Spanish",
  "German",
  "Portuguese",
  "Italian",
  "Dutch",
  "Arabic",
  "Chinese",
  "Japanese",
  "Korean",
  "Hindi",
  "Pidgin",
];

const TONE_OPTIONS = ["Polite", "Professional", "Funny", "Romantic", "Firm"];

export default function Settings() {
  const router = useRouter();

  const [responseLanguage, setResponseLanguage] = useState("English");
  const [translationLanguage, setTranslationLanguage] = useState("English");
  const [tone, setTone] = useState("Polite");

  const [customResponseLanguage, setCustomResponseLanguage] = useState("");
  const [customTranslationLanguage, setCustomTranslationLanguage] = useState("");
  const [customTone, setCustomTone] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedResponseLanguage =
      (await AsyncStorage.getItem("defaultResponseLanguage")) || "English";
    const savedTranslationLanguage =
      (await AsyncStorage.getItem("defaultTranslationLanguage")) || "";
    const savedTone =
      (await AsyncStorage.getItem("defaultResponseTone")) || "Polite";

    if (RESPONSE_LANGUAGE_OPTIONS.includes(savedResponseLanguage)) {
      setResponseLanguage(savedResponseLanguage);
    } else {
      setResponseLanguage("Other");
      setCustomResponseLanguage(savedResponseLanguage);
    }

    if (!savedTranslationLanguage) {
      setTranslationLanguage("");
    } else if (RESPONSE_LANGUAGE_OPTIONS.includes(savedTranslationLanguage)) {
      setTranslationLanguage(savedTranslationLanguage);
    } else {
      setTranslationLanguage("Other");
      setCustomTranslationLanguage(savedTranslationLanguage);
    }

    if (TONE_OPTIONS.includes(savedTone)) {
      setTone(savedTone);
    } else {
      setTone("Other");
      setCustomTone(savedTone);
    }
  };

  const save = async (key: string, value: string) => {
    await AsyncStorage.setItem(key, value);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Settings</Text>

      {/* RESPONSE LANGUAGE */}
      <Text style={styles.label}>Default Response Language</Text>
      <Picker
        selectedValue={responseLanguage}
        onValueChange={(v) => {
          setResponseLanguage(v);
          if (v !== "Other") {
            save("defaultResponseLanguage", v);
          }
        }}
      >
        <Picker.Item label="English (Default)" value="English" />
        <Picker.Item label="French" value="French" />
        <Picker.Item label="Spanish" value="Spanish" />
        <Picker.Item label="German" value="German" />
        <Picker.Item label="Portuguese" value="Portuguese" />
        <Picker.Item label="Italian" value="Italian" />
        <Picker.Item label="Dutch" value="Dutch" />
        <Picker.Item label="Arabic" value="Arabic" />
        <Picker.Item label="Chinese" value="Chinese" />
        <Picker.Item label="Japanese" value="Japanese" />
        <Picker.Item label="Korean" value="Korean" />
        <Picker.Item label="Hindi" value="Hindi" />
        <Picker.Item label="Pidgin" value="Pidgin" />
        <Picker.Item label="Other" value="Other" />
      </Picker>

      {responseLanguage === "Other" && (
        <TextInput
          placeholder="Custom response language"
          value={customResponseLanguage}
          onChangeText={(text) => {
            setCustomResponseLanguage(text);
            save("defaultResponseLanguage", text.trim());
          }}
          style={styles.input}
        />
      )}

      {/* TRANSLATE LANGUAGE */}
      <Text style={styles.label}>Default Translate Language</Text>
      <Picker
        selectedValue={translationLanguage}
        onValueChange={(v) => {
          setTranslationLanguage(v);
          if (v !== "Other") {
            save("defaultTranslationLanguage", v);
          }
        }}
      >
        <Picker.Item label="Select language" value="" />
        <Picker.Item label="English" value="English" />
        <Picker.Item label="French" value="French" />
        <Picker.Item label="Spanish" value="Spanish" />
        <Picker.Item label="German" value="German" />
        <Picker.Item label="Portuguese" value="Portuguese" />
        <Picker.Item label="Italian" value="Italian" />
        <Picker.Item label="Dutch" value="Dutch" />
        <Picker.Item label="Arabic" value="Arabic" />
        <Picker.Item label="Chinese" value="Chinese" />
        <Picker.Item label="Japanese" value="Japanese" />
        <Picker.Item label="Korean" value="Korean" />
        <Picker.Item label="Hindi" value="Hindi" />
        <Picker.Item label="Pidgin" value="Pidgin" />
        <Picker.Item label="Other" value="Other" />
      </Picker>

      {translationLanguage === "Other" && (
        <TextInput
          placeholder="Custom translation language"
          value={customTranslationLanguage}
          onChangeText={(text) => {
            setCustomTranslationLanguage(text);
            save("defaultTranslationLanguage", text.trim());
          }}
          style={styles.input}
        />
      )}

      {/* RESPONSE TONE */}
      <Text style={styles.label}>Default Response Tone</Text>
      <Picker
        selectedValue={tone}
        onValueChange={(v) => {
          setTone(v);
          if (v !== "Other") {
            save("defaultResponseTone", v);
          }
        }}
      >
        <Picker.Item label="Polite (Default)" value="Polite" />
        <Picker.Item label="Professional" value="Professional" />
        <Picker.Item label="Funny" value="Funny" />
        <Picker.Item label="Romantic" value="Romantic" />
        <Picker.Item label="Firm" value="Firm" />
        <Picker.Item label="Other" value="Other" />
      </Picker>

      {tone === "Other" && (
        <TextInput
          placeholder="Custom tone"
          value={customTone}
          onChangeText={(text) => {
            setCustomTone(text);
            save("defaultResponseTone", text.trim());
          }}
          style={styles.input}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: "#F9FAFB" },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "600",
     padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: "#4F46E5",
    marginTop: 30,
    marginBottom: 25,
  },
  pickerBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
});