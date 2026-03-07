import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Plan = 'free' | 'basic' | 'premium';

type Props = {
  isLoggedIn: boolean;
  plan?: Plan;
  credits?: number;
  onUpgrade: () => void;
  onSettings: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

export default function ProfileMenu({
  isLoggedIn,
  plan = 'free',
  credits = 0,
  onUpgrade,
  onSettings,
  onLogin,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);

  const handleUpgrade = () => {
    console.log('Upgrade pressed');
    setOpen(false);
    onUpgrade && onUpgrade();
  };

  const handleSettings = () => {
    console.log('Settings pressed');
    setOpen(false);
    onSettings && onSettings();
  };

  const handleLogin = () => {
    console.log('Login pressed');
    setOpen(false);
    onLogin && onLogin();
  };

  const handleLogout = () => {
    console.log('Logout pressed');
    setOpen(false);
    onLogout && onLogout();
  };

  return (
    <View style={styles.container}>
      {/* Profile Icon */}
      <TouchableOpacity onPress={() => setOpen(!open)}>
        <Ionicons name="person-circle-outline" size={34} color="#333" />
      </TouchableOpacity>

      {/* Dropdown */}
      {open && (
        <View style={styles.dropdown}>
          {isLoggedIn ? (
            <>
              {/* Plan + Credits */}
              <View style={styles.meta}>
                <Text style={styles.plan}>
                  Plan: {plan.toUpperCase()}
                </Text>
                <Text style={styles.credits}>
                  Credits: {credits}
                </Text>
              </View>

              {/* Upgrade */}
              {plan === 'free' && (
                <TouchableOpacity style={styles.item} onPress={handleUpgrade}>
                  <Text style={styles.upgrade}>⬆️ Upgrade Plan</Text>
                </TouchableOpacity>
              )}

              {/* Settings */}
              <TouchableOpacity style={styles.item} onPress={handleSettings}>
                <Text style={styles.text}>⚙️ Settings</Text>
              </TouchableOpacity>

              {/* Logout */}
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
  dropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 6,
    width: 190,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 1000,
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
