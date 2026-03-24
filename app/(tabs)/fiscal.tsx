import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { obtenerResumenFiscalMensual, ResumenFiscalMensual } from '@/lib/fiscal';
import { Gasto, MetodoPagoGasto, NuevoGasto, crearGasto, obtenerGastosDelMes } from '@/lib/gastos';

const formatMXN = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

function currentPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function currentDateISO() {
    return new Date().toLocaleDateString('en-CA');
}

function formatPeriodLabel(period: string) {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('es-MX', {
        month: 'long',
        year: 'numeric',
    });
}

function shiftPeriod(period: string, delta: number) {
    const [year, month] = period.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const METODOS_PAGO: MetodoPagoGasto[] = [
    'efectivo',
    'tarjeta',
    'transferencia',
    'spei',
    'otro',
];

const FORM_GASTO_VACIO: NuevoGasto = {
    fecha: currentDateISO(),
    concepto: '',
    subtotal: 0,
    iva: 0,
    total: 0,
    metodo_pago: 'efectivo',
    categoria: '',
    deducible: true,
    acreditable: true,
    cfdi_folio: '',
    notas: '',
};

function buildTotal(subtotal: number, iva: number) {
    return Math.round((subtotal + iva + Number.EPSILON) * 100) / 100;
}

function ExpenseFormModal({
    visible,
    onClose,
    onSaved,
}: {
    visible: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form, setForm] = useState<NuevoGasto>(FORM_GASTO_VACIO);
    const [guardando, setGuardando] = useState(false);

    const inputBg = useThemeColor({}, 'inputBackground');
    const inputBorder = useThemeColor({}, 'inputBorder');
    const textColor = useThemeColor({}, 'text');
    const cardBg = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');

    useEffect(() => {
        if (visible) {
            setForm({
                ...FORM_GASTO_VACIO,
                fecha: currentDateISO(),
            });
        }
    }, [visible]);

    const setNumberField = (field: 'subtotal' | 'iva') => (value: string) => {
        const parsed = Number.parseFloat(value.replace(',', '.')) || 0;
        setForm((prev) => {
            const next = { ...prev, [field]: parsed };
            return { ...next, total: buildTotal(next.subtotal, next.iva) };
        });
    };

    const handleGuardar = async () => {
        setGuardando(true);
        try {
            await crearGasto(form);
            Alert.alert('Gasto guardado', 'El gasto se registró correctamente.');
            onSaved();
            onClose();
        } catch (error: any) {
            Alert.alert('Error', error.message ?? 'No se pudo guardar el gasto.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose} />
            <View style={[styles.sheet, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.sheetHandle} />
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.sheetHeader}>
                        <ThemedText type="subtitle">Registrar Gasto</ThemedText>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close-outline" size={26} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    <ThemedText style={styles.label}>Fecha *</ThemedText>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                        value={form.fecha}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, fecha: value }))}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#9ca3af"
                    />

                    <ThemedText style={styles.label}>Concepto *</ThemedText>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                        value={form.concepto}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, concepto: value }))}
                        placeholder="ej. Compra de insumos"
                        placeholderTextColor="#9ca3af"
                    />

                    <ThemedText style={styles.label}>Categoria *</ThemedText>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                        value={form.categoria}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, categoria: value }))}
                        placeholder="ej. Insumos, renta, servicios"
                        placeholderTextColor="#9ca3af"
                    />

                    <View style={styles.row}>
                        <View style={styles.column}>
                            <ThemedText style={styles.label}>Subtotal *</ThemedText>
                            <TextInput
                                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                value={form.subtotal ? String(form.subtotal) : ''}
                                onChangeText={setNumberField('subtotal')}
                                placeholder="0.00"
                                placeholderTextColor="#9ca3af"
                                keyboardType="decimal-pad"
                            />
                        </View>
                        <View style={styles.column}>
                            <ThemedText style={styles.label}>IVA *</ThemedText>
                            <TextInput
                                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                                value={form.iva ? String(form.iva) : ''}
                                onChangeText={setNumberField('iva')}
                                placeholder="0.00"
                                placeholderTextColor="#9ca3af"
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    <ThemedText style={styles.label}>Total</ThemedText>
                    <View style={[styles.readonlyBox, { borderColor, backgroundColor: inputBg }]}>
                        <ThemedText type="defaultSemiBold">{formatMXN(form.total)}</ThemedText>
                    </View>

                    <ThemedText style={styles.label}>Metodo de pago *</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        {METODOS_PAGO.map((metodo) => {
                            const selected = form.metodo_pago === metodo;
                            return (
                                <TouchableOpacity
                                    key={metodo}
                                    style={[styles.chip, selected && styles.chipSelected]}
                                    onPress={() => setForm((prev) => ({ ...prev, metodo_pago: metodo }))}
                                >
                                    <ThemedText style={[styles.chipText, selected && styles.chipTextSelected]}>
                                        {metodo}
                                    </ThemedText>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <ThemedText type="defaultSemiBold">Deducible</ThemedText>
                            <ThemedText style={styles.helperText}>Impacta utilidad fiscal.</ThemedText>
                        </View>
                        <Switch
                            value={form.deducible}
                            onValueChange={(value) => setForm((prev) => ({ ...prev, deducible: value }))}
                            trackColor={{ false: '#9ca3af', true: '#10b981' }}
                        />
                    </View>

                    <View style={styles.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <ThemedText type="defaultSemiBold">IVA acreditable</ThemedText>
                            <ThemedText style={styles.helperText}>Suma al IVA acreditable del mes.</ThemedText>
                        </View>
                        <Switch
                            value={!!form.acreditable}
                            onValueChange={(value) => setForm((prev) => ({ ...prev, acreditable: value }))}
                            trackColor={{ false: '#9ca3af', true: '#3b82f6' }}
                        />
                    </View>

                    <ThemedText style={styles.label}>CFDI o referencia</ThemedText>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                        value={form.cfdi_folio}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, cfdi_folio: value }))}
                        placeholder="Opcional"
                        placeholderTextColor="#9ca3af"
                    />

                    <ThemedText style={styles.label}>Notas</ThemedText>
                    <TextInput
                        style={[styles.input, styles.multilineInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                        value={form.notas}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, notas: value }))}
                        placeholder="Opcional"
                        placeholderTextColor="#9ca3af"
                        multiline
                    />

                    <TouchableOpacity
                        style={[styles.primaryButton, guardando && { opacity: 0.6 }]}
                        onPress={handleGuardar}
                        disabled={guardando}
                    >
                        {guardando ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <ThemedText style={styles.primaryButtonText}>Guardar Gasto</ThemedText>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </Modal>
    );
}

