// src/components/StudentImport.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import { db } from '../firebase';
import { writeBatch, doc } from 'firebase/firestore'; // Belangrijke imports
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
        delimiter: ";",
        complete: async (results) => {
          if (!results.data || results.data.length === 0) {
            toast.error("CSV-bestand is leeg of incorrect geformatteerd.");
            setLoading(false);
            return;
          }

          const processedStudents = results.data.map(student => {
            if (typeof student.naam !== 'string' || !student.naam) {
              return { ...student, naam_keywords: [] };
            }
            return {
              ...student,
              naam_keywords: student.naam.toLowerCase().split(' ')
            };
          });

          // ---- FIREBASE LOGICA START ----
          const loadingToast = toast.loading('Bezig met importeren...');
          try {
            // Maak een nieuwe "batch" aan voor meerdere schrijfacties
            const batch = writeBatch(db);

            processedStudents.forEach((student) => {
              // Maak een referentie naar een nieuw document in 'toegestane_gebruikers'
              // met de email als unieke ID.
              const docRef = doc(db, 'toegestane_gebruikers', student.email);
              batch.set(docRef, student); // Voeg de operatie toe aan de batch
            });

            await batch.commit(); // Voer alle operaties in één keer uit

            toast.dismiss(loadingToast);
            toast.success(`${processedStudents.length} leerlingen succesvol geïmporteerd!`);
            onImportComplete();

          } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(`Fout bij importeren: ${error.message}`);
            console.error("Fout bij importeren:", error);
          } finally {
            setLoading(false);
          }
          // ---- FIREBASE LOGICA EIND ----
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