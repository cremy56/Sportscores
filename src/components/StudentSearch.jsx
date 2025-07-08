// src/components/StudentSearch.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function StudentSearch({ onStudentSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm) {
      setResults([]);
      return;
    }
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      supabase.rpc('search_students', { p_search_term: searchTerm })
        .then(({ data, error }) => {
          if (error) console.error(error);
          else setResults(data);
          setLoading(false);
        });
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSelect = (student) => {
    onStudentSelect(student); // Geef het hele object door
    setSearchTerm('');
    setResults([]);
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Zoek een leerling op naam..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg shadow-sm"
      />
      {loading && <p className="absolute right-3 top-2 text-gray-500 text-sm">...</p>}
      {results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map(student => (
            <li 
              key={student.id} 
              onClick={() => handleSelect(student)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {student.naam}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
