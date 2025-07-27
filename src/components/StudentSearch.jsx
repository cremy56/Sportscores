// src/components/StudentSearch.jsx
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function StudentSearch({ onStudentSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Stop als de zoekterm te kort is
    if (searchTerm.length < 2) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const searchTermLower = searchTerm.toLowerCase();
        const usersRef = collection(db, 'toegestane_gebruikers');
        
        // De nieuwe Firestore query
        const q = query(
          usersRef,
          where('rol', '==', 'leerling'),
          where('naam_keywords', 'array-contains', searchTermLower)
        );

        const querySnapshot = await getDocs(q);
        const studentResults = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setResults(studentResults);
      } catch (error) {
        console.error("Fout bij het zoeken naar leerlingen:", error);
        // Eventueel een toast-notificatie hier toevoegen voor de gebruiker
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSelect = (student) => {
    onStudentSelect(student); // Geef het hele student-object door
    setSearchTerm(''); // Maak de zoekvelden leeg na selectie
    setResults([]);
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Zoek op voor- of achternaam..." // Duidelijkere placeholder
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