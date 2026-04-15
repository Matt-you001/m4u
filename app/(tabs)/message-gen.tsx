import UpgradeModal from '@/components/UpgradeModal';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MessageActions from '../../components/MessageActions';
import { saveToHistory } from '../../utils/history';

const TEST_MODE = true;
const SPEECH_LANGUAGE_MAP: Record<string, string> = {
  English: 'en-US',
  French: 'fr-FR',
  Spanish: 'es-ES',
  German: 'de-DE',
  Portuguese: 'pt-PT',
  Italian: 'it-IT',
  Dutch: 'nl-NL',
  Arabic: 'ar-SA',
  Chinese: 'zh-CN',
  Japanese: 'ja-JP',
  Korean: 'ko-KR',
  Hindi: 'hi-IN',
  Pidgin: 'en-NG',
};

export default function GenerateScreen() {
  const { plan, refreshUser } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [tone, setTone] = useState('');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [relationship, setRelationship] = useState('');
  const [context, setContext] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customTone, setCustomTone] = useState('');
  const [customRelationship, setCustomRelationship] = useState('');
  const [language, setLanguage] = useState('English');
  const [customLanguage, setCustomLanguage] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voicePromptSupported, setVoicePromptSupported] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [isCheckingVoiceSupport, setIsCheckingVoiceSupport] = useState(true);
  const voiceContextBaseRef = useRef('');

  const finalTone = useMemo(() => {
    if (tone === 'Other') {
      return customTone.trim();
    }
    return tone.trim();
  }, [tone, customTone]);

  const finalCategory = useMemo(() => {
    if (category === 'Other') {
      return customCategory.trim();
    }
    return category.trim();
  }, [category, customCategory]);

  const finalRelationship = useMemo(() => {
    if (relationship === 'Other') {
      return customRelationship.trim();
    }
    return relationship.trim();
  }, [relationship, customRelationship]);

  const finalLanguage = useMemo(() => {
    if (language === 'Other') {
      return customLanguage.trim();
    }
    return language.trim() || 'English';
  }, [language, customLanguage]);

  const speechRecognitionLocale = useMemo(() => {
    return SPEECH_LANGUAGE_MAP[finalLanguage] || 'en-US';
  }, [finalLanguage]);

  useEffect(() => {
    let isMounted = true;

    const checkVoicePromptAvailability = async () => {
      try {
        const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
        if (isMounted) {
          setVoicePromptSupported(available);
        }
      } catch {
        if (isMounted) {
          setVoicePromptSupported(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingVoiceSupport(false);
        }
      }
    };

    checkVoicePromptAvailability();

    return () => {
      isMounted = false;
      ExpoSpeechRecognitionModule.stop();
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setVoiceStatus('Listening... describe what the message should contain.');
    setError('');
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    setVoiceStatus('Voice prompt added to the context field.');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript?.trim();

    if (!transcript) {
      return;
    }

    const baseContext = voiceContextBaseRef.current.trim();
    const nextContext = baseContext ? `${baseContext}\n${transcript}` : transcript;
    setContext(nextContext);
    setVoiceStatus(
      event.isFinal
        ? 'Voice prompt added to the context field.'
        : 'Listening... describe what the message should contain.'
    );
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    setVoiceStatus('');
    setError(
      event.error === 'not-allowed'
        ? 'Microphone and speech recognition permission is required for voice prompts.'
        : event.message || 'Voice prompt could not be completed.'
    );
  });

  const startVoicePrompt = async () => {
    if (loading || isListening) return;

    setError('');
    setVoiceStatus('Starting microphone...');

    try {
      const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!available) {
        setVoicePromptSupported(false);
        setVoiceStatus('');
        setError('Voice prompt is not available on this device.');
        return;
      }

      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setVoiceStatus('');
        setError(
          'Microphone and speech recognition permission is required for voice prompts.'
        );
        return;
      }

      voiceContextBaseRef.current = context.trim();
      ExpoSpeechRecognitionModule.start({
        lang: speechRecognitionLocale,
        interimResults: true,
        addsPunctuation: true,
        maxAlternatives: 1,
        continuous: false,
      });
    } catch {
      setIsListening(false);
      setVoiceStatus('');
      setError('Unable to start voice prompt right now.');
    }
  };

  const stopVoicePrompt = () => {
    if (!isListening) return;

    setVoiceStatus('Finishing voice prompt...');
    ExpoSpeechRecognitionModule.stop();
  };

  const generateMessage = async () => {
    if (loading) return;

    if (!finalCategory) {
      setError('Please select a category');
      return;
    }

    if (tone === 'Other' && !customTone.trim()) {
      setError('Please enter a custom tone');
      return;
    }

    if (category === 'Other' && !customCategory.trim()) {
      setError('Please enter a custom category');
      return;
    }

    if (relationship === 'Other' && !customRelationship.trim()) {
      setError('Please enter a custom relationship');
      return;
    }

    if (language === 'Other' && !customLanguage.trim()) {
      setError('Please enter a custom language');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      const res = await api.post('/generate', {
        tone: finalTone,
        category: finalCategory,
        name: name.trim(),
        gender: gender.trim(),
        relationship: finalRelationship,
        context: context.trim(),
        language: finalLanguage,
      });

      const generatedText = (res?.data?.result || '').trim();
      setResult(generatedText);

      await refreshUser();

      if (TEST_MODE || plan !== 'free') {
        await saveToHistory({
          id: Date.now().toString(),
          type: 'result',
          inputText: context.trim() || finalCategory,
          outputText: generatedText,
          tone: finalTone,
          language: finalLanguage,
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
            'Something went wrong.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Message Generator</Text>

        <View style={styles.pickerBox}>
          <Picker selectedValue={tone} onValueChange={setTone}>
            <Picker.Item label="Select tone..." value="" />
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
            placeholder="Enter custom tone"
            style={styles.input}
            value={customTone}
            onChangeText={setCustomTone}
          />
        )}

        <View style={styles.pickerBox}>
          <Picker selectedValue={category} onValueChange={setCategory}>
            <Picker.Item label="Select category..." value="" />
            <Picker.Item label="Birthday" value="Birthday" />
            <Picker.Item label="Anniversary" value="Anniversary" />
            <Picker.Item label="New Month" value="New Month" />
            <Picker.Item label="New Year" value="New Year" />
            <Picker.Item label="Christmas" value="Christmas" />
            <Picker.Item label="Wedding" value="Wedding" />
            <Picker.Item label="Apology" value="Apology" />
            <Picker.Item label="Congratulations" value="Congratulations" />
            <Picker.Item label="Wedding Anniversary" value="Wedding Anniversary" />
            <Picker.Item label="Graduation" value="Graduation" />
            <Picker.Item label="Promotion" value="Promotion" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
        </View>

        {category === 'Other' && (
          <TextInput
            placeholder="Enter custom category"
            style={styles.input}
            value={customCategory}
            onChangeText={setCustomCategory}
          />
        )}

        <TextInput
          placeholder="Recipient name"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <View style={styles.pickerBox}>
          <Picker selectedValue={gender} onValueChange={setGender}>
            <Picker.Item label="Select gender..." value="" />
            <Picker.Item label="Male" value="Male" />
            <Picker.Item label="Female" value="Female" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
        </View>

        <View style={styles.pickerBox}>
          <Picker selectedValue={relationship} onValueChange={setRelationship}>
            <Picker.Item label="Select relationship..." value="" />
            <Picker.Item label="Child" value="Child" />
            <Picker.Item label="Parent" value="Parent" />
            <Picker.Item label="Sibling" value="Sibling" />
            <Picker.Item label="Partner" value="Partner" />
            <Picker.Item label="Boss" value="Boss" />
            <Picker.Item label="Friend" value="Friend" />
            <Picker.Item label="Client" value="Client" />
            <Picker.Item label="Colleague" value="Colleague" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
        </View>

        {relationship === 'Other' && (
          <TextInput
            placeholder="Enter relationship"
            style={styles.input}
            value={customRelationship}
            onChangeText={setCustomRelationship}
          />
        )}

        <TextInput
          placeholder="Context (optional)"
          style={[styles.input, { height: 90 }]}
          multiline
          value={context}
          onChangeText={setContext}
        />

        <View style={styles.voiceCard}>
          <View style={styles.voiceHeader}>
            <View style={styles.voiceCopy}>
              <Text style={styles.voiceTitle}>Voice Prompt</Text>
              <Text style={styles.voiceHint}>
                Speak your ideas and we will place the transcript in the context
                field above.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.voiceButton,
                isListening && styles.voiceButtonActive,
                (!voicePromptSupported || loading || isCheckingVoiceSupport) &&
                  styles.voiceButtonDisabled,
              ]}
              onPress={isListening ? stopVoicePrompt : startVoicePrompt}
              disabled={!voicePromptSupported || loading || isCheckingVoiceSupport}
            >
              {isCheckingVoiceSupport ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={isListening ? 'stop-circle' : 'mic'}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.voiceButtonText}>
                    {isListening ? 'Stop' : 'Use Voice'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {!voicePromptSupported && !isCheckingVoiceSupport && (
            <Text style={styles.voiceUnavailable}>
              Voice prompt is not available on this device yet.
            </Text>
          )}

          {!!voiceStatus && <Text style={styles.voiceStatus}>{voiceStatus}</Text>}
        </View>

        <Text style={styles.label}>Language</Text>
        <View style={styles.pickerBox}>
          <Picker selectedValue={language} onValueChange={setLanguage}>
            <Picker.Item label="Select Language..." value="" />
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
            placeholder="Enter custom language"
            style={styles.input}
            value={customLanguage}
            onChangeText={setCustomLanguage}
          />
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={generateMessage}
          disabled={loading}
        >
          <Text style={styles.primaryText}>
            {loading ? 'Generating...' : 'Generate Message'}
          </Text>
        </TouchableOpacity>

        {!!result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{result}</Text>
            <MessageActions text={result} />
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
  voiceCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  voiceHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceCopy: {
    flex: 1,
  },
  voiceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#312E81',
    marginBottom: 4,
  },
  voiceHint: {
    color: '#4338CA',
    lineHeight: 20,
  },
  voiceButton: {
    minWidth: 118,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  voiceButtonActive: {
    backgroundColor: '#DC2626',
  },
  voiceButtonDisabled: {
    opacity: 0.6,
  },
  voiceButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  voiceStatus: {
    marginTop: 10,
    color: '#3730A3',
    fontWeight: '500',
  },
  voiceUnavailable: {
    marginTop: 10,
    color: '#991B1B',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: '#ECFEFF',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  resultText: { fontSize: 16 },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
});
