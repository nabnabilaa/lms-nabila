// Extracted from file.html - ProgressBar Component
export const ProgressBar = ({ progress, color = 'bg-blue-600', height = 'h-2' }) => (
    <div className={`w-full bg-gray-100 ${height} rounded-full overflow-hidden`}>
        <div
            className={`${color} h-full transition-all duration-700 ease-out`}
            style={{ width: `${progress}%` }}
        />
    </div>
);
