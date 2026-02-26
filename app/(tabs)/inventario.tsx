import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
    CATEGORIAS,
    Ingrediente,
    NuevoIngrediente,
    UNIDADES,
    actualizarIngrediente,
    crearIngrediente,
    eliminarIngrediente,
    obtenerIngredientes,
} from '@/lib/inventario';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nivelStock(ing: Ingrediente): 'critico' | 'bajo' | 'ok' {
    if (ing.stock_minimo <= 0) return 'ok';
    const ratio = ing.cantidad_actual / ing.stock_minimo;
    if (ratio <= 1) return 'critico';
    if (ratio <= 1.5) return 'bajo';
    return 'ok';
}

const NIVEL_COLORES = {
    critico: '#ef4444',
    bajo: '#f59e0b',
    ok: '#10b981',
};

// ─── Componente fila de ingrediente ──────────────────────────────────────────

const IngredienteRow = ({
    ing,
    onPress,
}: {
    ing: Ingrediente;
    onPress: () => void;
}) => {
    const nivel = nivelStock(ing);
    const color = NIVEL_COLORES[nivel];
    const porcentaje =
        ing.stock_minimo > 0
            ? Math.min((ing.cantidad_actual / (ing.stock_minimo * 2)) * 100, 100)
            : 100;

    return (
        <TouchableOpacity onPress={onPress} style={styles.row} activeOpacity={0.7}>
            <View style={[styles.rowIndicator, { backgroundColor: color }]} />
            <View style={styles.rowBody}>
                <View style={styles.rowHeader}>
                    <ThemedText style={styles.rowNombre}>{ing.nombre}</ThemedText>
                    <ThemedText style={[styles.rowCantidad, { color }]}>
                        {ing.cantidad_actual} {ing.unidad}
                    </ThemedText>
                </View>
                <ThemedText style={styles.rowCategoria}>{ing.categoria}</ThemedText>
                {/* Barra de progreso */}
                <View style={styles.barraFondo}>
                    <View style={[styles.barraRelleno, { width: `${porcentaje}%`, backgroundColor: color }]} />
                </View>
                <ThemedText style={styles.rowMinimo}>
                    Mínimo: {ing.stock_minimo} {ing.unidad}
                </ThemedText>
            </View>
            {nivel !== 'ok' && (
                <Ionicons name="alert-circle" size={20} color={color} style={{ marginLeft: 6 }} />
            )}
        </TouchableOpacity>
    );
};

// ─── Modal de formulario ──────────────────────────────────────────────────────

const FORM_VACIO: NuevoIngrediente = {
    nombre: '',
    cantidad_actual: 0,
    unidad: 'kg',
    categoria: 'Carnes',
    stock_minimo: 0,
    notas: '',
};

