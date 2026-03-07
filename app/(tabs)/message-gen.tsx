import UpgradeModal from '@/components/UpgradeModal';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { Picker } from '@react-native-picker/picker';
import { useEffect, useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MessageActions from '../../components/MessageActions';
import { saveToHistory } from '../../utils/history';

export default function GenerateScreen() {
  const { plan, refreshUser } = useAuth();

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
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [canWhatsApp, setCanWhatsApp] = useState(false);
  const [canTelegram, setCanTelegram] = useState(false);

  useEffect(() => {
    Linking.canOpenURL('whatsapp://send').then(setCanWhatsApp).catch(() => {});
    Linking.canOpenURL('tg://msg').then(setCanTelegram).catch(() => {});
  }, []);

  const generateMessage = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const res = await api.post('/generate', {
        tone,
        category,
        name,
        gender,
        relationship,
        context,
        language,
      });

      setResult(res.data.result);

      await refreshUser();

      if (plan !== 'free') {
        await saveToHistory({
          id: Date.now().toString(),
          type: 'result',
          inputText: context || category,
          outputText: res.data.result,
          language,
          createdAt: Date.now(),
        });
      }
    } catch (err: any) {
      if (err.response?.status === 402) {
        setShowUpgrade(true);
      } else {
        setResult('Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Message Generator</Text>

        <View style={styles.pickerBox}>
          <Picker selectedValue={tone} onValueChange={setTone}>
            <Picker.Item label="Select tone..." value="" />
            <Picker.Item label="Funny" value="Funny" />
            <Picker.Item label="Grateful" value="Grateful" />
            <Picker.Item label="Romantic" value="Romantic" />
            <Picker.Item label="Professional" value="Professional" />
            <Picker.Item label="Diplomatic" value="Diplomatic" />
            <Picker.Item label="Funny" value="Funny" />
            <Picker.Item label="Sarcastic" value="Sarcastic" />
            <Picker.Item label="Angry" value="Angry" />
            <Picker.Item label="Diplomatic" value="Diplomatic" />
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

        <TextInput placeholder="Recipient name" style={styles.input} value={name} onChangeText={setName} />
        
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

        <TouchableOpacity style={styles.primaryButton} onPress={generateMessage} disabled={loading}>
          <Text style={styles.primaryText}>{loading ? 'Generating...' : 'Generate Message'}</Text>
        </TouchableOpacity>

        {result !== '' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{result}</Text>
            <MessageActions text={result} canWhatsApp={canWhatsApp} canTelegram={canTelegram} />
          </View>
        )}
      </ScrollView>

      <UpgradeModal visible={showUpgrade} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F9FAFB' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#4F46E5', marginVertical: 20 },
  label: { fontWeight: '600', marginBottom: 6, color: '#374151' },
  pickerBox: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  primaryButton: { backgroundColor: '#4F46E5', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  primaryText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  resultCard: { backgroundColor: '#ECFEFF', padding: 14, borderRadius: 10, marginTop: 12 },
  resultText: { fontSize: 16 },
});
