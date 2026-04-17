// Simple toast notification component
import React, { useState, useEffect } from 'react';
import { X, Award } from 'lucide-react';

let toastId = 0;
const toastCallbacks = new Set();

export const showToast = (message, type = 'success', icon = null) => {
    const id = ++toastId;
    const toast = { id, message, type, icon };
    toastCallbacks.forEach(cb => cb(toast));
};

export const toast = {
    success: (message) => showToast(message, 'success'),
    error: (message) => showToast(message, 'error'),
    info: (message) => showToast(message, 'info'),
    warning: (message) => showToast(message, 'warning'),
    achievement: (message) => showToast(message, 'achievement', '🏆')
};

export const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const addToast = (toast) => {
            setToasts(prev => [...prev, toast]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, 5000);
        };

        toastCallbacks.add(addToast);
        return () => toastCallbacks.delete(addToast);
    }, []);

    return (
        <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`
                        px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md
                        animate-slide-in-right
                        ${toast.type === 'success' ? 'bg-green-500 text-white' : ''}
                        ${toast.type === 'achievement' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : ''}
                        ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
                        ${toast.type === 'info' ? 'bg-blue-500 text-white' : ''}
                    `}
                >
                    {toast.icon && <span className="text-2xl">{toast.icon}</span>}
                    <div className="flex-1 font-medium">{toast.message}</div>
                    <button
                        onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                        className="opacity-70 hover:opacity-100"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};
