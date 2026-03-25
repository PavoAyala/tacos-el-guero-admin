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

const IconInventario = ({ color }: { color: string }) => (
  <Ionicons size={26} name="cube-outline" color={color} />
);

const IconCorteCaja = ({ color }: { color: string }) => (
  <Ionicons size={26} name="calculator-outline" color={color} />
);

const IconFiscal = ({ color }: { color: string }) => (
  <Ionicons size={26} name="receipt-outline" color={color} />
);

const IconPersonal = ({ color }: { color: string }) => (
  <Ionicons size={26} name="people-outline" color={color} />
);

const IconActivos = ({ color }: { color: string }) => (
  <Ionicons size={26} name="flash-outline" color={color} />
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
        name="inventario"
        options={{
          title: 'Inventario',
          tabBarIcon: IconInventario,
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
        name="fiscal"
        options={{
          title: 'Fiscal',
          tabBarIcon: IconFiscal,
        }}
      />
      <Tabs.Screen
        name="personal"
        options={{
          title: 'Personal',
          tabBarIcon: IconPersonal,
        }}
      />
      <Tabs.Screen
        name="activos"
        options={{
          title: 'Activos',
          tabBarIcon: IconActivos,
        }}
      />
    </Tabs>
  );
}
