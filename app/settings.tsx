import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

export default function Settings() {
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
    setResponseLanguage(
      (await AsyncStorage.getItem("defaultResponseLanguage")) || "English"
    );
    setTranslationLanguage(
      (await AsyncStorage.getItem("defaultTranslationLanguage")) || "English"
    );
    setTone((await AsyncStorage.getItem("defaultResponseTone")) || "Polite");
  };

  const save = async (key: string, value: string) => {
    await AsyncStorage.setItem(key, value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* RESPONSE LANGUAGE */}
      <Text style={styles.label}>Default Response Language</Text>
      <Picker
        selectedValue={responseLanguage}
        onValueChange={(v) => {
          setResponseLanguage(v);
          save(
            "defaultResponseLanguage",
            v === "Other" ? customResponseLanguage : v
          );
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
          onChangeText={setCustomResponseLanguage}
          style={styles.input}
        />
      )}

      {/* TRANSLATE LANGUAGE */}
      <Text style={styles.label}>Default Translate Language</Text>
      <Picker
        selectedValue={translationLanguage}
        onValueChange={(v) => {
          setTranslationLanguage(v);
          save(
            "defaultTranslationLanguage",
            v === "Other" ? customTranslationLanguage : v
          );
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

      {translationLanguage === "Other" && (
        <TextInput
          placeholder="Custom translation language"
          value={customTranslationLanguage}
          onChangeText={setCustomTranslationLanguage}
          style={styles.input}
        />
      )}

      {/* RESPONSE TONE */}
      <Text style={styles.label}>Default Response Tone</Text>
      <Picker
        selectedValue={tone}
        onValueChange={(v) => {
          setTone(v);
          save("defaultResponseTone", v === "Other" ? customTone : v);
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
          onChangeText={setCustomTone}
          style={styles.input}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  label: { marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
  },
});
