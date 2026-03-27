// src/components/ui/Input.jsx
import { forwardRef } from 'react';

const Input = forwardRef(({
    label,
    error,
    type = 'text',
    placeholder,
    value,
    onChange,
    name,
    className = ''
}, ref) => {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
            <input
                ref={ref}
                type={type}
                name={name}
                value={value ?? ''}
                onChange={onChange}
                placeholder={placeholder}
                className={`px-3 py-2 border rounded-lg outline-none transition-shadow text-sm text-gray-800 ${error
                        ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                        : 'border-gray-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500'
                    }`}
            />
            {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
        </div>
    );
});

Input.displayName = 'Input';
export default Input;