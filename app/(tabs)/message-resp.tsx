import UpgradeModal from '@/components/UpgradeModal';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import MessageActions from '../../components/MessageActions';
import { saveToHistory } from '../../utils/history';

const TEST_MODE = true;

export default function RespondMessage() {
  const { plan, refreshUser } = useAuth();
  const [inputText, setInputText] = useState('');
  const [tone, setTone] = useState('');
  const [customTone, setCustomTone] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');
  const [language, setLanguage] = useState('');
  const [response, setResponse] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [error, setError] = useState('');

  const [defaults, setDefaults] = useState({
    responseLanguage: '',
    responseTone: '',
    translationLanguage: '',
  });

  useEffect(() => {
    (async () => {
      const rLang = await AsyncStorage.getItem('defaultResponseLanguage');
      const rTone = await AsyncStorage.getItem('defaultResponseTone');
      const tLang = await AsyncStorage.getItem('defaultTranslationLanguage');

      setDefaults({
        responseLanguage: rLang || '',
        responseTone: rTone || '',
        translationLanguage: tLang || '',
      });
    })();
  }, []);

  const finalTone = useMemo(() => {
    if (tone === 'Other') {
      return customTone.trim() || defaults.responseTone || 'Polite';
    }
    if (tone.trim()) {
      return tone.trim();
    }
    return defaults.responseTone || 'Polite';
  }, [tone, customTone, defaults.responseTone]);

  const finalResponseLanguage = useMemo(() => {
    if (language === 'Other') {
      return customLanguage.trim() || defaults.responseLanguage || 'English';
    }
    if (language.trim()) {
      return language.trim();
    }
    return defaults.responseLanguage || 'English';
  }, [language, customLanguage, defaults.responseLanguage]);

  const finalTranslationLanguage = useMemo(() => {
    if (language === 'Other') {
      return customLanguage.trim() || null;
    }
    if (language.trim()) {
      return language.trim();
    }
    if (defaults.translationLanguage?.trim()) {
      return defaults.translationLanguage.trim();
    }
    return null;
  }, [language, customLanguage, defaults.translationLanguage]);

  const handleRespond = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await api.post('/respond', {
        message: inputText,
        tone: finalTone,
        language: finalResponseLanguage,
      });

      setResponse(res.data.result);
      await refreshUser();

      if (TEST_MODE || plan !== 'free') {
        await saveToHistory({
          id: Date.now().toString(),
          type: 'respond',
          inputText,
          outputText: res.data.result,
          tone: finalTone,
          language: finalResponseLanguage,
          createdAt: Date.now(),
        });
      }
    } catch (err: any) {
      if (err.response?.status === 402) {
        setShowUpgrade(true);
      } else {
        setError(
          err?.response?.data?.debug ||
            err?.response?.data?.message ||
            'Something went wrong'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    if (!finalTranslationLanguage) {
      setError('Please select a language to translate to');
      return;
    }

    setLoading(true);
    setError('');
    setTranslation('');

    try {
      const res = await api.post('/translate', {
        message: inputText,
        targetLanguage: finalTranslationLanguage,
      });

      setTranslation(res.data.result);
      await refreshUser();

      if (TEST_MODE || plan !== 'free') {
        await saveToHistory({
          id: Date.now().toString(),
          type: 'translate',
          inputText,
          outputText: res.data.result,
          language: finalTranslationLanguage,
          createdAt: Date.now(),
        });
      }
    } catch (err: any) {
      if (err.response?.status === 402) {
        setShowUpgrade(true);
      } else {
        setError(
          err?.response?.data?.debug ||
            err?.response?.data?.message ||
            'Something went wrong'
        );
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
          placeholder="Paste message"
          value={inputText}
          onChangeText={setInputText}
          multiline
          style={styles.input}
        />

        <Text style={styles.label}>Tone</Text>
        <View style={styles.pickerBox}>
          <Picker selectedValue={tone} onValueChange={setTone}>
            <Picker.Item label="Use default" value="" />
            <Picker.Item label="Funny" value="Funny" />
            <Picker.Item label="Grateful" value="Grateful" />
            <Picker.Item label="Romantic" value="Romantic" />
            <Picker.Item label="Professional" value="Professional" />
            <Picker.Item label="Diplomatic" value="Diplomatic" />
            <Picker.Item label="Sarcastic" value="Sarcastic" />
            <Picker.Item label="Angry" value="Angry" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
        </View>

        {tone === 'Other' && (
          <TextInput
            placeholder="Custom tone"
            value={customTone}
            onChangeText={setCustomTone}
            style={styles.input}
          />
        )}

        <Text style={styles.label}>Language</Text>
        <View style={styles.pickerBox}>
          <Picker selectedValue={language} onValueChange={setLanguage}>
            <Picker.Item label="Use default" value="" />
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
        </View>

        {language === 'Other' && (
          <TextInput
            placeholder="Custom language"
            value={customLanguage}
            onChangeText={setCustomLanguage}
            style={styles.input}
          />
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.iconRow}>
          <View style={styles.iconBox}>
            <IconButton
              style={styles.iconButton}
              icon="translate"
              size={30}
              onPress={handleTranslate}
            />
            <Text style={styles.primaryText}>
              {loading ? 'Translating...' : 'Translate'}
            </Text>
          </View>

          <View style={styles.iconBox}>
            <IconButton icon="reply" size={30} onPress={handleRespond} />
            <Text style={styles.primaryText}>
              {loading ? 'Responding...' : 'Respond'}
            </Text>
          </View>
        </View>

        {!!translation && (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{translation}</Text>
            <MessageActions text={translation} />
          </View>
        )}

        {!!response && (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{response}</Text>
            <MessageActions text={response} />
          </View>
        )}
      </ScrollView>

      <UpgradeModal 
          visible={showUpgrade}
          onClose={() => setShowUpgrade(false)}
        />
      </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F9FAFB' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4F46E5',
    marginVertical: 20,
  },
  label: { fontWeight: '600', marginBottom: 6, color: '#374151' },
  pickerBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 20 },
  iconBox: { alignItems: 'center' },
  iconButton: { color: '#4F46E5' },
  primaryText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  resultCard: { backgroundColor: '#ECFEFF', padding: 14, borderRadius: 10, marginTop: 12 },
  resultText: { fontSize: 16 },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
});