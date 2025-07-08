// src/components/StudentImport.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function StudentImport({ onImportComplete }) {
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoading(true);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: ";", // <-- DE OPLOSSING: Vertel de parser om semicolons te gebruiken
        complete: async (results) => {
          if (!results.data || results.data.length === 0) {
            toast.error("CSV-bestand is leeg of incorrect geformatteerd.");
            setLoading(false);
            return;
          }

          const promise = supabase.rpc('bulk_add_student_profiles', {
            students: results.data
          });

          toast.promise(promise, {
            loading: 'Bezig met importeren...',
            success: (response) => {
              if (response.error) throw new Error(response.error.message);
              onImportComplete();
              return response.data;
            },
            error: (err) => `Fout bij importeren: ${err.message}`
          });
          
          setLoading(false);
        },
        error: (error) => {
          toast.error(`Fout bij het lezen van CSV: ${error.message}`);
          setLoading(false);
        }
      });
    }
  };

  return (
    <div className="p-4 mt-8 border-t pt-6">
      <h3 className="text-lg font-semibold mb-2">Of Importeer een Lijst (CSV)</h3>
      <p className="text-sm text-gray-500 mb-4">
        Upload een CSV-bestand met de exacte kolomkoppen (gescheiden door puntkomma's): `naam;email;geboortedatum;geslacht`.
      </p>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        disabled={loading}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
      />
    </div>
  );
}