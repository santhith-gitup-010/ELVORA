/**
 * Authentication Context
 * Provides auth state, login/logout, and user data across the app
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('elvora_token'));
    const [loading, setLoading] = useState(true);

    // Check stored auth on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('elvora_user');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
            // Verify token is still valid
            authAPI.getMe()
                .then(res => {
                    setUser(res.data.data.user);
                    localStorage.setItem('elvora_user', JSON.stringify(res.data.data.user));
                })
                .catch(() => {
                    logout();
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const res = await authAPI.login({ email, password });
        const { user: userData, token: newToken } = res.data.data;

        setUser(userData);
        setToken(newToken);
        localStorage.setItem('elvora_token', newToken);
        localStorage.setItem('elvora_user', JSON.stringify(userData));

        return userData;
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('elvora_token');
        localStorage.removeItem('elvora_user');
    };

    const isAuthenticated = !!user && !!token;

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};
