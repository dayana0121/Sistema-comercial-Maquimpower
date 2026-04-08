import { useEffect } from 'react';
import '../../styles/modal-enhancements.css';

export default function Modal({ isOpen, onClose, title, children, size = 'md', bgClass = 'bg-white' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '6xl': 'max-w-7xl',
  };

  return (
    <div
      className="mq-modal fixed inset-x-0 bottom-0 top-[70px] z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`mq-modal-panel w-full ${sizes[size]} max-h-[90vh] flex flex-col`}>
        {/* Header del modal */}
        <div className="mq-modal-header flex items-center justify-between px-8 py-5 shrink-0">
          <h2 className="mq-modal-title text-[20px] font-bold tracking-tight m-4">{title}</h2>
          <button
            onClick={onClose}
            className="mq-modal-close w-12 h-12 flex items-center justify-center rounded-2xl transition-colors shadow-sm"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>

        {/* Cuerpo con scroll */}
        <div className={`mq-modal-body overflow-y-auto overflow-x-auto flex-1 ${bgClass}`} style={{ padding: '1.5rem 2rem' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
