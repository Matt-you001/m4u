import UpgradeModal from '@/components/UpgradeModal';
import { useAuth } from '@/context/AuthContext';
import {
  bannerAdUnitId,
  defaultBannerSize,
  maybeShowInterstitialAd,
  showRewardedAd,
} from '@/utils/admob';
import api from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useRouter } from 'expo-router';
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
import { BannerAd } from 'react-native-google-mobile-ads';
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

type GeneratorMode = 'individual' | 'corporate';
type MessageLength = 'Short' | 'Medium' | 'Long';

const CORPORATE_PLATFORMS = [
  'Instagram',
  'WhatsApp',
  'X',
  'Facebook',
  'Email',
  'SMS',
  'LinkedIn',
  'Website',
  'Other',
];

const CORPORATE_TONES = [
  'Professional',
  'Persuasive',
  'Friendly',
  'Urgent',
  'Luxury',
  'Confident',
  'Warm',
  'Exciting',
  'Direct',
  'Other',
];

const CORPORATE_CATEGORIES = [
  'Promotion',
  'Sales',
  'Offer',
  'Product Launch',
  'Announcement',
  'Reminder',
  'Customer Retention',
  'Holiday Campaign',
  'Event Marketing',
  'Follow-up',
  'Email Campaign',
  'Other',
];

const CORPORATE_AUDIENCES = [
  'New Customers',
  'Existing Customers',
  'VIP Customers',
  'General Audience',
  'Students',
  'Parents',
  'Professionals',
  'Other',
];

