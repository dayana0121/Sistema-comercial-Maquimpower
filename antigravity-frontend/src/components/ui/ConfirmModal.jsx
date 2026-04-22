/* ================================================================
   COMPONENTE: ConfirmModal
   Descripción: Modal de confirmación reutilizable para acciones críticas.

   Uso:
   <ConfirmModal
       isOpen={confirmData.isOpen}
       title="Confirmar acción"
       message="¿Estás seguro de continuar?"
       type="warning"
       confirmLabel="Confirmar"
       cancelLabel="Cancelar"
       onConfirm={handleConfirm}
       onCancel={closeConfirm}
   />
   ================================================================ */

import '../../styles/alert-modal.css';

export default function ConfirmModal({
    isOpen,
    title,
    message,
    type = 'warning',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
}) {
    if (!isOpen) return null;

    const typeConfig = {
        success: {
            bgClass: 'bg-green-50',
            borderClass: 'border-green-200',
            titleClass: 'text-green-900',
            messageClass: 'text-green-700',
            confirmClass: 'bg-green-500 hover:bg-green-600',
            iconColor: 'text-green-500',
        },
        error: {
            bgClass: 'bg-red-50',
            borderClass: 'border-red-200',
            titleClass: 'text-red-900',
            messageClass: 'text-red-700',
            confirmClass: 'bg-red-500 hover:bg-red-600',
            iconColor: 'text-red-500',
        },
        warning: {
            bgClass: 'bg-[#FF450015]',
            borderClass: 'border-red-500',
            titleClass: 'text-amber-900',
            messageClass: 'text-orange-900',
            confirmClass: 'bg-amber-500 hover:bg-amber-600',
            iconColor: 'text-red-500',
        },
        info: {
            bgClass: 'bg-blue-50',
            borderClass: 'border-blue-200',
            titleClass: 'text-blue-900',
            messageClass: 'text-blue-700',
            confirmClass: 'bg-blue-500 hover:bg-blue-600',
            iconColor: 'text-blue-500',
        },
    };

    const config = typeConfig[type] || typeConfig.warning;

    const getIcon = () => {
        switch (type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '⚠';
            case 'info':
            default: return 'ℹ';
        }
    };

    return (
        <>
            <div
                className="confirm-modal-backdrop fixed inset-0 bg-black/40 transition-opacity z-50"
                onClick={onCancel}
            />

            <div className="confirm-modal-container fixed inset-0 flex items-center justify-center z-50 p-4">
                <div
                    className={`confirm-modal-card bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 ${config.borderClass} ${config.bgClass}`}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="confirm-modal-header flex items-center gap-3 p-6 border-b border-slate-100">
                        <div className={`confirm-modal-icon flex items-center justify-center w-12 h-12 rounded-full ${config.bgClass} ${config.iconColor}`}>
                            <span className="text-xl font-bold">{getIcon()}</span>
                        </div>
                        <h2 className={`confirm-modal-title text-xl font-bold ${config.titleClass}`}>
                            {title}
                        </h2>
                    </div>

                    <div className="confirm-modal-content p-6">
                        <p className={`confirm-modal-message text-base ${config.messageClass}`}>
                            {message}
                        </p>
                    </div>

                    <div className="confirm-modal-actions p-6 border-t border-slate-100 flex justify-end gap-3">
                        <button
                            onClick={onCancel}
                            className="confirm-modal-button-cancel bg-slate-200 hover:bg-slate-300 text-white px-6 py-2.5 rounded-lg font-bold transition-colors shadow-sm"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`confirm-modal-button-confirm bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-lg font-bold transition-colors shadow-sm ${config.confirmClass}`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
