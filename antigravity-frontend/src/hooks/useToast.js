// src/hooks/useToast.js
import toast from 'react-hot-toast';

// ✅ Exportación nombrada exacta para que coincida con tus imports { useToast }
export const useToast = () => {
    return {
        success: (message) => toast.success(message, {
            duration: 3000,
            position: 'top-right',
            style: { background: '#10B981', color: '#fff', fontWeight: 'bold' },
        }),
        error: (message) => toast.error(message, {
            duration: 5000,
            position: 'top-right',
            style: { background: '#EF4444', color: '#fff', fontWeight: 'bold' },
        }),
        warning: (message) => toast(message, {
            duration: 4000,
            position: 'top-right',
            icon: '⚠️',
            style: { background: '#F59E0B', color: '#fff', fontWeight: 'bold' },
        }),
    };
};