export default function GenerateScreen() {
  const router = useRouter();
  const { plan, credits, refreshUser, clearSession, setAvailableCredits } = useAuth();
  const [mode, setMode] = useState<GeneratorMode>('individual');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [watchAdLoading, setWatchAdLoading] = useState(false);

  const [tone, setTone] = useState('');
  const [category, setCategory] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [context, setContext] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [customTone, setCustomTone] = useState('');
  const [customRelationship, setCustomRelationship] = useState('');

  const [businessTone, setBusinessTone] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [productName, setProductName] = useState('');
  const [businessPlatform, setBusinessPlatform] = useState('');
  const [businessAudience, setBusinessAudience] = useState('');
  const [businessContext, setBusinessContext] = useState('');
  const [businessCallToAction, setBusinessCallToAction] = useState('');
  const [messageLength, setMessageLength] = useState<MessageLength>('Medium');
  const [customBusinessCategory, setCustomBusinessCategory] = useState('');
  const [customBusinessTone, setCustomBusinessTone] = useState('');
  const [customBusinessPlatform, setCustomBusinessPlatform] = useState('');
  const [customBusinessAudience, setCustomBusinessAudience] = useState('');

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

  const finalBusinessTone = useMemo(() => {
    if (businessTone === 'Other') {
      return customBusinessTone.trim();
    }
    return businessTone.trim();
  }, [businessTone, customBusinessTone]);

  const finalBusinessCategory = useMemo(() => {
    if (businessCategory === 'Other') {
      return customBusinessCategory.trim();
    }
    return businessCategory.trim();
  }, [businessCategory, customBusinessCategory]);

  const finalBusinessPlatform = useMemo(() => {
    if (businessPlatform === 'Other') {
      return customBusinessPlatform.trim();
    }
    return businessPlatform.trim();
  }, [businessPlatform, customBusinessPlatform]);

  const finalBusinessAudience = useMemo(() => {
    if (businessAudience === 'Other') {
      return customBusinessAudience.trim();
    }
    return businessAudience.trim();
  }, [businessAudience, customBusinessAudience]);

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
        const available =
          await ExpoSpeechRecognitionModule.isRecognitionAvailable();
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

  const handleModeChange = (nextMode: GeneratorMode) => {
    if (nextMode === 'corporate' && plan === 'free') {
      router.push('/upgrade');
      return;
    }

    setError('');
    setResult('');
    setMode(nextMode);
  };

  const startVoicePrompt = async () => {
    if (loading || isListening || mode !== 'individual') return;

    setError('');
    setVoiceStatus('Starting microphone...');

    try {
      const available =
        await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!available) {
        setVoicePromptSupported(false);
        setVoiceStatus('');
        setError('Voice prompt is not available on this device.');
        return;
      }

      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
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

  const handleWatchAd = async () => {
    if (watchAdLoading || plan !== 'free') return;

    try {
      setWatchAdLoading(true);
      setError('');

      const earnedReward = await showRewardedAd();

      if (!earnedReward) {
        setError('You need to complete the rewarded ad to receive a credit.');
        return;
      }

      await api.post('/ads/reward');
      await refreshUser();
      setShowUpgrade(false);
      setError('Reward received. 1 credit has been added to your account.');
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          'Could not complete the ad reward right now.'
      );
    } finally {
      setWatchAdLoading(false);
    }
  };

  const validateIndividualForm = () => {
    if (!finalTone) return 'Please select a tone';
    if (!finalCategory) return 'Please select a category';
    if (tone === 'Other' && !customTone.trim()) {
      return 'Please enter a custom tone';
    }
    if (category === 'Other' && !customCategory.trim()) {
      return 'Please enter a custom category';
    }
    if (relationship === 'Other' && !customRelationship.trim()) {
      return 'Please enter a custom relationship';
    }
    if (language === 'Other' && !customLanguage.trim()) {
      return 'Please enter a custom language';
    }
    return '';
  };

  const validateCorporateForm = () => {
    if (!finalBusinessTone) return 'Please select a business tone';
    if (!finalBusinessCategory) return 'Please select a message goal';
    if (!productName.trim()) return 'Please enter a product or service name';
    if (!finalBusinessPlatform) return 'Please select a platform';
    if (!finalBusinessAudience) return 'Please select a target audience';
    if (businessTone === 'Other' && !customBusinessTone.trim()) {
      return 'Please enter a custom business tone';
    }
    if (businessCategory === 'Other' && !customBusinessCategory.trim()) {
      return 'Please enter a custom message goal';
    }
    if (businessPlatform === 'Other' && !customBusinessPlatform.trim()) {
      return 'Please enter a custom platform';
    }
    if (businessAudience === 'Other' && !customBusinessAudience.trim()) {
      return 'Please enter a custom target audience';
    }
    if (language === 'Other' && !customLanguage.trim()) {
      return 'Please enter a custom language';
    }
    return '';
  };

  const generateMessage = async () => {
    if (loading) return;

    const validationError =
      mode === 'individual' ? validateIndividualForm() : validateCorporateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      const payload =
        mode === 'individual'
          ? {
              mode: 'individual',
              tone: finalTone,
              category: finalCategory,
              name: recipientName.trim(),
              sender: senderName.trim(),
              relationship:
                relationship === 'Other'
                  ? customRelationship.trim()
                  : relationship.trim(),
              context: context.trim(),
              language: finalLanguage,
            }
          : {
              mode: 'corporate',
              tone: finalBusinessTone,
              category: finalBusinessCategory,
              businessName: businessName.trim(),
              productName: productName.trim(),
              platform: finalBusinessPlatform,
              audience: finalBusinessAudience,
              context: businessContext.trim(),
              callToAction: businessCallToAction.trim(),
              messageLength,
              language: finalLanguage,
            };

      const res = await api.post('/generate', payload);

      const generatedText = (res?.data?.result || '').trim();
      setResult(generatedText);
      const nextCredits = Number(res?.data?.remainingCredits);
      setAvailableCredits(
        Number.isFinite(nextCredits) ? nextCredits : Math.max(0, credits - 1)
      );

      await refreshUser();
      await maybeShowInterstitialAd(plan);

      if (TEST_MODE || plan !== 'free') {
        await saveToHistory({
          id: Date.now().toString(),
          type: mode === 'corporate' ? 'corporate' : 'result',
          inputText:
            mode === 'corporate'
              ? `${finalBusinessCategory} for ${productName.trim()} on ${finalBusinessPlatform}`
              : context.trim() || finalCategory,
          outputText: generatedText,
          tone: mode === 'corporate' ? finalBusinessTone : finalTone,
          language: finalLanguage,
          platform: mode === 'corporate' ? finalBusinessPlatform : undefined,
          createdAt: Date.now(),
        });
      }
    } catch (err: any) {
      if (err.response?.status === 402) {
        setShowUpgrade(true);
      } else if (err.response?.status === 401) {
        await clearSession();
        setError('Your session has expired. Please log in again.');
        router.replace({
          pathname: '/login',
          params: { message: 'Your session has expired. Please log in again.' },
        });
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

        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'individual' && styles.modeButtonActive,
            ]}
            onPress={() => handleModeChange('individual')}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === 'individual' && styles.modeButtonTextActive,
              ]}
            >
              Individual
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'corporate' && styles.modeButtonActive,
              plan === 'free' && styles.modeButtonLocked,
            ]}
            onPress={() => handleModeChange('corporate')}
          >
            <View style={styles.modeButtonRow}>
              <Text
                style={[
                  styles.modeButtonText,
                  mode === 'corporate' && styles.modeButtonTextActive,
                ]}
              >
                Corporate
              </Text>
              {plan === 'free' && (
                <View style={styles.lockBadge}>
                  <Ionicons
                    name="lock-closed"
                    size={11}
                    color={mode === 'corporate' ? '#4F46E5' : '#FFFFFF'}
                  />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {mode === 'corporate' && (
          <View style={styles.modeInfoCard}>
            <Text style={styles.modeInfoTitle}>Corporate Generator</Text>
            <Text style={styles.modeInfoText}>
              Create promotions, sales messages, campaign copy, and business
              announcements for larger audiences.
            </Text>
          </View>
        )}

        {plan === 'free' && (
          <View style={styles.bannerWrap}>
            <BannerAd
              unitId={bannerAdUnitId}
              size={defaultBannerSize}
              requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            />
          </View>
        )}

        {mode === 'individual' ? (
          <>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={tone}
                onValueChange={setTone}
                style={styles.picker}
                dropdownIconColor="#6B7280"
              >
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
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={customTone}
                onChangeText={setCustomTone}
              />
            )}

            <View style={styles.pickerBox}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                style={styles.picker}
                dropdownIconColor="#6B7280"
              >
                <Picker.Item label="Select category..." value="" />
                <Picker.Item label="Birthday" value="Birthday" />
                <Picker.Item label="Anniversary" value="Anniversary" />
                <Picker.Item label="New Month" value="New Month" />
                <Picker.Item label="New Year" value="New Year" />
                <Picker.Item label="Christmas" value="Christmas" />
                <Picker.Item label="Wedding" value="Wedding" />
                <Picker.Item label="Apology" value="Apology" />
                <Picker.Item
                  label="Congratulations"
                  value="Congratulations"
                />
                <Picker.Item
                  label="Wedding Anniversary"
                  value="Wedding Anniversary"
                />
                <Picker.Item label="Graduation" value="Graduation" />
                <Picker.Item label="Promotion" value="Promotion" />
                <Picker.Item label="Other" value="Other" />
              </Picker>
            </View>

            {category === 'Other' && (
              <TextInput
                placeholder="Enter custom category"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={customCategory}
                onChangeText={setCustomCategory}
              />
            )}

            <TextInput
              placeholder="Recipient name (optional)"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={recipientName}
              onChangeText={setRecipientName}
            />

            <TextInput
              placeholder="Sender name (optional)"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={senderName}
              onChangeText={setSenderName}
            />

            <View style={styles.pickerBox}>
              <Picker
                selectedValue={relationship}
                onValueChange={setRelationship}
                style={styles.picker}
                dropdownIconColor="#6B7280"
              >
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
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={customRelationship}
                onChangeText={setCustomRelationship}
              />
            )}

            <TextInput
              placeholder="Context (optional)"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.multiLineInput]}
              multiline
              value={context}
              onChangeText={setContext}
            />

            <View style={styles.voiceCard}>
              <View style={styles.voiceHeader}>
                <View style={styles.voiceCopy}>
                  <Text style={styles.voiceTitle}>Voice Prompt</Text>
                  <Text style={styles.voiceHint}>
                    Speak your ideas and we will place the transcript in the
                    context field above.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.voiceButton,
                    isListening && styles.voiceButtonActive,
                    (!voicePromptSupported ||
                      loading ||
                      isCheckingVoiceSupport) &&
                      styles.voiceButtonDisabled,
                  ]}
                  onPress={isListening ? stopVoicePrompt : startVoicePrompt}
                  disabled={
                    !voicePromptSupported || loading || isCheckingVoiceSupport
                  }
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

              {!!voiceStatus && (
                <Text style={styles.voiceStatus}>{voiceStatus}</Text>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={businessCategory}
                onValueChange={setBusinessCategory}
                style={styles.picker}
                dropdownIconColor="#6B7280"
              >
                <Picker.Item label="Select message goal..." value="" />
                {CORPORATE_CATEGORIES.map((item) => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>

            {businessCategory === 'Other' && (
              <TextInput
                placeholder="Enter custom message goal"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={customBusinessCategory}
                onChangeText={setCustomBusinessCategory}
              />
            )}

            <View style={styles.pickerBox}>
              <Picker
                selectedValue={businessTone}
                onValueChange={setBusinessTone}
                style={styles.picker}
                dropdownIconColor="#6B7280"
              >
                <Picker.Item label="Select business tone..." value="" />
                {CORPORATE_TONES.map((item) => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>

            {businessTone === 'Other' && (
              <TextInput
                placeholder="Enter custom business tone"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={customBusinessTone}
                onChangeText={setCustomBusinessTone}
              />
            )}

            <TextInput
              placeholder="Business name (optional)"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
            />

            <TextInput
              placeholder="Product or service name"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
            />

            <View style={styles.pickerBox}>
              <Picker
                selectedValue={businessPlatform}
                onValueChange={setBusinessPlatform}
                style={styles.picker}
                dropdownIconColor="#6B7280"
              >
                <Picker.Item label="Select platform..." value="" />
                {CORPORATE_PLATFORMS.map((item) => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>

            {businessPlatform === 'Other' && (
              <TextInput
                placeholder="Enter custom platform"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={customBusinessPlatform}
                onChangeText={setCustomBusinessPlatform}
              />
            )}

            <View style={styles.pickerBox}>
              <Picker
                selectedValue={businessAudience}
                onValueChange={setBusinessAudience}
                style={styles.picker}
                dropdownIconColor="#6B7280"
              >
                <Picker.Item label="Select target audience..." value="" />
                {CORPORATE_AUDIENCES.map((item) => (
                  <Picker.Item key={item} label={item} value={item} />
                ))}
              </Picker>
            </View>

            {businessAudience === 'Other' && (
              <TextInput
                placeholder="Enter custom target audience"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={customBusinessAudience}
                onChangeText={setCustomBusinessAudience}
              />
            )}

            <Text style={styles.lengthLabel}>Message length</Text>
            <View style={styles.lengthRow}>
              {(['Short', 'Medium', 'Long'] as MessageLength[]).map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.lengthButton,
                    messageLength === item && styles.lengthButtonActive,
                  ]}
                  onPress={() => setMessageLength(item)}
                >
                  <Text
                    style={[
                      styles.lengthButtonText,
                      messageLength === item &&
                        styles.lengthButtonTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Campaign details, offer, discount, or key benefits"
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.multiLineInput]}
              multiline
              value={businessContext}
              onChangeText={setBusinessContext}
            />

            <TextInput
              placeholder="Call to action (optional)"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              value={businessCallToAction}
              onChangeText={setBusinessCallToAction}
            />
          </>
        )}

        <Text style={styles.label}>Language</Text>
        <View style={styles.pickerBox}>
          <Picker
            selectedValue={language}
            onValueChange={setLanguage}
            style={styles.picker}
            dropdownIconColor="#6B7280"
          >
            <Picker.Item label="Select language..." value="" />
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
            placeholderTextColor="#9CA3AF"
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
            <MessageActions
              text={result}
              variant={mode === 'corporate' ? 'corporate' : 'individual'}
              preferredPlatform={
                mode === 'corporate' ? finalBusinessPlatform : undefined
              }
            />
          </View>
        )}
      </ScrollView>

      <UpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        canWatchAd={plan === 'free'}
        onWatchAd={handleWatchAd}
        watchAdLoading={watchAdLoading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F9FAFB' },
  bannerWrap: {
    marginBottom: 14,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4F46E5',
    marginTop: 20,
    marginBottom: 14,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  modeButtonLocked: {
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  modeButtonActive: {
    backgroundColor: '#4F46E5',
  },
  modeButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeButtonText: {
    fontWeight: '700',
    color: '#374151',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  lockBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  modeInfoCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 14,
  },
  modeInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#312E81',
    marginBottom: 4,
  },
  modeInfoText: {
    color: '#4338CA',
    lineHeight: 20,
  },
  label: { fontWeight: '600', marginBottom: 6, color: '#374151' },
  pickerBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 14,
  },
  picker: {
    color: '#111827',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    color: '#111827',
  },
  multiLineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  lengthLabel: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  lengthRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  lengthButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  lengthButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  lengthButtonText: {
    fontWeight: '700',
    color: '#374151',
  },
  lengthButtonTextActive: {
    color: '#FFFFFF',
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
