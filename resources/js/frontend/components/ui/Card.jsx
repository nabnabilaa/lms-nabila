// Extracted from file.html - Card Component
export const Card = ({ children, className = "", onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white rounded-xl border border-gray-100 shadow-sm p-6 ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md transition-all' : ''} ${className}`}
    >
        {children}
    </div>
);
