import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUser = useCallback(async () => {
        try {
            // Check if token exists first to avoid unnecessary 401s
            const token = localStorage.getItem('token');
            if (!token) {
                setUser(null);
                setLoading(false);
                return;
            }

            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            setError(null);
        } catch (err) {
            console.error("UserContext fetch error:", err);
            setError(err);
            // If 401, clear user
            if (err.response && err.response.status === 401) {
                setUser(null);
                localStorage.removeItem('token');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch on mount
    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const login = async (credentials) => {
        setLoading(true);
        try {
            const response = await authService.login(credentials);
            if (response.token) {
                localStorage.setItem('token', response.token);
                await fetchUser(); // Re-fetch user details after login
            }
            return response;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await authService.logout();
        } catch (err) {
            console.error("Logout error", err);
        } finally {
            localStorage.removeItem('token');
            setUser(null);
            setLoading(false);
        }
    };

    const refreshUser = async () => {
        // Silent refresh (don't set global loading to true to avoid full screen spinner flicker)
        await fetchUser();
    };

    return (
        <UserContext.Provider value={{ user, loading, error, login, logout, refreshUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
