import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AlertaInventario, marcarAlertaAtendida, obtenerAlertasActivas } from '@/lib/inventario';
import { crearOrderManual, OrderType } from '@/lib/orders';
import { supabase } from '@/lib/supabase';

import { useThemeColor } from '@/hooks/use-theme-color';
import { calcularTotalesDelDia, TotalesPorMetodo } from '@/lib/corte-caja';
import { obtenerPedidosPendientes, Order } from '@/lib/orders';

const formatMXN = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const todayISO = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

// ─── Modal de Nueva Venta ──────────────────────────────────────────────────────

const OrderFormModal = ({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
}) => {
  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState<OrderType>('dine-in');
  const [guardando, setGuardando] = useState(false);

  const inputBg = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({}, 'card');

  useEffect(() => {
    if (visible) {
      setMonto('');
      setTipo('dine-in');
    }
  }, [visible]);

  const handleGuardar = async () => {
    const total = Number.parseFloat(monto.replace(',', '.'));
    if (Number.isNaN(total) || total <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    setGuardando(true);
    try {
      await crearOrderManual({
        total_amount: total,
        order_type: tipo,
      });
      onSave();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo registrar la venta');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={dashboardStyles.overlay} onPress={onClose} />
      <View style={[dashboardStyles.sheet, { backgroundColor: cardBg }]}>
        <View style={dashboardStyles.sheetHandle} />
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle" style={{ marginBottom: 20 }}>Nueva Venta (Efectivo)</ThemedText>

          <ThemedText style={dashboardStyles.label}>Monto Total *</ThemedText>
          <TextInput
            style={[dashboardStyles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            value={monto}
            onChangeText={setMonto}
            placeholder="0.00"
            placeholderTextColor="#aaa"
            keyboardType="decimal-pad"
          />

          <ThemedText style={dashboardStyles.label}>Tipo de Pedido</ThemedText>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <TouchableOpacity
              style={[dashboardStyles.chip, tipo === 'dine-in' && dashboardStyles.chipSelected]}
              onPress={() => setTipo('dine-in')}
            >
              <ThemedText style={[dashboardStyles.chipText, tipo === 'dine-in' && dashboardStyles.chipTextSelected]}>
                Para comer
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dashboardStyles.chip, tipo === 'takeout' && dashboardStyles.chipSelected]}
              onPress={() => setTipo('takeout')}
            >
              <ThemedText style={[dashboardStyles.chipText, tipo === 'takeout' && dashboardStyles.chipTextSelected]}>
                Para llevar
              </ThemedText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[dashboardStyles.btnGuardar, guardando && { opacity: 0.6 }]}
            onPress={handleGuardar}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={dashboardStyles.btnGuardarText}>Registrar Venta</ThemedText>
            )}
          </TouchableOpacity>
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

// Componente para tarjetas de estadísticas
const StatCard = ({ title, value, icon, color }: { title: string, value: string, icon: keyof typeof Ionicons.glyphMap, color: string }) => {
  const subtextColor = useThemeColor({}, 'subtext');

  return (
    <ThemedView lightColor="#fff" darkColor="#1e2123" style={[dashboardStyles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={dashboardStyles.cardContent}>
        <View>
          <ThemedText type="defaultSemiBold" style={{ color: subtextColor, fontSize: 12 }}>{title.toUpperCase()}</ThemedText>
          <ThemedText type="title" style={{ fontSize: 24, marginTop: 4 }}>{value}</ThemedText>
        </View>
        <View style={[dashboardStyles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
      </View>
    </ThemedView>
  );
};

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
    <ThemedView style={dashboardStyles.alertItem}>
      <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 10 }} />
      <ThemedText style={{ flex: 1 }}>
        Bajo stock: {ing?.nombre ?? '—'} ({ing?.cantidad_actual} {ing?.unidad} · mín. {ing?.stock_minimo} {ing?.unidad})
      </ThemedText>
      <TouchableOpacity
        onPress={handleAtendida}
        disabled={marcando}
        style={dashboardStyles.atendidaBtn}
      >
        <Ionicons name={marcando ? 'hourglass-outline' : 'checkmark-circle-outline'} size={20} color="#10b981" />
      </TouchableOpacity>
    </ThemedView>
  );
};

// Componente para botones de acción rápida
const QuickAction = ({ title, icon, onPress }: { title: string, icon: keyof typeof Ionicons.glyphMap, onPress: () => void }) => (
  <TouchableOpacity style={dashboardStyles.actionButton} onPress={onPress}>
    <View style={dashboardStyles.actionIconCircle}>
      <Ionicons name={icon} size={24} color="#fff" />
    </View>
    <ThemedText style={dashboardStyles.actionText}>{title}</ThemedText>
  </TouchableOpacity>
);


export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [alertas, setAlertas] = useState<AlertaInventario[]>([]);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [ordenesPendientes, setOrdenesPendientes] = useState<Order[]>([]);
  const [totalesHoy, setTotalesHoy] = useState<TotalesPorMetodo>({
    efectivo: 0,
    tarjeta: 0,
    otro: 0,
    total: 0,
  });

  const cargarDatos = useCallback(async () => {
    try {
      const [alertasData, totalesData, pedidosData] = await Promise.all([
        obtenerAlertasActivas(),
        calcularTotalesDelDia(todayISO()),
        obtenerPedidosPendientes()
      ]);
      setAlertas(alertasData);
      setTotalesHoy(totalesData);
      setOrdenesPendientes(pedidosData);
    } catch {
      // silencioso en dashboard
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Simulación de recarga de datos
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargarDatos().finally(() => setRefreshing(false));
  }, [cargarDatos]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
    // El listener en _layout.tsx manejará la redirección
  };

  const handleAlertaAtendida = (id: string) => {
    setAlertas((prev) => prev.filter((a) => a.id !== id));
  };

  const handleNewOrderSaved = () => {
    Alert.alert('Éxito', 'Venta registrada correctamente');
    onRefresh(); // Recargar estadísticas y alertas si aplica
  };

  return (
    <ThemedView style={dashboardStyles.container}>
      <OrderFormModal
        visible={orderModalVisible}
        onClose={() => setOrderModalVisible(false)}
        onSave={handleNewOrderSaved}
      />
      {/* Header */}
      <View style={dashboardStyles.header}>
        <View>
          <ThemedText type="subtitle" darkColor="#9ba1a6" style={{ color: '#666' }}>Hola, Admin</ThemedText>
          <ThemedText type="title">Tacos El Guero</ThemedText>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={dashboardStyles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={dashboardStyles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {/* Sección de Resumen del Día */}
        <ThemedText type="subtitle" style={dashboardStyles.sectionTitle}>Resumen del Día</ThemedText>
        <View style={dashboardStyles.statsGrid}>
          <StatCard
            title="Ventas Totales"
            value={formatMXN(totalesHoy.total)}
            icon="cash-outline"
            color="#10b981"
          />
          <StatCard title="Pedidos Activos" value={ordenesPendientes.length.toString()} icon="restaurant-outline" color="#f59e0b" />
          <StatCard title="Clientes" value="142" icon="people-outline" color="#3b82f6" />
          <StatCard
            title="Inventario Bajo"
            value={alertas.length > 0 ? `${alertas.length} items` : '✓ OK'}
            icon="alert-outline"
            color={alertas.length > 0 ? '#ef4444' : '#10b981'}
          />
        </View>

        {/* Sección de Alertas / Pendientes */}
        <ThemedText type="subtitle" style={dashboardStyles.sectionTitle}>Atención Requerida</ThemedText>
        <View style={dashboardStyles.alertsContainer}>
          {alertas.length === 0 ? (
            <ThemedView style={[dashboardStyles.alertItem, { justifyContent: 'center' }]}>
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
        <ThemedText type="subtitle" style={dashboardStyles.sectionTitle}>Acciones Rápidas</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dashboardStyles.actionsRow}>
          <QuickAction title="Nueva Venta" icon="add-circle-outline" onPress={() => setOrderModalVisible(true)} />
          <QuickAction title="Activos" icon="flash-outline" onPress={() => router.push('/(tabs)/activos')} />
          <QuickAction title="Inventario" icon="cube-outline" onPress={() => router.push('/(tabs)/inventario')} />
          <QuickAction title="Corte de Caja" icon="calculator-outline" onPress={() => router.push('/(tabs)/corte-caja')} />
          <QuickAction title="Personal" icon="people-circle-outline" onPress={() => router.push('/(tabs)/personal')} />
        </ScrollView>

        {/* Gráfico Placeholder (Imagen o Vista simple) */}
        <ThemedText type="subtitle" style={dashboardStyles.sectionTitle}>Tendencia Semanal</ThemedText>
        <View style={dashboardStyles.chartPlaceholder}>
          <View style={[dashboardStyles.bar, { height: '40%' }]} />
          <View style={[dashboardStyles.bar, { height: '60%' }]} />
          <View style={[dashboardStyles.bar, { height: '50%' }]} />
          <View style={[dashboardStyles.bar, { height: '80%' }]} />
          <View style={[dashboardStyles.bar, { height: '70%' }]} />
          <View style={[dashboardStyles.bar, { height: '90%' }]} />
          <View style={[dashboardStyles.bar, { height: '65%' }]} />
        </View>
        <View style={dashboardStyles.daysRow}>
          <ThemedText style={dashboardStyles.dayText}>L</ThemedText>
          <ThemedText style={dashboardStyles.dayText}>M</ThemedText>
          <ThemedText style={dashboardStyles.dayText}>M</ThemedText>
          <ThemedText style={dashboardStyles.dayText}>J</ThemedText>
          <ThemedText style={dashboardStyles.dayText}>V</ThemedText>
          <ThemedText style={dashboardStyles.dayText}>S</ThemedText>
          <ThemedText style={dashboardStyles.dayText}>D</ThemedText>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const dashboardStyles = StyleSheet.create({
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
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
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  chip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: '#841584',
    borderColor: '#841584',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
  btnGuardar: {
    backgroundColor: '#841584',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#841584',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnGuardarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
