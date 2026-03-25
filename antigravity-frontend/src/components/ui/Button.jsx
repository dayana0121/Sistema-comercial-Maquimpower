// src/components/ui/Button.jsx
import Spinner from './Spinner';

export default function Button({
    children,
    variant = 'primary',
    loading = false,
    disabled = false,
    onClick,
    type = 'button',
    className = ''
}) {
    const baseStyle = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
        secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 focus:ring-gray-400",
        danger: "bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 focus:ring-red-500",
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseStyle} ${variants[variant]} ${className}`}
        >
            {loading && <Spinner size="sm" />}
            {children}
        </button>
    );
}