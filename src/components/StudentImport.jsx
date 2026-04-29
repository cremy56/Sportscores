// src/components/StudentImport.jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import CryptoJS from 'crypto-js';
import { db } from '../firebase';
import { writeBatch, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

/**
 * Genereert SHA256 hash van smartschool_id
 * @param {string} smartschoolId - De Smartschool user ID
 * @returns {string} SHA256 hash
 */
const generateSmartschoolHash = (smartschoolId) => {
  if (!smartschoolId) {
    throw new Error('Smartschool ID is vereist voor hash-generatie');
  }
  return CryptoJS.SHA256(smartschoolId).toString();
};

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

          // ✅ VALIDATIE: Check of de vereiste velden aanwezig zijn
          const requiredFields = ['smartschool_id', 'naam'];
          const sampleRecord = results.data[0];
          const missingFields = requiredFields.filter(field => !(field in sampleRecord));
          
          if (missingFields.length > 0) {
            toast.error(`Ontbrekende kolommen: ${missingFields.join(', ')}`);
            setLoading(false);
            return;
          }

          const processedStudents = results.data.map((student) => {
            // ✅ NIEUW: Genereer hash van smartschool_id
            let smartschoolIdHash = '';
            try {
              smartschoolIdHash = generateSmartschoolHash(student.smartschool_id);
            } catch (error) {
              console.error(`Hash-fout voor ${student.naam}:`, error);
              throw new Error(`Kan hash niet genereren voor ${student.naam}: ${error.message}`);
            }

            // Process naam voor zoekopdrachten
            const naamKeywords = typeof student.naam === 'string' && student.naam
              ? student.naam.toLowerCase().split(' ')
              : [];

            // ✅ NIEUW FORMAAT: Document wordt nu opgeslagen met hash als ID
            return {
              smartschool_id: student.smartschool_id,  // Originele ID behouden
              smartschool_id_hash: smartschoolIdHash,   // ✅ HASH als veld
              naam: student.naam || '',
              naam_keywords: naamKeywords,
              geboortedatum: student.geboortedatum || null,
              geslacht: student.geslacht || null,
              rol: student.rol || 'leerling',           // Default rol
              school_id: student.school_id || null,
              klas: student.klas || null,
              is_active: true,
              created_at: new Date(),
              last_updated: new Date()
            };
          });

          // ---- FIREBASE LOGICA START ----
          const loadingToast = toast.loading('Bezig met importeren...');
          try {
            // Maak een batch aan voor meerdere schrijfacties
            const batch = writeBatch(db);

            processedStudents.forEach((student) => {
              // ✅ NIEUW: Document ID = smartschool_id_hash 
              const docRef = doc(db, 'toegestane_gebruikers', student.smartschool_id_hash);
          
              batch.set(docRef, student);
            });

            await batch.commit();

            toast.dismiss(loadingToast);
            toast.success(`${processedStudents.length} leerlingen succesvol geïmporteerd!`);
            
            onImportComplete();

          } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(`Fout bij importeren: ${error.message}`);
            console.error("❌ Fout bij importeren:", error);
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
        Upload een CSV-bestand met de kolommen (gescheiden door puntkomma's):<br/>
        <code className="bg-gray-100 px-2 py-1 rounded">smartschool_id;naam;geboortedatum;geslacht;rol;school_id;klas</code>
      </p>
      <p className="text-xs text-gray-400 mb-4">
        💡 <strong>smartschool_id</strong> en <strong>naam</strong> zijn verplicht. Andere velden zijn optioneel.
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