/* ================================================================
   HOOK: useAlertModal
   Descripción: Hook personalizado para manejar modales de alerta
   de forma reutilizable en todo el proyecto.
   
   Uso:
   const { showAlert, alertData, closeAlert } = useAlertModal();
   
   showAlert('Título', 'Mensaje', 'success|error|warning|info');
   
   ================================================================ */

import { useState } from 'react';

export function useAlertModal() {
    const [alertData, setAlertData] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
    });

    const showAlert = (title, message, type = 'info') => {
        setAlertData({
            isOpen: true,
            title,
            message,
            type,
        });
    };

    const closeAlert = () => {
        setAlertData(prev => ({
            ...prev,
            isOpen: false,
        }));
    };

    return { showAlert, closeAlert, alertData };
}
