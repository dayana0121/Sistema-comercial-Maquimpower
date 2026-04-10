/* ================================================================
   HOOK: useConfirmModal
   Descripción: Hook reutilizable para manejar el estado de un modal de
   confirmación en cualquier componente.

   Uso:
   const { confirmData, showConfirm, closeConfirm } = useConfirmModal();

   showConfirm({
      title: 'Confirmar acción',
      message: '¿Estás seguro de continuar?',
      type: 'warning',
      confirmLabel: 'Sí, continuar',
      cancelLabel: 'Cancelar',
      onConfirm: handleConfirmAsync,
   });
   ================================================================ */

import { useState } from 'react';

export function useConfirmModal() {
    const [confirmData, setConfirmData] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        confirmLabel: 'Confirmar',
        cancelLabel: 'Cancelar',
        onConfirm: null,
    });

    const showConfirm = ({
        title,
        message,
        type = 'warning',
        confirmLabel = 'Confirmar',
        cancelLabel = 'Cancelar',
        onConfirm,
    }) => {
        setConfirmData({
            isOpen: true,
            title,
            message,
            type,
            confirmLabel,
            cancelLabel,
            onConfirm,
        });
    };

    const closeConfirm = () => {
        setConfirmData(prev => ({
            ...prev,
            isOpen: false,
        }));
    };

    return { confirmData, showConfirm, closeConfirm };
}