const SelectorItem = ({
    label,
    selected,
    onPress,
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
}) => (
    <TouchableOpacity
        style={[styles.chip, selected && styles.chipSelected]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <ThemedText style={[styles.chipText, selected && styles.chipTextSelected]}>
            {label}
        </ThemedText>
    </TouchableOpacity>
);

const FormModal = ({
    visible,
    ingrediente,
    onClose,
    onSave,
}: {
    visible: boolean;
    ingrediente: Ingrediente | null;
    onClose: () => void;
    onSave: () => void;
}) => {
    const [form, setForm] = useState<NuevoIngrediente>(FORM_VACIO);
    const [guardando, setGuardando] = useState(false);
    const esEdicion = !!ingrediente;

    useEffect(() => {
        if (ingrediente) {
            setForm({
                nombre: ingrediente.nombre,
                cantidad_actual: ingrediente.cantidad_actual,
                unidad: ingrediente.unidad,
                categoria: ingrediente.categoria,
                stock_minimo: ingrediente.stock_minimo,
                notas: ingrediente.notas ?? '',
            });
        } else {
            setForm(FORM_VACIO);
        }
    }, [ingrediente, visible]);

    const handleGuardar = async () => {
        if (!form.nombre.trim()) {
            Alert.alert('Error', 'El nombre es requerido');
            return;
        }
        setGuardando(true);
        try {
            if (esEdicion && ingrediente) {
                await actualizarIngrediente(ingrediente.id, form);
            } else {
                await crearIngrediente(form);
            }
            onSave();
            onClose();
        } catch (e: any) {
            Alert.alert('Error', e.message ?? 'No se pudo guardar');
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = () => {
        Alert.alert('Eliminar', `¿Eliminar "${ingrediente?.nombre}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await eliminarIngrediente(ingrediente!.id);
                        onSave();
                        onClose();
                    } catch (e: any) {
                        Alert.alert('Error', e.message);
                    }
                },
            },
        ]);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose} />
            <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Titulo */}
                    <View style={styles.sheetHeader}>
                        <ThemedText type="subtitle">
                            {esEdicion ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
                        </ThemedText>
                        {esEdicion && (
                            <TouchableOpacity onPress={handleEliminar}>
                                <Ionicons name="trash-outline" size={22} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Nombre */}
                    <ThemedText style={styles.label}>Nombre *</ThemedText>
                    <TextInput
                        style={styles.input}
                        value={form.nombre}
                        onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))}
                        placeholder="ej. Cilantro"
                        placeholderTextColor="#aaa"
                    />

                    {/* Cantidad y Unidad */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                            <ThemedText style={styles.label}>Cantidad actual *</ThemedText>
                            <TextInput
                                style={styles.input}
                                value={String(form.cantidad_actual)}
                                onChangeText={(v) =>
                                    setForm((f) => ({ ...f, cantidad_actual: Number.parseFloat(v) || 0 }))
                                }
                                keyboardType="decimal-pad"
                                placeholderTextColor="#aaa"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <ThemedText style={styles.label}>Stock mínimo *</ThemedText>
                            <TextInput
                                style={styles.input}
                                value={String(form.stock_minimo)}
                                onChangeText={(v) =>
                                    setForm((f) => ({ ...f, stock_minimo: Number.parseFloat(v) || 0 }))
                                }
                                keyboardType="decimal-pad"
                                placeholderTextColor="#aaa"
                            />
                        </View>
                    </View>

                    {/* Unidad */}
                    <ThemedText style={styles.label}>Unidad de medida</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        {UNIDADES.map((u) => (
                            <SelectorItem
                                key={u.value}
                                label={u.value}
                                selected={form.unidad === u.value}
                                onPress={() => setForm((f) => ({ ...f, unidad: u.value }))}
                            />
                        ))}
                    </ScrollView>

                    {/* Categoría */}
                    <ThemedText style={styles.label}>Categoría</ThemedText>
                    <View style={styles.chipsWrap}>
                        {CATEGORIAS.map((c) => (
                            <SelectorItem
                                key={c}
                                label={c}
                                selected={form.categoria === c}
                                onPress={() => setForm((f) => ({ ...f, categoria: c }))}
                            />
                        ))}
                    </View>

                    {/* Notas */}
                    <ThemedText style={styles.label}>Notas (opcional)</ThemedText>
                    <TextInput
                        style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
                        value={form.notas ?? ''}
                        onChangeText={(v) => setForm((f) => ({ ...f, notas: v }))}
                        placeholder="Proveedor, marca, observaciones..."
                        placeholderTextColor="#aaa"
                        multiline
                    />

                    {/* Botón guardar */}
                    <TouchableOpacity
                        style={[styles.btnGuardar, guardando && { opacity: 0.6 }]}
                        onPress={handleGuardar}
                        disabled={guardando}
                    >
                        {guardando ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <ThemedText style={styles.btnGuardarText}>
                                {esEdicion ? 'Guardar Cambios' : 'Agregar Ingrediente'}
                            </ThemedText>
                        )}
                    </TouchableOpacity>
                    <View style={{ height: 30 }} />
                </ScrollView>
            </View>
        </Modal>
    );
};

// ─── Componente de grupo por categoría (evita anidamiento profundo en FlatList) ─

const GrupoCategoria = ({
    categoria,
    items,
    onPressItem,
}: {
    categoria: string;
    items: Ingrediente[];
    onPressItem: (ing: Ingrediente) => void;
}) => (
    <View>
        <View style={styles.categoriaHeader}>
            <ThemedText style={styles.categoriaTitle}>{categoria}</ThemedText>
        </View>
        {items.map((ing) => (
            <IngredienteRow key={ing.id} ing={ing} onPress={() => onPressItem(ing)} />
        ))}
    </View>
);

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function InventarioScreen() {
    const router = useRouter();
    const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
    const [cargando, setCargando] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [seleccionado, setSeleccionado] = useState<Ingrediente | null>(null);
    const [filtro, setFiltro] = useState<'todos' | 'alertas'>('todos');

    const cargar = useCallback(async () => {
        try {
            const data = await obtenerIngredientes();
            setIngredientes(data);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setCargando(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const onRefresh = () => {
        setRefreshing(true);
        cargar();
    };

    const abrirNuevo = () => {
        setSeleccionado(null);
        setModalVisible(true);
    };

    const abrirEdicion = (ing: Ingrediente) => {
        setSeleccionado(ing);
        setModalVisible(true);
    };

    const listaFiltrada =
        filtro === 'alertas'
            ? ingredientes.filter((i) => nivelStock(i) !== 'ok')
            : ingredientes;

    const totalAlertas = ingredientes.filter((i) => nivelStock(i) !== 'ok').length;

    // Agrupar por categoría
    const grupos: Record<string, Ingrediente[]> = {};
    listaFiltrada.forEach((ing) => {
        if (!grupos[ing.categoria]) grupos[ing.categoria] = [];
        grupos[ing.categoria].push(ing);
    });

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View>
                    <ThemedText type="title">Inventario</ThemedText>
                    <ThemedText style={styles.subtitle}>Ingredientes de cocina</ThemedText>
                </View>
                <TouchableOpacity onPress={abrirNuevo} style={styles.addBtn}>
                    <Ionicons name="add" size={26} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Filtros */}
            <View style={styles.filtros}>
                <TouchableOpacity
                    style={[styles.filtroBtn, filtro === 'todos' && styles.filtroBtnActive]}
                    onPress={() => setFiltro('todos')}
                >
                    <ThemedText style={[styles.filtroText, filtro === 'todos' && styles.filtroTextActive]}>
                        Todos ({ingredientes.length})
                    </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filtroBtn, filtro === 'alertas' && styles.filtroBtnActive]}
                    onPress={() => setFiltro('alertas')}
                >
                    {totalAlertas > 0 && (
                        <View style={styles.badge}>
                            <ThemedText style={styles.badgeText}>{totalAlertas}</ThemedText>
                        </View>
                    )}
                    <ThemedText style={[styles.filtroText, filtro === 'alertas' && styles.filtroTextActive]}>
                        Con alerta
                    </ThemedText>
                </TouchableOpacity>
            </View>

            {/* Lista */}
            {(() => {
                if (cargando) {
                    return (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color="#841584" />
                        </View>
                    );
                }
                if (listaFiltrada.length === 0) {
                    const emptyMsg = filtro === 'alertas'
                        ? '¡Todo el inventario está bien! 🎉'
                        : 'Sin ingredientes aún.\nToca "+" para agregar.';
                    return (
                        <View style={styles.centered}>
                            <Ionicons name="cube-outline" size={60} color="#ccc" />
                            <ThemedText style={styles.emptyText}>{emptyMsg}</ThemedText>
                        </View>
                    );
                }
                return (
                    <FlatList
                        data={Object.entries(grupos)}
                        keyExtractor={([cat]) => cat}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        renderItem={({ item: [categoria, items] }) => (
                            <GrupoCategoria
                                categoria={categoria}
                                items={items}
                                onPressItem={abrirEdicion}
                            />
                        )}
                    />
                );
            })()}

            {/* Modal de formulario */}
            <FormModal
                visible={modalVisible}
                ingrediente={seleccionado}
                onClose={() => setModalVisible(false)}
                onSave={cargar}
            />
        </ThemedView>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 50 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 12,
    },
    backBtn: {
        padding: 6,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
    },
    subtitle: { fontSize: 12, color: '#888', marginTop: 2 },
    addBtn: {
        marginLeft: 'auto',
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#841584',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#841584',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
    },
    filtros: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 12,
    },
    filtroBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        gap: 6,
    },
    filtroBtnActive: { backgroundColor: '#841584' },
    filtroText: { fontSize: 13, color: '#555' },
    filtroTextActive: { color: '#fff', fontWeight: '600' },
    badge: {
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    emptyText: { color: '#aaa', textAlign: 'center', lineHeight: 22 },
    categoriaHeader: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderColor: '#88888830',
        opacity: 0.9,
    },
    categoriaTitle: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 1, textTransform: 'uppercase' },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingRight: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f040',
    },
    rowIndicator: { width: 4, alignSelf: 'stretch', marginRight: 12, borderRadius: 2 },
    rowBody: { flex: 1 },
    rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowNombre: { fontSize: 18, fontWeight: '700' },
    rowCantidad: { fontSize: 15, fontWeight: '700' },
    rowCategoria: { fontSize: 11, color: '#999', marginTop: 1 },
    barraFondo: {
        height: 4,
        backgroundColor: '#e5e7eb',
        borderRadius: 2,
        marginTop: 6,
        marginBottom: 2,
        overflow: 'hidden',
    },
    barraRelleno: { height: 4, borderRadius: 2 },
    rowMinimo: { fontSize: 10, color: '#bbb' },
    // Modal / Sheet
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        maxHeight: '90%',
    },
    sheetHandle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
        marginBottom: 16,
    },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        backgroundColor: '#f3f4f6',
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
        color: '#111',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginRight: 6,
        marginBottom: 4,
    },
    chipSelected: { backgroundColor: '#841584', borderColor: '#841584' },
    chipText: { fontSize: 13, color: '#555' },
    chipTextSelected: { color: '#fff', fontWeight: '600' },
    btnGuardar: {
        backgroundColor: '#841584',
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8,
        elevation: 2,
    },
    btnGuardarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
