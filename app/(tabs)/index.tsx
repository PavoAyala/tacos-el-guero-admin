
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AlertaInventario, marcarAlertaAtendida, obtenerAlertasActivas } from '@/lib/inventario';
import { supabase } from '@/lib/supabase';

// Componente para tarjetas de estadísticas
const StatCard = ({ title, value, icon, color }: { title: string, value: string, icon: keyof typeof Ionicons.glyphMap, color: string }) => (
  <ThemedView style={[styles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
    <View style={styles.cardContent}>
      <View>
        <ThemedText type="defaultSemiBold" style={{ color: '#666', fontSize: 12 }}>{title.toUpperCase()}</ThemedText>
        <ThemedText type="title" style={{ fontSize: 24, marginTop: 4 }}>{value}</ThemedText>
      </View>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
    </View>
  </ThemedView>
);

// Componente para elementos de lista de alertas de inventario
const AlertItem = ({
  alerta,
  onAtendida,
}: {
  alerta: AlertaInventario;
  onAtendida: (id: string) => void;
}) => {
  const ing = alerta.ingredientes;
  const [marcando, setMarcando] = useState(false);

  const handleAtendida = async () => {
    setMarcando(true);
    try {
      await marcarAlertaAtendida(alerta.id);
      onAtendida(alerta.id);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setMarcando(false);
    }
  };

  return (
    <ThemedView style={styles.alertItem}>
      <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 10 }} />
      <ThemedText style={{ flex: 1 }}>
        Bajo stock: {ing?.nombre ?? '—'} ({ing?.cantidad_actual} {ing?.unidad} · mín. {ing?.stock_minimo} {ing?.unidad})
      </ThemedText>
      <TouchableOpacity
        onPress={handleAtendida}
        disabled={marcando}
        style={styles.atendidaBtn}
      >
        <Ionicons name={marcando ? 'hourglass-outline' : 'checkmark-circle-outline'} size={20} color="#10b981" />
      </TouchableOpacity>
    </ThemedView>
  );
};

// Componente para botones de acción rápida
const QuickAction = ({ title, icon, onPress }: { title: string, icon: keyof typeof Ionicons.glyphMap, onPress: () => void }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <View style={styles.actionIconCircle}>
      <Ionicons name={icon} size={24} color="#fff" />
    </View>
    <ThemedText style={styles.actionText}>{title}</ThemedText>
  </TouchableOpacity>
);


export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [alertas, setAlertas] = useState<AlertaInventario[]>([]);

  const cargarAlertas = useCallback(async () => {
    try {
      const data = await obtenerAlertasActivas();
      setAlertas(data);
    } catch {
      // silencioso en dashboard
    }
  }, []);

  useEffect(() => {
    cargarAlertas();
  }, [cargarAlertas]);

  // Simulación de recarga de datos
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarAlertas().finally(() => setRefreshing(false));
  }, [cargarAlertas]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
    // El listener en _layout.tsx manejará la redirección
  };

  const handleAlertaAtendida = (id: string) => {
    setAlertas((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText type="subtitle" style={{ color: '#666' }}>Hola, Admin</ThemedText>
          <ThemedText type="title">Tacos El Guero</ThemedText>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {/* Sección de Resumen del Día */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>Resumen del Día</ThemedText>
        <View style={styles.statsGrid}>
          <StatCard title="Ventas Totales" value="$12,450" icon="cash-outline" color="#10b981" />
          <StatCard title="Pedidos Activos" value="8" icon="restaurant-outline" color="#f59e0b" />
          <StatCard title="Clientes" value="142" icon="people-outline" color="#3b82f6" />
          <StatCard
            title="Inventario Bajo"
            value={alertas.length > 0 ? `${alertas.length} items` : '✓ OK'}
            icon="alert-outline"
            color={alertas.length > 0 ? '#ef4444' : '#10b981'}
          />
        </View>

        {/* Sección de Alertas / Pendientes */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>Atención Requerida</ThemedText>
        <View style={styles.alertsContainer}>
          {alertas.length === 0 ? (
            <ThemedView style={[styles.alertItem, { justifyContent: 'center' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" style={{ marginRight: 8 }} />
              <ThemedText style={{ color: '#10b981' }}>Sin alertas de inventario 🎉</ThemedText>
            </ThemedView>
          ) : (
            alertas.map((a) => (
              <AlertItem key={a.id} alerta={a} onAtendida={handleAlertaAtendida} />
            ))
          )}
        </View>

        {/* Acciones Rápidas */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>Acciones Rápidas</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsRow}>
          <QuickAction title="Nueva Venta" icon="add-circle-outline" onPress={() => console.log('Nueva Venta')} />
          <QuickAction title="Inventario" icon="cube-outline" onPress={() => router.push('/(tabs)/inventario')} />
          <QuickAction title="Corte de Caja" icon="calculator-outline" onPress={() => router.push('/(tabs)/corte-caja')} />
          <QuickAction title="Personal" icon="people-circle-outline" onPress={() => console.log('Personal')} />
        </ScrollView>

        {/* Gráfico Placeholder (Imagen o Vista simple) */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>Tendencia Semanal</ThemedText>
        <View style={styles.chartPlaceholder}>
          <View style={[styles.bar, { height: '40%' }]} />
          <View style={[styles.bar, { height: '60%' }]} />
          <View style={[styles.bar, { height: '50%' }]} />
          <View style={[styles.bar, { height: '80%' }]} />
          <View style={[styles.bar, { height: '70%' }]} />
          <View style={[styles.bar, { height: '90%' }]} />
          <View style={[styles.bar, { height: '65%' }]} />
        </View>
        <View style={styles.daysRow}>
          <ThemedText style={styles.dayText}>L</ThemedText>
          <ThemedText style={styles.dayText}>M</ThemedText>
          <ThemedText style={styles.dayText}>M</ThemedText>
          <ThemedText style={styles.dayText}>J</ThemedText>
          <ThemedText style={styles.dayText}>V</ThemedText>
          <ThemedText style={styles.dayText}>S</ThemedText>
          <ThemedText style={styles.dayText}>D</ThemedText>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // Ajuste para status bar
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signOutButton: {
    padding: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionTitle: {
    marginLeft: 20,
    marginBottom: 10,
    marginTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  card: {
    width: '45%', // Aproximadamente la mitad menos márgenes
    margin: '2.5%',
    backgroundColor: '#fff', // O un color temático
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconContainer: {
    padding: 8,
    borderRadius: 8,
  },
  alertsContainer: {
    marginHorizontal: 20,
    backgroundColor: '#f9fafb', // Fondo suave
    borderRadius: 12,
    overflow: 'hidden',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'transparent',
  },
  atendidaBtn: {
    padding: 4,
    marginLeft: 8,
  },
  actionsRow: {
    paddingLeft: 20,
    marginBottom: 10,
  },
  actionButton: {
    alignItems: 'center',
    marginRight: 20,
    width: 80,
  },
  actionIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#841584', // Color principal de la marca (ejemplo)
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
  },
  actionText: {
    textAlign: 'center',
    fontSize: 12,
  },
  chartPlaceholder: {
    height: 150,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginTop: 10,
  },
  bar: {
    width: 20,
    backgroundColor: '#841584',
    borderRadius: 4,
    opacity: 0.7,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 45,
    marginTop: 5,
  },
  dayText: {
    fontSize: 12,
    color: '#666',
  },
});
