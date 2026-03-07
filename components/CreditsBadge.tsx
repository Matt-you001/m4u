import { Text, View } from 'react-native';

export default function CreditsBadge({ credits }: { credits: number }) {
  if (credits <= 0) return null;

  return (
    <View style={{
      backgroundColor: '#22c55e',
      paddingHorizontal: 6,
      borderRadius: 10
    }}>
      <Text style={{ color: '#fff', fontSize: 12 }}>
        {credits}
      </Text>
    </View>
  );
}
