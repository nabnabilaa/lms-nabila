// Extracted from file.html - Badge Component
export const Badge = ({ variant = 'blue', children, className = "" }) => {
    const styles = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-emerald-50 text-emerald-600',
        orange: 'bg-orange-50 text-orange-600',
        gray: 'bg-gray-100 text-gray-600',
        purple: 'bg-purple-50 text-purple-600',
        gold: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
        black: 'bg-gray-900 text-white'
    };

    return (
        <span className={`px-2 py-1 rounded-md text-xs font-medium ${styles[variant] || styles.blue} ${className}`}>
            {children}
        </span>
    );
};
