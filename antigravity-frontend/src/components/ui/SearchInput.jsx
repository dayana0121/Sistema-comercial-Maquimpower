// src/components/ui/SearchInput.jsx
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

export default function SearchInput({
    placeholder = 'Buscar...',
    onSearch,
    debounce = 300,
    className = ''
}) {
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            onSearch(searchTerm);
        }, debounce);

        return () => clearTimeout(timer);
    }, [searchTerm, onSearch, debounce]);

    return (
        <div className={`relative w-full md:w-80 ${className}`}>
            <Search className="absolute !left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full !pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
            />
        </div>
    );
}