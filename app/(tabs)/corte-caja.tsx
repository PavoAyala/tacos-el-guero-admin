import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    TotalesPorMetodo,
    calcularTotalesDelDia,
    guardarCorte,
} from '@/lib/corte-caja';

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatMXN = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const todayISO = () => new Date().toISOString().split('T')[0];

// ── Sub-componentes ───────────────────────────────────────────────────────────

interface MetodoPagoCardProps {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    monto: number;
}

const MetodoPagoCard = ({ label, icon, color, monto }: MetodoPagoCardProps) => (
    <View style={[styles.metodoPagoCard, { borderLeftColor: color }]}>
        <View style={[styles.metodoPagoIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.metodoPagoInfo}>
            <ThemedText style={styles.metodoPagoLabel}>{label}</ThemedText>
            <ThemedText style={[styles.metodoPagoMonto, { color }]}>
                {formatMXN(monto)}
            </ThemedText>
        </View>
    </View>
);

interface DiferenciaRowProps {
    label: string;
    monto: number;
    highlight?: boolean;
}

const DiferenciaRow = ({ label, monto, highlight }: DiferenciaRowProps) => {
    const esFuga = monto < 0;
    let color: string;
    if (!highlight) {
        color = '#374151';
    } else if (esFuga) {
        color = '#ef4444';
    } else {
        color = '#10b981';
    }
    return (
        <View style={styles.diferenciaRow}>
            <ThemedText style={[styles.diferenciaLabel, highlight && { fontWeight: '700' }]}>
                {label}
            </ThemedText>
            <ThemedText style={[styles.diferenciaMonto, { color }, highlight && { fontWeight: '700' }]}>
                {formatMXN(monto)}
            </ThemedText>
        </View>
    );
};

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function CorteCajaScreen() {
    const router = useRouter();
    const fecha = todayISO();

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [totales, setTotales] = useState<TotalesPorMetodo>({
        efectivo: 0,
        tarjeta: 0,
        otro: 0,
        total: 0,
    });
    const [efectivoContado, setEfectivoContado] = useState('');
    const [notas, setNotas] = useState('');

    // Cargar totales al montar
    useEffect(() => {
        (async () => {
            try {
                const data = await calcularTotalesDelDia(fecha);
                setTotales(data);
            } catch (e: unknown) {
                Alert.alert('Error', 'No se pudieron cargar los totales del día.');
                console.error(e);
            } finally {
                setCargando(false);
            }
        })();
    }, [fecha]);

    const efectivoContadoNum = Number.parseFloat(efectivoContado.replace(',', '.')) || 0;
    const diferencia = efectivoContadoNum - totales.efectivo;

    const handleGuardar = async () => {
        if (!efectivoContado) {
            Alert.alert('Efectivo requerido', 'Ingresa el efectivo contado antes de guardar.');
            return;
        }

        setGuardando(true);
        try {
            await guardarCorte({
                fecha,
                efectivo_sistema: totales.efectivo,
                tarjeta_sistema: totales.tarjeta,
                otro_sistema: totales.otro,
                total_sistema: totales.total,
                efectivo_contado: efectivoContadoNum,
                notas: notas.trim() || undefined,
            });

            Alert.alert(
                '¡Corte guardado!',
                diferencia < 0
                    ? `⚠️ Diferencia detectada: ${formatMXN(diferencia)}`
                    : `✅ Corte sin diferencias.`,
                [
                    {
                        text: 'Ver historial',
                        onPress: () => router.push('/historial-cortes'),
                    },
                    { text: 'OK' },
                ]
            );
        } catch (e: unknown) {
            Alert.alert('Error', 'No se pudo guardar el corte. Intenta de nuevo.');
            console.error(e);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <ThemedText style={styles.headerFecha}>
                        {new Date().toLocaleDateString('es-MX', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </ThemedText>
                    <ThemedText type="title">Corte de Caja</ThemedText>
                </View>
                <TouchableOpacity
                    style={styles.historialBtn}
                    onPress={() => router.push('/historial-cortes')}
                >
                    <Ionicons name="time-outline" size={20} color="#841584" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

                    {/* ── VENTAS POR MÉTODO ── */}
                    <ThemedText style={styles.sectionTitle}>Ventas del Sistema</ThemedText>
                    {cargando ? (
                        <ActivityIndicator size="large" color="#841584" style={{ marginTop: 20 }} />
                    ) : (
                        <View style={styles.metodosContainer}>
                            <MetodoPagoCard
                                label="Efectivo"
                                icon="cash-outline"
                                color="#10b981"
                                monto={totales.efectivo}
                            />
                            <MetodoPagoCard
                                label="Tarjeta"
                                icon="card-outline"
                                color="#3b82f6"
                                monto={totales.tarjeta}
                            />
                            {totales.otro > 0 && (
                                <MetodoPagoCard
                                    label="Otro"
                                    icon="ellipsis-horizontal-circle-outline"
                                    color="#8b5cf6"
                                    monto={totales.otro}
                                />
                            )}

                            {/* Total general */}
                            <View style={styles.totalCard}>
                                <ThemedText style={styles.totalLabel}>TOTAL VENTAS DEL DÍA</ThemedText>
                                <ThemedText style={styles.totalMonto}>{formatMXN(totales.total)}</ThemedText>
                            </View>
                        </View>
                    )}

                    {/* ── EFECTIVO CONTADO ── */}
                    <ThemedText style={styles.sectionTitle}>Conteo Físico de Efectivo</ThemedText>
                    <View style={styles.inputSection}>
                        <View style={styles.inputWrapper}>
                            <ThemedText style={styles.inputPrefix}>$</ThemedText>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor="#9ca3af"
                                keyboardType="decimal-pad"
                                value={efectivoContado}
                                onChangeText={setEfectivoContado}
                                accessibilityLabel="efectivo contado"
                            />
                        </View>
                        <ThemedText style={styles.inputHint}>
                            Ingresa el monto de efectivo físico contado en caja
                        </ThemedText>
                    </View>

                    {/* ── RESUMEN DE DIFERENCIA ── */}
                    <ThemedText style={styles.sectionTitle}>Resumen del Corte</ThemedText>
                    <View style={styles.resumenCard}>
                        <DiferenciaRow label="Efectivo en sistema" monto={totales.efectivo} />
                        <DiferenciaRow label="Efectivo contado" monto={efectivoContadoNum} />
                        <View style={styles.separador} />
                        <DiferenciaRow
                            label={diferencia >= 0 ? 'Sobrante' : 'Faltante (fuga)'}
                            monto={diferencia}
                            highlight
                        />
                        {diferencia < -5 && (
                            <View style={styles.alertaFuga}>
                                <Ionicons name="warning-outline" size={16} color="#ef4444" />
                                <ThemedText style={styles.alertaFugaText}>
                                    Diferencia significativa detectada. Revisa transacciones.
                                </ThemedText>
                            </View>
                        )}
                    </View>

                    {/* ── NOTAS ── */}
                    <ThemedText style={styles.sectionTitle}>Notas (opcional)</ThemedText>
                    <TextInput
                        style={styles.notasInput}
                        placeholder="Observaciones del corte..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={3}
                        value={notas}
                        onChangeText={setNotas}
                        accessibilityLabel="notas del corte"
                    />

                    {/* ── BOTÓN GUARDAR ── */}
                    <TouchableOpacity
                        style={[styles.guardarBtn, guardando && styles.guardarBtnDisabled]}
                        onPress={handleGuardar}
                        disabled={guardando || cargando}
                        accessibilityLabel="guardar corte de caja"
                    >
                        {guardando ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                                <ThemedText style={styles.guardarBtnText}>Guardar Corte</ThemedText>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingHorizontal: 20,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerFecha: {
        fontSize: 12,
        color: '#9ca3af',
        textTransform: 'capitalize',
        marginBottom: 2,
    },
    historialBtn: {
        padding: 10,
        backgroundColor: '#f3e8ff',
        borderRadius: 10,
    },
    scroll: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: 24,
        marginBottom: 10,
    },

    // Métodos de pago
    metodosContainer: {
        gap: 10,
    },
    metodoPagoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        gap: 12,
        borderLeftWidth: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    metodoPagoIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metodoPagoInfo: {
        flex: 1,
    },
    metodoPagoLabel: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 2,
    },
    metodoPagoMonto: {
        fontSize: 20,
        fontWeight: '700',
    },
    totalCard: {
        backgroundColor: '#841584',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    totalLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#f3e8ff',
        letterSpacing: 0.5,
    },
    totalMonto: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
    },

    // Efectivo contado
    inputSection: {
        gap: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#841584',
        paddingHorizontal: 16,
        elevation: 2,
        shadowColor: '#841584',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    inputPrefix: {
        fontSize: 22,
        color: '#841584',
        fontWeight: '700',
        marginRight: 6,
    },
    input: {
        flex: 1,
        fontSize: 28,
        fontWeight: '700',
        color: '#111827',
        paddingVertical: 14,
    },
    inputHint: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 2,
    },

    // Resumen / diferencia
    resumenCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        gap: 10,
    },
    diferenciaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    diferenciaLabel: {
        fontSize: 14,
        color: '#6b7280',
    },
    diferenciaMonto: {
        fontSize: 16,
        color: '#374151',
    },
    separador: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 2,
    },
    alertaFuga: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        borderRadius: 8,
        padding: 10,
        gap: 8,
        marginTop: 4,
    },
    alertaFugaText: {
        fontSize: 12,
        color: '#ef4444',
        flex: 1,
    },

    // Notas
    notasInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        color: '#374151',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        textAlignVertical: 'top',
        minHeight: 80,
        elevation: 1,
    },

    // Botón guardar
    guardarBtn: {
        backgroundColor: '#841584',
        borderRadius: 14,
        paddingVertical: 16,
        marginTop: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        elevation: 4,
        shadowColor: '#841584',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
    guardarBtnDisabled: {
        opacity: 0.6,
    },
    guardarBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
});
