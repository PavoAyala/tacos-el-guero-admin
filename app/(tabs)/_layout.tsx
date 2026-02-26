import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Iconos definidos fuera del componente para evitar recreación en cada render
const IconInicio = ({ color }: { color: string }) => (
  <IconSymbol size={28} name="house.fill" color={color} />
);

const IconCorteCaja = ({ color }: { color: string }) => (
  <Ionicons size={26} name="calculator-outline" color={color} />
);

const IconExplorar = ({ color }: { color: string }) => (
  <IconSymbol size={28} name="paperplane.fill" color={color} />
);

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: IconInicio,
        }}
      />
      <Tabs.Screen
        name="corte-caja"
        options={{
          title: 'Corte de Caja',
          tabBarIcon: IconCorteCaja,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explorar',
          tabBarIcon: IconExplorar,
        }}
      />
    </Tabs>
  );
}
