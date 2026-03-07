import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import api from '../../utils/api';

export default function TabLayout() {
  const [plan, setPlan] = useState<'free' | 'basic' | 'premium'>('free');
  const [credits, setCredits] = useState<number>(0);

  useEffect(() => {
 const loadUser = async () => {
    try {
      const res = await api.get('/user/me');
      setPlan(res.data.plan);

      const totalCredits =
        (res.data.credits ?? 0) + (res.data.extra_credits ?? 0);

      setCredits(totalCredits);
    } catch (err: any) {
      if (err.response?.status !== 401) {
        console.warn('Failed to load user:', err.response?.status);
      }
      setPlan('free');
      setCredits(0);
    }
  };


  loadUser();
}, []);


  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="message-gen"
        options={{
          title: 'Generator',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create-outline" size={size} color={color} />
          ),
        }}
      />


      <Tabs.Screen
        name="message-resp"
        options={{
          title: 'Responder',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          href: plan === 'free' ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
