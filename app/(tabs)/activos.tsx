import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { completarPedido, obtenerPedidosPendientes, Order } from '@/lib/orders';

// ─── Componente para tarjeta de Pedido Activo ────────────────────────────────

const OrderCard = ({ order, onComplete }: { order: Order; onComplete: (id: number) => void }) => {
    const cardBg = useThemeColor({}, 'card');
    const borderCol = useThemeColor({}, 'border');
    const subtextColor = useThemeColor({}, 'subtext');
    const [completando, setCompletando] = useState(false);

    const handleComplete = async () => {
        setCompletando(true);
        try {
            await completarPedido(order.id);
            onComplete(order.id);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo completar el pedido');
        } finally {
            setCompletando(false);
        }
    };

    const formatMXN = (n: number) =>
        n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

    return (
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={styles.cardHeader}>
                <View style={styles.orderTypeContainer}>
                    <Ionicons
                        name={order.order_type === 'dine-in' ? 'restaurant-outline' : 'bicycle-outline'}
                        size={18}
                        color="#841584"
                    />
                    <ThemedText style={styles.orderTypeText}>
                        {order.order_type === 'dine-in' ? 'Comer aquí' : 'Para llevar'}
                    </ThemedText>
                </View>
                <ThemedText style={{ color: subtextColor, fontSize: 12 }}>
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </ThemedText>
            </View>

            {/* Items del pedido */}
            <View style={styles.itemsList}>
                {order.order_items?.map((item, idx) => (
                    <View key={item.id || idx} style={styles.itemRow}>
                        <ThemedText style={styles.itemQuantity}>{item.quantity}x</ThemedText>
                        <ThemedText style={styles.itemName}>
                            {item.products?.name || 'Producto'}
                        </ThemedText>
                        <ThemedText style={{ color: subtextColor, fontSize: 12 }}>
                            {formatMXN(Number(item.subtotal))}
                        </ThemedText>
                    </View>
                ))}
            </View>

            <View style={styles.cardFooter}>
                <View>
                    <ThemedText type="defaultSemiBold" style={styles.amountText}>
                        {formatMXN(Number(order.total_amount))}
                    </ThemedText>
                    <ThemedText style={{ color: subtextColor, fontSize: 10 }}>ID: #{order.id}</ThemedText>
                </View>

                <TouchableOpacity
                    style={[styles.completeButton, completando && { opacity: 0.6 }]}
                    onPress={handleComplete}
                    disabled={completando}
                >
                    {completando ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-done" size={18} color="#fff" />
                            <ThemedText style={styles.completeButtonText}>Completar</ThemedText>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
};

// ─── Pantalla Principal ────────────────────────────────────────────────────────

export default function ActivosScreen() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const textColor = useThemeColor({}, 'text');

    const cargarPedidos = useCallback(async () => {
        try {
            const data = await obtenerPedidosPendientes();
            setOrders(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        cargarPedidos();
    }, [cargarPedidos]);

    const onRefresh = () => {
        setRefreshing(true);
        cargarPedidos();
    };

    const handleOrderCompleted = (id: number) => {
        setOrders((prev) => prev.filter((o) => o.id !== id));
    };

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={textColor} />
                </TouchableOpacity>
                <ThemedText type="title">Pedidos Activos</ThemedText>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#841584" />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <OrderCard order={item} onComplete={handleOrderCompleted} />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#841584']} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="restaurant-outline" size={64} color="#ccc" />
                            <ThemedText style={styles.emptyText}>No hay pedidos pendientes</ThemedText>
                        </View>
                    }
                />
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 15,
    },
    backButton: {
        padding: 5,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 8,
    },
    itemsList: {
        marginBottom: 15,
        gap: 8,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    itemQuantity: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#841584',
        width: 25,
    },
    itemName: {
        flex: 1,
        fontSize: 14,
    },
    orderTypeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    orderTypeText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#841584',
        textTransform: 'uppercase',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 12,
    },
    amountText: {
        fontSize: 20,
        color: '#10b981',
    },
    completeButton: {
        backgroundColor: '#10b981',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 6,
    },
    completeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 100,
        gap: 10,
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
    },
});
