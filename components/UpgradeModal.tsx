import { router } from 'expo-router';
import { Modal, Pressable, Text, View } from 'react-native';

export default function UpgradeModal({
  visible,
  onClose,
  canWatchAd = false,
  onWatchAd,
  watchAdLoading = false,
}: {
  visible: boolean;
  onClose: () => void;
  canWatchAd?: boolean;
  onWatchAd?: () => void;
  watchAdLoading?: boolean;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: '#fff',
            padding: 20,
            borderRadius: 12,
            width: 280,
            position: 'relative',
          }}
        >
          {/* ❌ CLOSE BUTTON */}
          <Pressable
            onPress={onClose}
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              padding: 6,
              zIndex: 10,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#6B7280' }}>
              ✕
            </Text>
          </Pressable>

          {/* TITLE */}
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            🚫 Out of Credits
          </Text>

          {/* UPGRADE */}
          <Pressable
            onPress={() => {
              onClose();
              router.push('/upgrade');
            }}
          >
            <Text style={{ marginTop: 14, color: '#2563eb', fontWeight: '600' }}>
              Upgrade Plan
            </Text>
          </Pressable>

          {/* WATCH AD */}
          {canWatchAd && (
            <Pressable
              onPress={onWatchAd}
              disabled={watchAdLoading}
            >
              <Text style={{ marginTop: 10, color: '#16a34a', fontWeight: '600' }}>
                {watchAdLoading ? 'Loading Ad...' : 'Watch Ad (+1 Credit)'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
