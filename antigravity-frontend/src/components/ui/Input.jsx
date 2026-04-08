// src/components/ui/Input.jsx
import { forwardRef } from 'react';

const Input = forwardRef(({
    label,
    error,
    type = 'text',
    placeholder,
    value,
    onChange,
    icon: Icon,
    iconColor = 'text-slate-400',
    className = '',
    disabled = false,
    ...rest
}, ref) => {
    return (
        <div className={`form-group-custom ${className}`}>
            {label && <label className="form-label-custom">{label}</label>}
            <div className="form-input-container">
                {Icon && <div className={`form-input-icon ${iconColor}`}><Icon size={16} strokeWidth={2.5}/></div>}
                <input
                    ref={ref}
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={`form-input-custom ${Icon ? 'with-icon' : ''} ${error ? 'border-red-500' : ''}`}
                    {...rest}
                />
            </div>
            {error && <span className="text-[10px] text-red-500 font-bold uppercase">{error}</span>}
        </div>
    );
});

Input.displayName = 'Input';
export default Input;