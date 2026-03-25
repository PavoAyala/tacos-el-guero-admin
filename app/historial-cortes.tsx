import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type CorteCaja, obtenerHistorialCortes } from '@/lib/corte-caja';

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatMXN = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const formatFecha = (fechaISO: string) =>
    new Date(fechaISO + 'T12:00:00').toLocaleDateString('es-MX', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

// ── CorteCard ────────────────────────────────────────────────────────────────

interface CorteCardProps {
    corte: CorteCaja;
}

const CorteCard = ({ corte }: CorteCardProps) => {
    const diferencia = corte.diferencia ?? corte.efectivo_contado - corte.efectivo_sistema;
    const esFuga = diferencia < 0;
    const esSinDif = Math.abs(diferencia) < 0.01;

    let estadoColor: string;
    let estadoIcon: keyof typeof Ionicons.glyphMap;
    let estadoLabel: string;

    if (esSinDif) {
        estadoColor = '#10b981';
        estadoIcon = 'checkmark-circle';
        estadoLabel = 'Sin diferencia';
    } else if (esFuga) {
        estadoColor = '#ef4444';
        estadoIcon = 'alert-circle';
        estadoLabel = 'Faltante';
    } else {
        estadoColor = '#10b981';
        estadoIcon = 'trending-up';
        estadoLabel = 'Sobrante';
    }

    return (
        <View style={styles.corteCard}>
            {/* Encabezado */}
            <View style={styles.corteHeader}>
                <View>
                    <ThemedText style={styles.corteFecha}>{formatFecha(corte.fecha)}</ThemedText>
                    <ThemedText style={styles.corteTotal}>{formatMXN(corte.total_sistema)}</ThemedText>
                    <ThemedText style={styles.corteTotalLabel}>en ventas totales</ThemedText>
                </View>
                <View style={[styles.estadoBadge, { backgroundColor: estadoColor + '20' }]}>
                    <Ionicons name={estadoIcon} size={16} color={estadoColor} />
                    <ThemedText style={[styles.estadoText, { color: estadoColor }]}>{estadoLabel}</ThemedText>
                </View>
            </View>

            {/* Desglose por método */}
            <View style={styles.desglose}>
                <View style={styles.desgloseItem}>
                    <ThemedText style={styles.desgloseLabel}>💵 Efectivo sistema</ThemedText>
                    <ThemedText style={styles.desgloseValor}>{formatMXN(corte.efectivo_sistema)}</ThemedText>
                </View>
                <View style={styles.desgloseItem}>
                    <ThemedText style={styles.desgloseLabel}>💳 Tarjeta</ThemedText>
                    <ThemedText style={styles.desgloseValor}>{formatMXN(corte.tarjeta_sistema)}</ThemedText>
                </View>
            </View>

            {/* Efectivo contado */}
            <View style={[styles.diferenciaRow, { backgroundColor: estadoColor + '10' }]}>
                <ThemedText style={styles.diferenciaLabel}>Efectivo contado</ThemedText>
                <ThemedText style={styles.diferenciaValor}>{formatMXN(corte.efectivo_contado)}</ThemedText>
            </View>

            {/* Diferencia final */}
            <View style={[styles.diferenciaRow, { backgroundColor: estadoColor + '25', borderRadius: 8 }]}>
                <ThemedText style={[styles.diferenciaLabel, { fontWeight: '700' }]}>
                    {esFuga ? '⚠️ Faltante' : '✅ Diferencia'}
                </ThemedText>
                <ThemedText style={[styles.diferenciaValor, { color: estadoColor, fontWeight: '700' }]}>
                    {formatMXN(diferencia)}
                </ThemedText>
            </View>

            {/* Notas */}
            {corte.notas ? (
                <ThemedText style={styles.notas}>📝 {corte.notas}</ThemedText>
            ) : null}
        </View>
    );
};

// ── EmptyState ────────────────────────────────────────────────────────────────

const EmptyState = ({ onPress }: { onPress: () => void }) => (
    <View style={styles.emptyState}>
        <Ionicons name="calculator-outline" size={60} color="#d1d5db" />
        <ThemedText style={styles.emptyText}>Sin cortes registrados</ThemedText>
        <ThemedText style={styles.emptySubText}>
            Los cortes aparecerán aquí después de guardarlos
        </ThemedText>
        <TouchableOpacity style={styles.nuevoCorteBtn} onPress={onPress}>
            <ThemedText style={styles.nuevoCorteBtnText}>Hacer primer corte</ThemedText>
        </TouchableOpacity>
    </View>
);

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function HistorialCortesScreen() {
    const router = useRouter();
    const [cortes, setCortes] = useState<CorteCaja[]>([]);
    const [cargando, setCargando] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const data = await obtenerHistorialCortes();
            setCortes(data);
        } catch {
            Alert.alert('Error', 'No se pudo cargar el historial de cortes.');
        } finally {
            setCargando(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        cargar();
    }, [cargar]);

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#841584" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <ThemedText type="title">Historial de Cortes</ThemedText>
                    <ThemedText style={styles.headerSub}>Registro diario de caja</ThemedText>
                </View>
            </View>

            {cargando ? (
                <ActivityIndicator size="large" color="#841584" style={{ marginTop: 60 }} />
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#841584"
                        />
                    }
                >
                    {cortes.length > 0 ? (
                        <>
                            <ThemedText style={styles.resultCount}>
                                {cortes.length} corte{cortes.length === 1 ? '' : 's'} registrado
                                {cortes.length === 1 ? '' : 's'}
                            </ThemedText>
                            {cortes.map((c) => (
                                <CorteCard key={c.id} corte={c} />
                            ))}
                        </>
                    ) : (
                        <EmptyState onPress={() => router.back()} />
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </ThemedView>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    header: {
        paddingHorizontal: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        padding: 8,
        backgroundColor: '#f3e8ff',
        borderRadius: 10,
    },
    headerSub: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 1,
    },
    scroll: {
        paddingHorizontal: 16,
    },
    resultCount: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 12,
    },

    // Card de corte
    corteCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.09,
        shadowRadius: 4,
        gap: 10,
    },
    corteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    corteFecha: {
        fontSize: 12,
        color: '#9ca3af',
        textTransform: 'capitalize',
    },
    corteTotal: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827',
        marginTop: 2,
    },
    corteTotalLabel: {
        fontSize: 11,
        color: '#9ca3af',
    },
    estadoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    estadoText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Desglose
    desglose: {
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 10,
        gap: 6,
    },
    desgloseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    desgloseLabel: {
        fontSize: 13,
        color: '#6b7280',
    },
    desgloseValor: {
        fontSize: 13,
        color: '#374151',
    },

    // Diferencia
    diferenciaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
    },
    diferenciaLabel: {
        fontSize: 13,
        color: '#374151',
    },
    diferenciaValor: {
        fontSize: 14,
        color: '#374151',
    },

    // Notas
    notas: {
        fontSize: 12,
        color: '#9ca3af',
        fontStyle: 'italic',
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
        gap: 10,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginTop: 10,
    },
    emptySubText: {
        fontSize: 13,
        color: '#9ca3af',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    nuevoCorteBtn: {
        marginTop: 16,
        backgroundColor: '#841584',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    nuevoCorteBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
});
