// src/components/ui/Spinner.jsx
import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 'md', fullscreen = false }) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
    };

    const spinnerElement = (
        <Loader2 className={`animate-spin text-blue-600 ${sizeClasses[size]}`} />
    );

    if (fullscreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-50">
                {spinnerElement}
            </div>
        );
    }

    return <div className="flex justify-center items-center p-2">{spinnerElement}</div>;
}