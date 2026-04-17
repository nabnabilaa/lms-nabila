import { useState, useEffect } from 'react';
import { User, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Socket } from 'socket.io-client';
import type { User as UserType, AuthResponse } from '../../types';

interface LoginPageProps {
    onLogin: (user: UserType) => void;
    socket: Socket | null; // Menerima socket dari App
}

export const LoginPage = ({ onLogin, socket }: LoginPageProps) => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Listener untuk hasil auth dari server
    useEffect(() => {
        if (!socket) return;

        const handleAuthResult = (response: AuthResponse) => {
            setIsLoading(false);
            if (response.success && response.user) {
                // Simpan ke localStorage
                localStorage.setItem('meet_user', JSON.stringify(response.user));
                // Callback ke App
                onLogin(response.user);
            } else {
                setError(response.message || "Authentication failed");
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socket.on("auth-result" as any, handleAuthResult);

        return () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            socket.off("auth-result" as any, handleAuthResult);
        };
    }, [socket, onLogin]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email || !password || (isRegister && !name)) {
            setError("Mohon lengkapi semua data");
            return;
        }
        
        if (!socket) {
            setError("Tidak dapat terhubung ke server");
            return;
        }

        setIsLoading(true);
        if (isRegister) {
            // Emit Register
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            socket.emit("auth-register" as any, email, password, name);
        } else {
            // Emit Login
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            socket.emit("auth-login" as any, email, password);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f1014] p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                        <User size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {isRegister ? "Buat Akun Baru" : "Selamat Datang Kembali"}
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {isRegister ? "Daftar untuk mulai meeting" : "Masuk untuk melanjutkan meeting Anda"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-300 ml-1">Nama Lengkap</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                placeholder="nama@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-300 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 mt-6 active:scale-95"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                {isRegister ? "Daftar Sekarang" : "Masuk"} <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-slate-400 text-sm">
                        {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
                        <button
                            onClick={() => { setIsRegister(!isRegister); setError(null); }}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                        >
                            {isRegister ? "Login disini" : "Daftar sekarang"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};