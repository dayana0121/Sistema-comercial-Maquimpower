/* ================================================================
   COMPONENTE: AlertModal
   Descripción: Modal de alerta reutilizable con paleta de colores 
   del sistema. Reemplaza window.alert() y alertas nativas.
   
   Uso:
   const { showAlert, alertData, closeAlert } = useAlertModal();
   showAlert('Título', 'Mensaje', 'success|error|warning|info');
   
   ================================================================ */

import '../../styles/alert-modal.css';

export default function AlertModal({ isOpen, title, message, type = 'info', onClose }) {
    if (!isOpen) return null;

    // Mapeo de tipos de alerta a colores de la paleta del sistema
    const typeConfig = {
        success: {
            bgClass: 'bg-green-50',
            borderClass: 'border-green-200',
            titleClass: 'text-green-900',
            messageClass: 'text-green-700',
            buttonClass: 'bg-green-500 hover:bg-green-600',
            iconColor: 'text-green-500',
        },
        error: {
            bgClass: 'bg-red-50',
            borderClass: 'border-red-200',
            titleClass: 'text-red-900',
            messageClass: 'text-red-700',
            buttonClass: 'bg-red-500 hover:bg-red-600',
            iconColor: 'text-red-500',
        },
        warning: {
            bgClass: 'bg-amber-50',
            borderClass: 'border-amber-200',
            titleClass: 'text-amber-900',
            messageClass: 'text-amber-700',
            buttonClass: 'bg-amber-500 hover:bg-amber-600',
            iconColor: 'text-amber-500',
        },
        info: {
            bgClass: 'bg-blue-50',
            borderClass: 'border-blue-200',
            titleClass: 'text-blue-900',
            messageClass: 'text-blue-700',
            buttonClass: 'bg-blue-500 hover:bg-blue-600',
            iconColor: 'text-blue-500',
        },
    };

    const config = typeConfig[type] || typeConfig.info;

    // Iconos para cada tipo de alerta
    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'warning':
                return '⚠';
            case 'info':
            default:
                return 'ℹ';
        }
    };

    return (
        <>
            {/* Overlay oscuro del modal */}
            <div
                className="alert-modal-backdrop fixed inset-0 bg-black/40 transition-opacity z-50"
                onClick={onClose}
            />

            {/* Contenedor central del modal */}
            <div className="alert-modal-container fixed inset-0 flex items-center justify-center z-50 p-4">
                {/* Tarjeta del modal */}
                <div
                    className={`alert-modal-card bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 ${config.borderClass} ${config.bgClass}`}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Encabezado del modal con icono */}
                    <div className="alert-modal-header flex items-center gap-3 p-6 border-b border-slate-100">
                        <div className={`alert-modal-icon flex items-center justify-center w-12 h-12 rounded-full ${config.bgClass} ${config.iconColor}`}>
                            <span className="text-xl font-bold">{getIcon()}</span>
                        </div>
                        <h2 className={`alert-modal-title text-xl font-bold ${config.titleClass}`}>
                            {title}
                        </h2>
                    </div>

                    {/* Contenido del mensaje */}
                    <div className="alert-modal-content p-6">
                        <p className={`alert-modal-message text-base ${config.messageClass}`}>
                            {message}
                        </p>
                    </div>

                    {/* Acciones (botones) */}
                    <div className="alert-modal-actions p-6 border-t border-slate-100 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className={`alert-modal-button-close ${config.buttonClass} text-white px-6 py-2.5 rounded-lg font-bold transition-colors shadow-sm`}
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
