import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const ROLES = [
    { id: 'mesero', label: 'Mesero' },
    { id: 'cocina', label: 'Cocina' },
    { id: 'dueño', label: 'Dueño' }
];

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('mesero');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function signUpWithEmail() {
        if (!name || !email || !password) {
            Alert.alert("Error", "Por favor llena todos los campos");
            return;
        }

        setLoading(true);
        // Supabase sign up
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name,
                    role: role
                }
            }
        });

        if (error) {
            Alert.alert("Error de Registro", error.message);
            setLoading(false);
            return;
        }

        if (data.user) {
            // Con la Opción 2 el perfil se creó automáticamente por el Trigger.
            Alert.alert("Éxito", "Tu cuenta ha sido creada exitosamente.");
            
            // Redirect back to login or wait for auto-login
            router.replace('/(tabs)');
        }

        setLoading(false);
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Crear Cuenta</Text>
                    <Text style={styles.subtitle}>Panel Administrativo</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Nombre Completo</Text>
                    <TextInput
                        style={styles.input}
                        onChangeText={setName}
                        value={name}
                        placeholder="Ej. Juan Pérez"
                        autoCapitalize="words"
                    />

                    <Text style={styles.label}>Correo Electrónico</Text>
                    <TextInput
                        style={styles.input}
                        onChangeText={setEmail}
                        value={email}
                        placeholder="tucorreo@ejemplo.com"
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput
                        style={styles.input}
                        onChangeText={setPassword}
                        value={password}
                        placeholder="Mínimo 6 caracteres"
                        secureTextEntry={true}
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Selecciona tu Rol</Text>
                    <View style={styles.roleContainer}>
                        {ROLES.map((r) => (
                            <TouchableOpacity
                                key={r.id}
                                style={[
                                    styles.roleButton,
                                    role === r.id && styles.roleButtonActive
                                ]}
                                onPress={() => setRole(r.id)}
                            >
                                <Text style={[
                                    styles.roleButtonText,
                                    role === r.id && styles.roleButtonTextActive
                                ]}>
                                    {r.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.buttonContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#0000ff" />
                        ) : (
                            <Button title="Registrarse" onPress={signUpWithEmail} color="#841584" />
                        )}
                    </View>

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>¿Ya tienes una cuenta? </Text>
                        <Text style={styles.loginLink} onPress={() => router.push('/login')}>
                            Inicia Sesión
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
        marginTop: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
    },
    form: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    label: {
        fontSize: 16,
        marginBottom: 5,
        fontWeight: '600',
        color: '#333',
    },
    input: {
        height: 50,
        borderColor: '#ddd',
        borderWidth: 1,
        marginBottom: 20,
        paddingHorizontal: 15,
        borderRadius: 8,
        backgroundColor: '#fafafa',
        fontSize: 16,
    },
    roleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
        marginTop: 5,
    },
    roleButton: {
        flex: 1,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
        backgroundColor: '#fafafa',
    },
    roleButtonActive: {
        borderColor: '#841584',
        backgroundColor: '#f3e5f5',
    },
    roleButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    roleButtonTextActive: {
        color: '#841584',
        fontWeight: 'bold',
    },
    buttonContainer: {
        marginTop: 10,
    },
    loginContainer: {
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    loginText: {
        fontSize: 16,
        color: '#666',
    },
    loginLink: {
        fontSize: 16,
        color: '#841584',
        fontWeight: 'bold',
    },
});
