// src/components/SchoolLogoUploader.jsx
import { useState } from 'react';
import { db, storage } from '../firebase'; // Zorg ervoor dat 'storage' correct is geëxporteerd in je firebase.js
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Deze component heeft de ID van de school nodig om te weten welk document het moet bijwerken.
export default function SchoolLogoUploader({ schoolId }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Controleer of het bestand een afbeelding is
    if (!file.type.startsWith('image/')) {
        toast.error('Selecteer alstublieft een afbeeldingsbestand.');
        return;
    }

    uploadLogo(file);
  };

  const uploadLogo = (file) => {
    setUploading(true);
    setError(null);
    setProgress(0);

    // Maak een unieke referentie aan in Firebase Storage.
    // Bijvoorbeeld: 'school_logos/school_abc_123/logo.png'
    const storageRef = ref(storage, `school_logos/${schoolId}/${file.name}`);
    
    // Start de upload
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Luister naar statuswijzigingen, fouten en de voltooiing van de upload.
    uploadTask.on('state_changed', 
      (snapshot) => {
        // Volg de voortgang van de upload
        const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(currentProgress));
      }, 
      (error) => {
        // Handel fouten tijdens de upload af
        console.error("Uploadfout:", error);
        setError("Er is een fout opgetreden bij het uploaden van het logo.");
        setUploading(false);
        toast.error("Upload mislukt.");
      }, 
      () => {
        // Upload voltooid, haal de download URL op
        getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
          try {
            // Update het schooldocument in Firestore met de nieuwe logo URL
            const schoolDocRef = doc(db, 'scholen', schoolId);
            await updateDoc(schoolDocRef, {
              logo_url: downloadURL
            });

            toast.success('Logo succesvol geüpload en opgeslagen!');
            setUploading(false);
          } catch (firestoreError) {
            console.error("Fout bij bijwerken Firestore:", firestoreError);
            setError("Kon de logo URL niet opslaan in de database.");
            setUploading(false);
            toast.error("Opslaan van logo-referentie mislukt.");
          }
        });
      }
    );
  };

  return (
    <div className="p-4 border-t mt-6">
      <h3 className="text-lg font-semibold mb-2">Schoollogo Uploaden</h3>
      <p className="text-sm text-gray-500 mb-4">
        Kies een logo voor de school. Dit wordt getoond op de highscore-pagina.
      </p>
      
      <input
        type="file"
        accept="image/*" // Accepteer alleen afbeeldingsbestanden
        onChange={handleFileChange}
        disabled={uploading}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
      />

      {uploading && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700">Uploaden: {progress}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
            <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
