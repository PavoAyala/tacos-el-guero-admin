import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { obtenerPersonal, Profile } from '@/lib/personal';

// ─── Componente para tarjeta de Personal ──────────────────────────────────────

const PersonnelCard = ({ person }: { person: Profile }) => {
    const cardBg = useThemeColor({}, 'card');
    const borderCol = useThemeColor({}, 'border');
    const subtextColor = useThemeColor({}, 'subtext');

    const getRoleLabel = (role: string | null) => {
        switch (role) {
            case 'admin': return 'Administrador';
            case 'manager': return 'Gerente';
            case 'staff': return 'Personal';
            default: return 'Usuario';
        }
    };

    const getRoleColor = (role: string | null) => {
        switch (role) {
            case 'admin': return '#ef4444';
            case 'manager': return '#3b82f6';
            case 'staff': return '#10b981';
            default: return '#6b7280';
        }
    };

    return (
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.avatar, { backgroundColor: getRoleColor(person.role) + '20' }]}>
                <Ionicons name="person" size={24} color={getRoleColor(person.role)} />
            </View>
            <View style={styles.info}>
                <ThemedText type="defaultSemiBold" style={styles.name}>
                    {person.display_name || 'Sin nombre'}
                </ThemedText>
                <ThemedText style={[styles.role, { color: getRoleColor(person.role) }]}>
                    {getRoleLabel(person.role)}
                </ThemedText>
                {person.email && (
                    <ThemedText style={{ color: subtextColor, fontSize: 12 }}>{person.email}</ThemedText>
                )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={subtextColor} />
        </ThemedView>
    );
};

// ─── Pantalla Principal ────────────────────────────────────────────────────────

export default function PersonalScreen() {
    const router = useRouter();
    const [personal, setPersonal] = useState<Profile[]>([]);
    const [filteredPersonal, setFilteredPersonal] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const inputBg = useThemeColor({}, 'inputBackground');
    const textColor = useThemeColor({}, 'text');

    const cargarPersonal = useCallback(async () => {
        try {
            const data = await obtenerPersonal();
            setPersonal(data);
            setFilteredPersonal(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        cargarPersonal();
    }, [cargarPersonal]);

    useEffect(() => {
        if (search.trim() === '') {
            setFilteredPersonal(personal);
        } else {
            const lowerSearch = search.toLowerCase();
            setFilteredPersonal(
                personal.filter(
                    (p) =>
                        p.display_name?.toLowerCase().includes(lowerSearch) ||
                        p.email?.toLowerCase().includes(lowerSearch)
                )
            );
        }
    }, [search, personal]);

    const onRefresh = () => {
        setRefreshing(true);
        cargarPersonal();
    };

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={textColor} />
                </TouchableOpacity>
                <ThemedText type="title">Personal</ThemedText>
            </View>

            {/* Buscador */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchInputWrapper, { backgroundColor: inputBg }]}>
                    <Ionicons name="search-outline" size={20} color="#888" style={{ marginRight: 10 }} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Buscar por nombre o correo..."
                        placeholderTextColor="#888"
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={20} color="#888" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#841584" />
                </View>
            ) : (
                <FlatList
                    data={filteredPersonal}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <PersonnelCard person={item} />}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#841584']} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={64} color="#ccc" />
                            <ThemedText style={styles.emptyText}>
                                {search.length > 0 ? 'No se encontraron resultados' : 'No hay personal registrado'}
                            </ThemedText>
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
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        borderRadius: 12,
        height: 50,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        marginBottom: 2,
    },
    role: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
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
