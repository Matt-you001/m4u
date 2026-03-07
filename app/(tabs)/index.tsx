import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProfileMenu from 'components/ProfileMenu';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

type Plan = 'free' | 'basic' | 'premium';

export default function HomeScreen() {
  const router = useRouter();
  const { plan, credits, logout, token } = useAuth();
  const isLoggedIn = !!token;
  /*const { plan, totalCredits } = useAuth();*/


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoMain}>m</Text>
          <Text style={styles.logoAccent}>4</Text>
          <Text style={styles.logoMain}>U</Text>
        </View>

        <ProfileMenu
          isLoggedIn={isLoggedIn}
          plan={plan}
          credits={credits}
          onUpgrade={() => router.push("/upgrade")}
          onSettings={() => router.push("/settings")}
          onLogin={() => router.push("/login")}
          onLogout={logout}
        />


      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Say the right thing.
        </Text>
        <Text style={styles.heroSubtitle}>
          Generate, respond, and refine messages with ease.
        </Text>
      </View>

      {/* Action Cards */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/message-gen')}
        >
          <MaterialCommunityIcons
            name="pencil-outline"
            size={34}
            color="#4F46E5"
          />
          <Text style={styles.cardTitle}>Generate Message</Text>
          <Text style={styles.cardSubtitle}>
            Birthdays, weddings, apologies, and more.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/message-resp')}
        >
          <MaterialCommunityIcons
            name="message-reply-outline"
            size={34}
            color="#4F46E5"
          />
          <Text style={styles.cardTitle}>Respond to Message</Text>
          <Text style={styles.cardSubtitle}>
            Smart replies and translations.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/history')}
        >
          <MaterialCommunityIcons
            name="history"
            size={28}
            color="#4F46E5"
          />
          <Text style={styles.cardSecondaryTitle}>History</Text>
          <Text style={styles.cardSubtitle}>
            View and reuse past messages.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Crafted for clarity ✨
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
  },

  /* Header */
  header: {
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  /* Logo */
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  logoMain: {
    fontSize: 34,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: -1,
  },
  logoAccent: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    marginHorizontal: 1,
  },

  /* Hero */
  hero: {
    marginTop: 40,
    marginBottom: 28,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 6,
  },

  /* Cards */
  actions: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardSecondary: {
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    padding: 18,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    color: '#111827',
  },
  cardSecondaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  /* Footer */
  footer: {
    marginTop: 'auto',
    paddingVertical: 18,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
