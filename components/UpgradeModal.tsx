import { router } from 'expo-router';
import { Modal, Pressable, Text, View } from 'react-native';

export default function UpgradeModal({ visible }: { visible: boolean }) {
  return (
    <Modal transparent visible={visible}>
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            🚫 Out of Credits
          </Text>

          <Pressable onPress={() => router.push('/upgrade')}>
            <Text style={{ marginTop: 10, color: '#2563eb' }}>
              Upgrade Plan
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push('/upgrade')}>
            <Text style={{ marginTop: 10, color: '#16a34a' }}>
              Watch Ad (+1 Credit)
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
