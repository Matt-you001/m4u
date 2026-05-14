import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ProfileMenu from 'components/ProfileMenu';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BannerAd } from 'react-native-google-mobile-ads';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { bannerAdUnitId, defaultBannerSize } from '../../utils/admob';
import api from '../../utils/api';

export default function HomeScreen() {
  const router = useRouter();
  const { plan, credits, logout, token, firstName, lastName, refreshUser } = useAuth();
  const isLoggedIn = !!token;
  const [menuPlan, setMenuPlan] = useState(plan);
  const [menuCredits, setMenuCredits] = useState(credits);
  const [menuFirstName, setMenuFirstName] = useState(firstName);
  const [menuLastName, setMenuLastName] = useState(lastName);

  useEffect(() => {
    setMenuPlan(plan);
    setMenuCredits(credits);
    setMenuFirstName(firstName);
    setMenuLastName(lastName);
  }, [credits, firstName, lastName, plan]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;

      const syncMenu = async () => {
        await refreshUser();

        try {
          const res = await api.get('/user/me');
          const totalCredits =
            typeof res.data.totalCredits === 'number'
              ? res.data.totalCredits
              : (res.data.credits ?? 0) + (res.data.extraCredits ?? 0);

          setMenuPlan(res.data.plan || 'free');
          setMenuCredits(totalCredits);
          setMenuFirstName(res.data.firstName || '');
          setMenuLastName(res.data.lastName || '');
        } catch (err) {
          console.log('home menu sync failed', err);
        }
      };

      syncMenu();
    }, [refreshUser, token])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoMain}>m</Text>
          <Text style={styles.logoAccent}>4</Text>
          <Text style={styles.logoMain}>U</Text>
        </View>

        <ProfileMenu
          isLoggedIn={isLoggedIn}
          firstName={menuFirstName}
          lastName={menuLastName}
          plan={menuPlan}
          credits={menuCredits}
          onUpgrade={() => router.push('/upgrade')}
          onSettings={() => router.push('/settings')}
          onProfile={() => router.push('/profile')}
          onLogin={() => router.push('/login')}
          onLogout={logout}
        />
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Say the right thing.</Text>
        <Text style={styles.heroSubtitle}>
          Generate, respond, and refine messages with ease.
        </Text>
      </View>

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
          <MaterialCommunityIcons name="history" size={28} color="#4F46E5" />
          <Text style={styles.cardSecondaryTitle}>History</Text>
          <Text style={styles.cardSubtitle}>View and reuse past messages.</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        {menuPlan === 'free' ? (
          <View style={styles.bannerWrap}>
            <BannerAd
              unitId={bannerAdUnitId}
              size={defaultBannerSize}
              requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            />
          </View>
        ) : (
          <Text style={styles.footerText}>Crafted for clarity</Text>
        )}
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
  header: {
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
  cardSecondaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    color: '#111827',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: 18,
    alignItems: 'center',
  },
  bannerWrap: {
    alignItems: 'center',
    width: '100%',
  },
  footerText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
