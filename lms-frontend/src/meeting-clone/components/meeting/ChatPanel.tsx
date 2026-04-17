import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import { Send, X, Smile, Reply, Pencil, MessageSquare, Shield } from 'lucide-react';
import type { ChatMessage } from '../../types';

import { SidePanel } from '../ui/SidePanel';

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (content: string, replyTo?: ChatMessage['replyTo']) => void;
    onEditMessage: (id: string, newContent: string) => void;
    onClose: () => void;
    currentUserId: string;
    isChatAllowed: boolean;
    isChatBanned: boolean;
}

export const ChatPanel = ({ messages, onSendMessage, onEditMessage, onClose, currentUserId, isChatAllowed, isChatBanned }: ChatPanelProps) => {
    const [inputValue, setInputValue] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!inputValue.trim()) return;

        if (editingMessageId) {
            onEditMessage(editingMessageId, inputValue);
            setEditingMessageId(null);
        } else {
            const replyData = replyingTo ? {
                id: replyingTo.id,
                senderName: replyingTo.senderName,
                content: replyingTo.content
            } : undefined;

            onSendMessage(inputValue, replyData);
        }

        setInputValue('');
        setReplyingTo(null);
        setShowEmojiPicker(false);
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setInputValue(prev => prev + emojiData.emoji);
    };

    const startReply = (msg: ChatMessage) => {
        setReplyingTo(msg);
        setEditingMessageId(null);
    };

    const startEdit = (msg: ChatMessage) => {
        setInputValue(msg.content);
        setEditingMessageId(msg.id);
        setReplyingTo(null);
    };

    const cancelAction = () => {
        setReplyingTo(null);
        setEditingMessageId(null);
        setInputValue('');
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <SidePanel
            title="Obrolan"
            icon={MessageSquare}
            onClose={onClose}
            width="w-96 md:w-[500px]"
        >
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                {messages.length === 0 ? (
                    <div className="text-center text-slate-500 mt-10 text-sm">
                        <p>Belum ada pesan.</p>
                        <p className="text-xs mt-1">Mulai percakapan sekarang!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === currentUserId;
                        return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="text-[10px] text-slate-500 mb-1 px-1 flex items-center gap-2">
                                    <span className="font-bold text-slate-400">{isMe ? 'Anda' : msg.senderName}</span>
                                    <span>{formatTime(msg.timestamp)}</span>
                                </div>

                                <div className={`group relative max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${isMe
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                                    }`}>
                                    {/* Reply Context */}
                                    {msg.replyTo && (
                                        <div className={`mb-2 text-xs border-l-2 pl-2 rounded-r p-1 ${isMe ? 'border-white/30 bg-white/10' : 'border-indigo-500/50 bg-indigo-500/10'}`}>
                                            <p className="font-bold opacity-75">{msg.replyTo.senderName}</p>
                                            <p className="opacity-60 truncate">{msg.replyTo.content}</p>
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                                    {/* Edited Indicator */}
                                    {msg.isEdited && <div className="text-[9px] opacity-50 mt-1 text-right italic">(diedit)</div>}

                                    {/* Actions Hover */}
                                    <div className={`absolute top-0 ${isMe ? '-left-14 pr-2' : '-right-14 pl-2'} h-full flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1`}>
                                        <button onClick={() => startReply(msg)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-full border border-white/10" title="Balas">
                                            <Reply size={12} />
                                        </button>
                                        {isMe && (
                                            <button onClick={() => startEdit(msg)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-full border border-white/10" title="Edit">
                                                <Pencil size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {(!isChatAllowed || isChatBanned) ? (
                <div className="p-4 bg-slate-900 border-t border-white/5 relative z-50 text-center shrink-0">
                    <p className="text-sm text-red-400 font-medium flex items-center justify-center gap-2">
                        <Shield size={16} />
                        {isChatBanned ? 'Anda telah diblokir dari obrolan.' : 'Obrolan dinonaktifkan oleh host.'}
                    </p>
                </div>
            ) : (
                <div className="p-4 bg-slate-900 border-t border-white/5 relative z-50 shrink-0">
                    {/* Reply/Edit Indicator */}
                    {(replyingTo || editingMessageId) && (
                        <div className="mb-2 flex items-center justify-between bg-slate-800/50 p-2 rounded-lg border border-white/5 text-xs text-slate-300">
                            <div className="flex items-center gap-2 overflow-hidden">
                                {replyingTo ? (
                                    <>
                                        <Reply size={12} className="text-indigo-400 shrink-0" />
                                        <span className="truncate">Membalas <b>{replyingTo.senderName}</b></span>
                                    </>
                                ) : (
                                    <>
                                        <Pencil size={12} className="text-amber-400 shrink-0" />
                                        <span>Mengedit pesan</span>
                                    </>
                                )}
                            </div>
                            <button onClick={cancelAction} className="p-1 hover:bg-white/10 rounded-full"><X size={12} /></button>
                        </div>
                    )}

                    {/* Emoji Picker Popover */}
                    {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 w-full shadow-2xl rounded-2xl border border-white/10 bg-slate-900 overflow-hidden z-[60]">
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-white/5">
                                <span className="text-xs font-bold text-slate-400">Pilih Emoji</span>
                                <button
                                    onClick={() => setShowEmojiPicker(false)}
                                    className="bg-slate-700 hover:bg-slate-600 p-1 rounded-full text-slate-300 hover:text-white transition-colors"
                                    title="Tutup Emoji"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="h-[300px]">
                                <EmojiPicker
                                    onEmojiClick={handleEmojiClick}
                                    theme={Theme.DARK}
                                    width="100%"
                                    height={300}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 items-end">
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-3 rounded-xl transition-colors ${showEmojiPicker ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                            <Smile size={20} />
                        </button>

                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder={replyingTo ? "Tulis balasan..." : "Ketik pesan..."}
                            className="flex-1 bg-slate-800 text-white placeholder:text-slate-500 p-3 rounded-xl border border-white/5 focus:border-indigo-500 focus:outline-none resize-none scrollbar-hide text-sm max-h-32"
                            rows={1}
                            style={{ minHeight: '46px' }}
                        />

                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim()}
                            className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            )}
        </SidePanel>
    );
};
