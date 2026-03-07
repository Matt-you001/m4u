/*import UpgradeModal from '@/components/UpgradeModal';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import * as Localization from 'expo-localization';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

export default function RespondMessage({ settings }) {
  const [inputText, setInputText] = useState('');
  const [tone, setTone] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!inputText.trim()) return;

    const locale = Localization.locale;
    const language = locale.split('-')[0];
    setDetectedLanguage(language);
  }, [inputText]);

  const resolveResponseLanguage = () => {
    if (selectedLanguage) return selectedLanguage;
    if (settings?.defaultResponseLanguage) return settings.defaultResponseLanguage;
    if (detectedLanguage) return detectedLanguage;
    return 'English';
  };

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const res = await api.post('/respond', {
        message: inputText,
        tone,
        language: resolveResponseLanguage(),
      });

      setResponse(res.data.result);

      await refreshUser();
    } catch (err: any) {
      if (err.response?.status === 402) {
        setShowUpgrade(true);
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Respond to a Message</Text>

        <TextInput
          label="Paste Message Here"
          value={inputText}
          onChangeText={setInputText}
          multiline
          style={styles.input}
        />

        {detectedLanguage ? (
          <Text style={styles.detected}>Detected language: {detectedLanguage}</Text>
        ) : null}

        <TextInput label="Desired Tone (Optional)" value={tone} onChangeText={setTone} style={styles.input} />
        <TextInput label="Response Language (Optional)" value={selectedLanguage} onChangeText={setSelectedLanguage} style={styles.input} />

        <Button mode="contained" onPress={handleGenerate} loading={loading} style={styles.button}>
          Generate Response
        </Button>

        {response !== '' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{response}</Text>
          </View>
        )}
      </ScrollView>

      {/* ✅ THIS IS THE FIX */}
     /* <UpgradeModal visible={showUpgrade} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F9FAFB' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingTop: 10,
    textAlign: 'center',
    color: '#000',
    marginBottom: 20,
  },
  input: { marginBottom: 12, backgroundColor: 'white' },
  detected: { fontSize: 13, marginBottom: 10, color: '#2563EB' },
  button: { marginVertical: 15 },
  resultCard: {
    backgroundColor: '#ECFEFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  resultText: { fontSize: 16, marginBottom: 10 },
});*/
