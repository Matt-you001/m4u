import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';

import GenerateMessage from './screens/GenerateMessage';
import RespondMessage from './screens/RespondMessage';

import type { RootStackParamList } from './navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator
          id="root"   // 🔴 THIS IS THE KEY LINE
          screenOptions={{
            headerStyle: { backgroundColor: '#4F46E5' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          <Stack.Screen
            name="m4U - Generate"
            component={GenerateMessage}
          />
          <Stack.Screen
            name="m4U - Respond"
            component={RespondMessage}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
