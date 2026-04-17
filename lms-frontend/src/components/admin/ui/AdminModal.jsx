import React from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

export const AdminModal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[5000] overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Scrollable Container */}
            <div className="flex min-h-full items-center justify-center p-4 py-10 sm:p-6">
                <div
                    className={`relative bg-white rounded-none md:rounded-2xl shadow-xl w-full ${maxWidth} flex flex-col animate-in zoom-in-95 duration-200 transition-all`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0 md:rounded-t-2xl">
                        <h3 id="modal-title" className="font-bold text-gray-900 text-lg">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                            aria-label="Close modal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 md:p-6 overflow-hidden">
                        {children}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
