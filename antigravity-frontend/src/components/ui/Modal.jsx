import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, size = 'md', bgClass = 'bg-white' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white rounded-xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 rounded-t-xl bg-[#FFF9F2] shrink-0 border-b-0">
          <h2 className="text-[20px] font-bold text-slate-800 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-[#1f2937] text-white hover:bg-slate-700 transition-colors shadow-sm"
          >
            ✕
          </button>
        </div>

        {/* Body — scrollable */}
        <div className={`overflow-y-auto overflow-x-auto flex-1 rounded-b-xl ${bgClass}`} style={{ padding: '1.5rem 2rem' }}>
          {children}
        </div>
      </div>
    </div>
  );
}