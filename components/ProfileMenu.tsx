import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Plan = 'free' | 'basic' | 'premium';

type Props = {
  isLoggedIn: boolean;
  firstName?: string;
  lastName?: string;
  plan?: Plan;
  credits?: number;
  onUpgrade: () => void;
  onSettings: () => void;
  onProfile: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

export default function ProfileMenu({
  isLoggedIn,
  firstName = '',
  lastName = '',
  plan = 'free',
  credits = 0,
  onUpgrade,
  onSettings,
  onProfile,
  onLogin,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);

  const initials =
    `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() ||
    'U';

  const fullName =
    firstName || lastName ? `${firstName} ${lastName}`.trim() : 'User';

  const handleUpgrade = () => {
    setOpen(false);
    onUpgrade && onUpgrade();
  };

  const handleSettings = () => {
    setOpen(false);
    onSettings && onSettings();
  };

  const handleProfile = () => {
    setOpen(false);
    onProfile && onProfile();
  };

  const handleLogin = () => {
    setOpen(false);
    onLogin && onLogin();
  };

  const handleLogout = () => {
    setOpen(false);
    onLogout && onLogout();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.avatar} onPress={() => setOpen(!open)}>
        <Text style={styles.initials}>{initials}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          {isLoggedIn ? (
            <>
              <View style={styles.userHeader}>
                <Text style={styles.userName}>{fullName}</Text>
              </View>

              <View style={styles.meta}>
                <Text style={styles.plan}>Plan: {plan.toUpperCase()}</Text>
                <Text style={styles.credits}>Credits: {credits}</Text>
              </View>

              {plan === 'free' && (
                <TouchableOpacity style={styles.item} onPress={handleUpgrade}>
                  <Text style={styles.upgrade}>⬆️ Upgrade Plan</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.item} onPress={handleSettings}>
                <Text style={styles.text}>⚙️ Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.item} onPress={handleProfile}>
                <Text style={styles.text}>👤 Update Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.item} onPress={handleLogout}>
                <Text style={styles.text}>🚪 Logout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.item} onPress={handleLogin}>
              <Text style={styles.text}>🔐 Login</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  initials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  dropdown: {
    position: 'absolute',
    top: 42,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 6,
    width: 210,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 1000,
  },

  userHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  userName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#111827',
  },

  meta: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  plan: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },

  credits: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  item: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  text: {
    fontSize: 14,
    color: '#333',
  },

  upgrade: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
});