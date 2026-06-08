import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import BrandedBackdrop from 'components/BrandedBackdrop';
import ProfileMenu from 'components/ProfileMenu';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BannerAd } from 'react-native-google-mobile-ads';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { bannerAdUnitId, defaultBannerSize } from '../../utils/admob';
import api from '../../utils/api';

const FEEDBACK_DISMISS_KEY = 'm4u_feedback_prompt_dismissed_at';
const FEEDBACK_REMIND_AFTER_MS = 1000 * 60 * 60 * 24 * 7;

export default function HomeScreen() {
  const router = useRouter();
  const { plan, credits, logout, token, firstName, lastName, refreshUser } = useAuth();
  const isLoggedIn = !!token;
  const [menuPlan, setMenuPlan] = useState(plan);
  const [menuCredits, setMenuCredits] = useState(credits);
  const [menuFirstName, setMenuFirstName] = useState(firstName);
  const [menuLastName, setMenuLastName] = useState(lastName);
  const [referralCode, setReferralCode] = useState('');
  const [successfulReferrals, setSuccessfulReferrals] = useState(0);
  const [referralMessage, setReferralMessage] = useState('');
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);

  useEffect(() => {
    setMenuPlan(plan);
    setMenuCredits(credits);
    setMenuFirstName(firstName);
    setMenuLastName(lastName);
  }, [credits, firstName, lastName, plan]);

  useEffect(() => {
    const loadFeedbackPrompt = async () => {
      try {
        const dismissedAt = await AsyncStorage.getItem(FEEDBACK_DISMISS_KEY);

        if (!dismissedAt) {
          setShowFeedbackPrompt(true);
          return;
        }

        const nextEligibleTime = Number(dismissedAt) + FEEDBACK_REMIND_AFTER_MS;
        setShowFeedbackPrompt(Date.now() >= nextEligibleTime);
      } catch {
        setShowFeedbackPrompt(true);
      }
    };

    loadFeedbackPrompt();
  }, []);

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
          setReferralCode(res.data.referralCode || '');
          setSuccessfulReferrals(Number(res.data.successfulReferrals) || 0);
        } catch (err) {
          console.log('home menu sync failed', err);
        }
      };

      syncMenu();
    }, [refreshUser, token])
  );

  const dismissFeedbackPrompt = async () => {
    setShowFeedbackPrompt(false);
    await AsyncStorage.setItem(FEEDBACK_DISMISS_KEY, String(Date.now()));
  };

  const handleOpenFeedback = async () => {
    await dismissFeedbackPrompt();
    router.push('/feedback');
  };

  const handleCopyReferralCode = async () => {
    if (!referralCode) return;

    await Clipboard.setStringAsync(referralCode);
    setReferralMessage('Referral code copied. Share it with a friend.');
  };

  const handleShareReferral = async () => {
    if (!referralCode) return;

    await Share.share({
      message: `Join me on Message4U and sign up with my referral code ${referralCode}. Once your account is verified, I earn 1 bonus credit.`,
    });

    setReferralMessage('Invite shared. You earn 1 credit after each verified signup.');
  };

  return (
    <View style={styles.screen}>
      <BrandedBackdrop light />
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
          <Text style={styles.heroEyebrow}>Beautiful words, less friction</Text>
          <Text style={styles.heroTitle}>Say the right thing.</Text>
          <Text style={styles.heroSubtitle}>
            Generate, respond, and refine messages with ease.
          </Text>
        </View>

        {showFeedbackPrompt && (
          <View style={styles.feedbackBanner}>
            <View style={styles.feedbackIconWrap}>
              <MaterialCommunityIcons name="message-star-outline" size={22} color="#4338CA" />
            </View>
            <View style={styles.feedbackContent}>
              <Text style={styles.feedbackTitle}>We’d love your feedback</Text>
              <Text style={styles.feedbackText}>
                Tell us what feels good, what feels off, or what you want us to improve next.
              </Text>
              <View style={styles.feedbackActions}>
                <TouchableOpacity style={styles.feedbackPrimaryButton} onPress={handleOpenFeedback}>
                  <Text style={styles.feedbackPrimaryText}>Give Feedback</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.feedbackSecondaryButton} onPress={dismissFeedbackPrompt}>
                  <Text style={styles.feedbackSecondaryText}>Not now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.referralCard}>
          <View style={styles.referralHeader}>
            <View>
              <Text style={styles.referralTitle}>Refer to earn 1 credit</Text>
              <Text style={styles.referralText}>
                Share your code. When someone signs up and verifies with it, you get 1 bonus credit.
              </Text>
            </View>
            <View style={styles.referralCountPill}>
              <Text style={styles.referralCountLabel}>Referrals</Text>
              <Text style={styles.referralCountValue}>{successfulReferrals}</Text>
            </View>
          </View>

          <View style={styles.referralCodeBox}>
            <Text style={styles.referralCodeLabel}>Your code</Text>
            <Text style={styles.referralCodeValue}>{referralCode || 'Loading...'}</Text>
          </View>

          <View style={styles.referralButtonRow}>
            <TouchableOpacity style={styles.referralPrimaryButton} onPress={handleShareReferral}>
              <Text style={styles.referralPrimaryText}>Share Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.referralSecondaryButton} onPress={handleCopyReferralCode}>
              <Text style={styles.referralSecondaryText}>Copy Code</Text>
            </TouchableOpacity>
          </View>

          {!!referralMessage && <Text style={styles.referralHelper}>{referralMessage}</Text>}
          {menuPlan === 'free' && (
            <Text style={styles.rewardReminder}>
              Watch video for +1 credit is still active for free users when you run out of credits.
            </Text>
          )}
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
            style={[
              styles.card,
              menuPlan === 'free' && styles.lockedCard,
            ]}
            onPress={() =>
              menuPlan === 'free' ? router.push('/upgrade') : router.push('/history')
            }
          >
            <View style={styles.historyRow}>
              <MaterialCommunityIcons name="history" size={28} color="#4F46E5" />
              {menuPlan === 'free' && (
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>Paid</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardSecondaryTitle}>History</Text>
            <Text style={styles.cardSubtitle}>
              {menuPlan === 'free'
                ? 'Upgrade to unlock past messages and reuse them later.'
                : 'View and reuse past messages.'}
            </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F7FF',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    marginTop: 34,
    marginBottom: 28,
    padding: 22,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(199, 210, 254, 0.8)',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#4338CA',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#5B6475',
    marginTop: 8,
    maxWidth: 270,
  },
  feedbackBanner: {
    marginBottom: 16,
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(238,242,255,0.92)',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    gap: 14,
    shadowColor: '#312E81',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  feedbackIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  feedbackContent: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#5B6475',
  },
  feedbackActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  feedbackPrimaryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  feedbackPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  feedbackSecondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  feedbackSecondaryText: {
    color: '#4338CA',
    fontWeight: '700',
  },
  referralCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(224, 231, 255, 0.95)',
    shadowColor: '#312E81',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  referralTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  referralText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
    color: '#667085',
    maxWidth: 240,
  },
  referralCountPill: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 72,
  },
  referralCountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  referralCountValue: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '800',
    color: '#312E81',
  },
  referralCodeBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  referralCodeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  referralCodeValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: '#4338CA',
    letterSpacing: 1,
  },
  referralButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  referralPrimaryButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  referralPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  referralSecondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  referralSecondaryText: {
    color: '#4338CA',
    fontWeight: '700',
  },
  referralHelper: {
    marginTop: 12,
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
  },
  rewardReminder: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },
  actions: {
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(224, 231, 255, 0.95)',
    shadowColor: '#312E81',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  lockedCard: {
    borderColor: '#C7D2FE',
    backgroundColor: 'rgba(238,242,255,0.92)',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paidBadge: {
    backgroundColor: '#312E81',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  paidBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardSecondaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    color: '#111827',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#667085',
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
    color: '#6B7280',
    fontWeight: '600',
  },
});
