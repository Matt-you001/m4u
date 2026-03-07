/*import UpgradeModal from '@/components/UpgradeModal';
import { useAuth } from '@/context/AuthContext';
import api from '@/utils/api';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';

export default function GenerateMessage() {
  const [tone, setTone] = useState('');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [relationship, setRelationship] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const res = await api.post('/generate', {
        tone,
        category,
        name,
        gender,
        relationship,
        context,
        language: 'English',
      });

      setResult(res.data.result);

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
        <Text style={styles.title}>Create a Message</Text>

        <TextInput label="Tone" value={tone} onChangeText={setTone} style={styles.input} />
        <TextInput label="Message Category" value={category} onChangeText={setCategory} style={styles.input} />
        <TextInput label="Recipient Name (Optional)" value={name} onChangeText={setName} style={styles.input} />
        <TextInput label="Recipient Gender" value={gender} onChangeText={setGender} style={styles.input} />
        <TextInput label="Relationship with Recipient" value={relationship} onChangeText={setRelationship} style={styles.input} />
        <TextInput label="Context to Message (Optional)" value={context} onChangeText={setContext} multiline style={styles.input} />

        <Button mode="contained" onPress={handleGenerate} loading={loading} style={styles.button}>
          Generate Message
        </Button>

        {result !== '' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        )}
      </ScrollView>

      {/* ✅ THIS IS THE FIX */}
      /*<UpgradeModal visible={showUpgrade} />
    </>
  );
}*/

/*const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F9FAFB' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingTop: 10,
    textAlign: 'center',
    marginBottom: 20,
    color: '#4F46E5',
  },
  input: { marginBottom: 12, backgroundColor: 'white' },
  button: { marginVertical: 15 },
  resultCard: {
    backgroundColor: '#ECFEFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  resultText: { fontSize: 16, marginBottom: 10 },
});*/