function MetricCard({
    title,
    value,
    tone,
    subtitle,
}: {
    title: string;
    value: string;
    tone: string;
    subtitle?: string;
}) {
    const cardBg = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const subtext = useThemeColor({}, 'subtext');

    return (
        <ThemedView style={[styles.metricCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={[styles.metricTone, { backgroundColor: tone }]} />
            <ThemedText style={styles.metricTitle}>{title}</ThemedText>
            <ThemedText type="subtitle" style={styles.metricValue}>{value}</ThemedText>
            {subtitle ? <ThemedText style={[styles.helperText, { color: subtext }]}>{subtitle}</ThemedText> : null}
        </ThemedView>
    );
}

function GastoRow({ gasto }: { gasto: Gasto }) {
    const borderColor = useThemeColor({}, 'border');
    const subtext = useThemeColor({}, 'subtext');

    return (
        <View style={[styles.gastoRow, { borderBottomColor: borderColor }]}>
            <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{gasto.concepto}</ThemedText>
                <ThemedText style={[styles.helperText, { color: subtext }]}>
                    {gasto.fecha} · {gasto.categoria} · {gasto.metodo_pago}
                </ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <ThemedText type="defaultSemiBold">{formatMXN(gasto.total)}</ThemedText>
                <ThemedText style={[styles.helperText, { color: subtext }]}>
                    IVA {formatMXN(gasto.iva)}
                </ThemedText>
            </View>
        </View>
    );
}

export default function FiscalScreen() {
    const router = useRouter();
    const [periodo, setPeriodo] = useState(currentPeriod());
    const [resumen, setResumen] = useState<ResumenFiscalMensual | null>(null);
    const [gastos, setGastos] = useState<Gasto[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expenseModalVisible, setExpenseModalVisible] = useState(false);

    const cardBg = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const textColor = useThemeColor({}, 'text');
    const subtext = useThemeColor({}, 'subtext');

    const cargarModulo = useCallback(async () => {
        try {
            const [resumenData, gastosData] = await Promise.all([
                obtenerResumenFiscalMensual(periodo),
                obtenerGastosDelMes(periodo),
            ]);
            setResumen(resumenData);
            setGastos(gastosData);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo cargar el módulo fiscal.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [periodo]);

    useEffect(() => {
        setLoading(true);
        cargarModulo();
    }, [cargarModulo]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        cargarModulo();
    }, [cargarModulo]);

    const statusLabel = useMemo(() => {
        if (!resumen) return '';
        if (resumen.errores.length > 0) return 'Datos insuficientes';
        if (resumen.iva_neto > 0) return 'IVA por pagar';
        if (resumen.iva_neto < 0) return 'Saldo a favor';
        return 'IVA en balance';
    }, [resumen]);

    return (
        <ThemedView style={styles.container}>
            <ExpenseFormModal
                visible={expenseModalVisible}
                onClose={() => setExpenseModalVisible(false)}
                onSaved={onRefresh}
            />

            <View style={styles.header}>
                <View>
                    <ThemedText style={[styles.periodLabel, { color: subtext }]}>Modulo Fiscal</ThemedText>
                    <ThemedText type="title">Resumen Mensual</ThemedText>
                </View>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: cardBg, borderColor }]}
                        onPress={onRefresh}
                    >
                        <Ionicons name="refresh-outline" size={20} color="#0f766e" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: cardBg, borderColor }]}
                        onPress={() => router.push('/fiscal-config')}
                    >
                        <Ionicons name="settings-outline" size={20} color={textColor} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={[styles.periodCard, { backgroundColor: cardBg, borderColor }]}>
                    <TouchableOpacity onPress={() => setPeriodo((prev) => shiftPeriod(prev, -1))}>
                        <Ionicons name="chevron-back-outline" size={22} color={textColor} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <ThemedText type="defaultSemiBold" style={{ textTransform: 'capitalize' }}>
                            {formatPeriodLabel(periodo)}
                        </ThemedText>
                        <ThemedText style={[styles.helperText, { color: subtext }]}>
                            {statusLabel || 'Sin datos'}
                        </ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => setPeriodo((prev) => shiftPeriod(prev, 1))}>
                        <Ionicons name="chevron-forward-outline" size={22} color={textColor} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#0f766e" />
                    </View>
                ) : resumen ? (
                    <>
                        {resumen.errores.length > 0 ? (
                            <View style={[styles.noticeCard, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
                                <ThemedText type="defaultSemiBold" style={{ color: '#991b1b' }}>
                                    No se puede calcular el periodo
                                </ThemedText>
                                {resumen.errores.map((error) => (
                                    <ThemedText key={error} style={{ color: '#991b1b' }}>
                                        • {error}
                                    </ThemedText>
                                ))}
                            </View>
                        ) : null}

                        {resumen.warnings.length > 0 ? (
                            <View style={[styles.noticeCard, { backgroundColor: '#fff7ed', borderColor: '#fdba74' }]}>
                                <ThemedText type="defaultSemiBold" style={{ color: '#9a3412' }}>
                                    Observaciones del calculo
                                </ThemedText>
                                {resumen.warnings.map((warning) => (
                                    <ThemedText key={warning} style={{ color: '#9a3412' }}>
                                        • {warning}
                                    </ThemedText>
                                ))}
                            </View>
                        ) : null}

                        <View style={styles.metricsGrid}>
                            <MetricCard title="Ventas totales" value={formatMXN(resumen.ventas_totales)} tone="#10b981" />
                            <MetricCard title="IVA trasladado" value={formatMXN(resumen.iva_trasladado)} tone="#0f766e" />
                            <MetricCard title="IVA acreditable" value={formatMXN(resumen.iva_acreditable)} tone="#3b82f6" />
                            <MetricCard title="IVA neto" value={formatMXN(resumen.iva_neto)} tone={resumen.iva_neto >= 0 ? '#f59e0b' : '#8b5cf6'} />
                            <MetricCard title="Utilidad bruta" value={formatMXN(resumen.utilidad_bruta)} tone="#f97316" />
                            <MetricCard title="ISR estimado" value={formatMXN(resumen.isr_estimado)} tone="#ef4444" />
                        </View>

                        <ThemedView style={[styles.sectionCard, { backgroundColor: cardBg, borderColor }]}>
                            <View style={styles.sectionHeader}>
                                <ThemedText type="subtitle">Desglose Fiscal</ThemedText>
                                <ThemedText style={[styles.helperText, { color: subtext }]}>
                                    {resumen.total_ordenes} ventas · {resumen.total_gastos} gastos
                                </ThemedText>
                            </View>

                            <View style={styles.breakdownRow}>
                                <ThemedText>Ventas gravadas</ThemedText>
                                <ThemedText type="defaultSemiBold">{formatMXN(resumen.ventas_gravadas)}</ThemedText>
                            </View>
                            <View style={styles.breakdownRow}>
                                <ThemedText>Ventas exentas</ThemedText>
                                <ThemedText type="defaultSemiBold">{formatMXN(resumen.ventas_exentas)}</ThemedText>
                            </View>
                            <View style={styles.breakdownRow}>
                                <ThemedText>Base gravada</ThemedText>
                                <ThemedText type="defaultSemiBold">{formatMXN(resumen.base_gravada)}</ThemedText>
                            </View>
                            <View style={styles.breakdownRow}>
                                <ThemedText>Gastos deducibles</ThemedText>
                                <ThemedText type="defaultSemiBold">{formatMXN(resumen.gastos_deducibles)}</ThemedText>
                            </View>
                            <View style={styles.breakdownRow}>
                                <ThemedText>Gastos no deducibles</ThemedText>
                                <ThemedText type="defaultSemiBold">{formatMXN(resumen.gastos_no_deducibles)}</ThemedText>
                            </View>
                            <View style={styles.breakdownRow}>
                                <ThemedText>Utilidad fiscal</ThemedText>
                                <ThemedText type="defaultSemiBold">{formatMXN(resumen.utilidad_fiscal)}</ThemedText>
                            </View>
                        </ThemedView>

                        <ThemedView style={[styles.sectionCard, { backgroundColor: cardBg, borderColor }]}>
                            <View style={styles.sectionHeader}>
                                <ThemedText type="subtitle">Metodos de Pago</ThemedText>
                                <ThemedText style={[styles.helperText, { color: subtext }]}>Solo pagos completados</ThemedText>
                            </View>

                            <View style={styles.breakdownRow}>
                                <ThemedText>Efectivo</ThemedText>
                                <ThemedText type="defaultSemiBold">{formatMXN(resumen.desglose_metodos_pago.efectivo)}</ThemedText>
                            </View>
                            <View style={styles.breakdownRow}>
                                <ThemedText>Tarjeta</ThemedText>
                                <ThemedText type="defaultSemiBold">{formatMXN(resumen.desglose_metodos_pago.tarjeta)}</ThemedText>
                            </View>
                            <View style={styles.breakdownRow}>
                                <ThemedText>Transferencia/SPEI</ThemedText>
                                <ThemedText type="defaultSemiBold">{formatMXN(resumen.desglose_metodos_pago.transferencia)}</ThemedText>
                            </View>
                            <View style={styles.breakdownRow}>
                                <ThemedText>Otros</ThemedText>
                                <ThemedText type="defaultSemiBold">{formatMXN(resumen.desglose_metodos_pago.otro)}</ThemedText>
                            </View>
                        </ThemedView>

                        <ThemedView style={[styles.sectionCard, { backgroundColor: cardBg, borderColor }]}>
                            <View style={styles.sectionHeader}>
                                <View>
                                    <ThemedText type="subtitle">Gastos del Mes</ThemedText>
                                    <ThemedText style={[styles.helperText, { color: subtext }]}>
                                        Captura de gastos para IVA acreditable y utilidad fiscal
                                    </ThemedText>
                                </View>
                                <TouchableOpacity style={styles.addButton} onPress={() => setExpenseModalVisible(true)}>
                                    <Ionicons name="add-outline" size={18} color="#fff" />
                                    <ThemedText style={styles.addButtonText}>Agregar</ThemedText>
                                </TouchableOpacity>
                            </View>

                            {gastos.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="receipt-outline" size={36} color="#94a3b8" />
                                    <ThemedText style={[styles.helperText, { color: subtext, textAlign: 'center' }]}>
                                        Aun no hay gastos capturados en este periodo.
                                    </ThemedText>
                                </View>
                            ) : (
                                gastos.slice(0, 8).map((gasto) => <GastoRow key={gasto.id} gasto={gasto} />)
                            )}
                        </ThemedView>
                    </>
                ) : null}
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    periodLabel: {
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 16,
    },
    periodCard: {
        borderWidth: 1,
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    noticeCard: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        gap: 6,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    metricCard: {
        width: '48%',
        borderRadius: 18,
        borderWidth: 1,
        padding: 14,
        minHeight: 118,
    },
    metricTone: {
        width: 36,
        height: 6,
        borderRadius: 999,
        marginBottom: 12,
    },
    metricTitle: {
        fontSize: 13,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    metricValue: {
        fontSize: 22,
        lineHeight: 26,
    },
    sectionCard: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
        gap: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#0f766e',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
    gastoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    emptyState: {
        paddingVertical: 24,
        alignItems: 'center',
        gap: 10,
    },
    center: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    sheet: {
        maxHeight: '88%',
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
    },
    sheetHandle: {
        width: 44,
        height: 5,
        borderRadius: 999,
        backgroundColor: '#cbd5e1',
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 13,
        marginBottom: 16,
        fontSize: 16,
    },
    multilineInput: {
        minHeight: 92,
        textAlignVertical: 'top',
    },
    readonlyBox: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 13,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    column: {
        flex: 1,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        marginRight: 10,
        backgroundColor: 'transparent',
    },
    chipSelected: {
        backgroundColor: '#0f766e',
        borderColor: '#0f766e',
    },
    chipText: {
        fontSize: 14,
        textTransform: 'capitalize',
    },
    chipTextSelected: {
        color: '#fff',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 16,
    },
    helperText: {
        fontSize: 12,
        lineHeight: 18,
    },
    primaryButton: {
        backgroundColor: '#0f766e',
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 10,
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
});
