import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import {
    DEFAULT_FISCAL_CONFIG,
    FiscalConfigInput,
    guardarFiscalConfig,
    obtenerFiscalConfig,
} from '@/lib/fiscal-config';

const REGIMENES = [
    'Persona Fisica con Actividad Empresarial',
    'Persona Moral',
    'RESICO',
];

export default function FiscalConfigScreen() {
    const router = useRouter();
    const [form, setForm] = useState<FiscalConfigInput>(DEFAULT_FISCAL_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const textColor = useThemeColor({}, 'text');
    const inputBg = useThemeColor({}, 'inputBackground');
    const inputBorder = useThemeColor({}, 'inputBorder');
    const cardBg = useThemeColor({}, 'card');
    const borderColor = useThemeColor({}, 'border');
    const subtext = useThemeColor({}, 'subtext');

    useEffect(() => {
        (async () => {
            try {
                const config = await obtenerFiscalConfig();
                if (config) {
                    setForm({
                        regimen_fiscal: config.regimen_fiscal,
                        tasa_iva: config.tasa_iva,
                        porcentaje_isr: config.porcentaje_isr,
                        rfc: config.rfc ?? '',
                        razon_social: config.razon_social ?? '',
                        ventas_incluyen_iva: config.ventas_incluyen_iva,
                        productos_exentos_habilitados: config.productos_exentos_habilitados,
                        notas: config.notas ?? '',
                    });
                }
            } catch (error) {
                console.error(error);
                Alert.alert('Error', 'No se pudo cargar la configuración fiscal.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const setDecimalField = (field: 'tasa_iva' | 'porcentaje_isr') => (value: string) => {
        const parsed = Number.parseFloat(value.replace(',', '.'));
        setForm((prev) => ({
            ...prev,
            [field]: Number.isFinite(parsed) ? parsed : 0,
        }));
    };

    const handleGuardar = async () => {
        setSaving(true);
        try {
            await guardarFiscalConfig(form);
            Alert.alert('Configuración guardada', 'La configuración fiscal fue actualizada.');
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message ?? 'No se pudo guardar la configuración.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <ThemedView style={styles.center}>
                <ActivityIndicator size="large" color="#0f766e" />
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={textColor} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <ThemedText type="title">Configuracion Fiscal</ThemedText>
                    <ThemedText style={[styles.helperText, { color: subtext }]}>
                        Parametros base para los calculos mensuales
                    </ThemedText>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <ThemedText type="subtitle" style={{ marginBottom: 14 }}>Regimen y Datos Fiscales</ThemedText>

                    <ThemedText style={styles.label}>Regimen fiscal *</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
                        {REGIMENES.map((regimen) => {
                            const selected = form.regimen_fiscal === regimen;
                            return (
                                <TouchableOpacity
                                    key={regimen}
                                    style={[styles.chip, selected && styles.chipSelected]}
                                    onPress={() => setForm((prev) => ({ ...prev, regimen_fiscal: regimen }))}
                                >
                                    <ThemedText style={[styles.chipText, selected && styles.chipTextSelected]}>
                                        {regimen}
                                    </ThemedText>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <ThemedText style={styles.label}>RFC</ThemedText>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                        value={form.rfc}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, rfc: value.toUpperCase() }))}
                        placeholder="Opcional"
                        placeholderTextColor="#9ca3af"
                        autoCapitalize="characters"
                    />

                    <ThemedText style={styles.label}>Razon social</ThemedText>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                        value={form.razon_social}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, razon_social: value }))}
                        placeholder="Opcional"
                        placeholderTextColor="#9ca3af"
                    />
                </ThemedView>

                <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <ThemedText type="subtitle" style={{ marginBottom: 14 }}>Parametros de Calculo</ThemedText>

                    <ThemedText style={styles.label}>Tasa IVA *</ThemedText>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                        value={String(form.tasa_iva)}
                        onChangeText={setDecimalField('tasa_iva')}
                        placeholder="0.16"
                        placeholderTextColor="#9ca3af"
                        keyboardType="decimal-pad"
                    />

                    <ThemedText style={styles.label}>Porcentaje ISR *</ThemedText>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                        value={String(form.porcentaje_isr)}
                        onChangeText={setDecimalField('porcentaje_isr')}
                        placeholder="0.30"
                        placeholderTextColor="#9ca3af"
                        keyboardType="decimal-pad"
                    />

                    <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}>
                            <ThemedText type="defaultSemiBold">Ventas incluyen IVA</ThemedText>
                            <ThemedText style={[styles.helperText, { color: subtext }]}>
                                Si está activo, el sistema separa base e IVA desde el total vendido.
                            </ThemedText>
                        </View>
                        <Switch
                            value={!!form.ventas_incluyen_iva}
                            onValueChange={(value) => setForm((prev) => ({ ...prev, ventas_incluyen_iva: value }))}
                            trackColor={{ false: '#9ca3af', true: '#0f766e' }}
                        />
                    </View>

                    <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}>
                            <ThemedText type="defaultSemiBold">Productos exentos habilitados</ThemedText>
                            <ThemedText style={[styles.helperText, { color: subtext }]}>
                                Permite distinguir ventas gravadas y exentas cuando exista `tax_type`.
                            </ThemedText>
                        </View>
                        <Switch
                            value={!!form.productos_exentos_habilitados}
                            onValueChange={(value) => setForm((prev) => ({ ...prev, productos_exentos_habilitados: value }))}
                            trackColor={{ false: '#9ca3af', true: '#2563eb' }}
                        />
                    </View>
                </ThemedView>

                <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <ThemedText type="subtitle" style={{ marginBottom: 14 }}>Notas</ThemedText>
                    <TextInput
                        style={[styles.input, styles.notesInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                        value={form.notas}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, notas: value }))}
                        placeholder="Notas para contador o criterios internos"
                        placeholderTextColor="#9ca3af"
                        multiline
                    />
                </ThemedView>

                <TouchableOpacity
                    style={[styles.saveButton, saving && { opacity: 0.6 }]}
                    onPress={handleGuardar}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText style={styles.saveButtonText}>Guardar Configuracion</ThemedText>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 18,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    backButton: {
        paddingTop: 4,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 16,
    },
    card: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
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
    notesInput: {
        minHeight: 110,
        textAlignVertical: 'top',
        marginBottom: 0,
    },
    chip: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginRight: 10,
    },
    chipSelected: {
        backgroundColor: '#0f766e',
        borderColor: '#0f766e',
    },
    chipText: {
        fontSize: 14,
    },
    chipTextSelected: {
        color: '#fff',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 18,
    },
    helperText: {
        fontSize: 12,
        lineHeight: 18,
    },
    saveButton: {
        backgroundColor: '#0f766e',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
});
