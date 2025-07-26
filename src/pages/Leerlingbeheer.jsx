import { useState, useCallback, useRef } from 'react';
import AddStudentForm from '../components/AddStudentForm';
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { db } from '../firebase';

export default function Leerlingbeheer() {
  const [formKey, setFormKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  const handleDataChanged = useCallback(() => {
    console.log("Data is gewijzigd, verversen kan hier geïmplementeerd worden.");
  }, []);

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

          const promise = supabase.rpc('bulk_add_student_profiles', {
            students: results.data
          });

          toast.promise(promise, {
            loading: 'Bezig met importeren...',
            success: (response) => {
              if (response.error) throw new Error(response.error.message);
              handleDataChanged();
              return 'Leerlingen succesvol geïmporteerd!';
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

  const triggerFileInput = () => {
    if (!loading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/60 p-6 rounded-2xl shadow-xl border border-white/30 backdrop-blur-lg">

        {/* Titel + importknop */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Leerlingbeheer</h1>
          <button
            onClick={triggerFileInput}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded transition disabled:opacity-50"
            disabled={loading}
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Importeer leerlingen
          </button>
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            disabled={loading}
          />
        </div>

        <div className="mb-4">
          <AddStudentForm onStudentAdded={handleDataChanged} />
        </div>
        
      </div>
    </div>
  );
}
