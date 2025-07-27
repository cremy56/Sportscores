// src/pages/SchoolBeheer.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import SchoolLogoUploader from '../components/SchoolLogoUploader'; // Importeer de uploader

export default function SchoolBeheer() {
  // We gaan ervan uit dat de ingelogde beheerder een 'profile' heeft met een 'school_id'
  const { profile } = useOutletContext();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.school_id) {
      setLoading(false);
      return;
    }

    const fetchSchoolData = async () => {
      const schoolDocRef = doc(db, 'scholen', profile.school_id);
      const docSnap = await getDoc(schoolDocRef);

      if (docSnap.exists()) {
        setSchool({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.error("Geen school gevonden voor deze beheerder.");
      }
      setLoading(false);
    };

    fetchSchoolData();
  }, [profile?.school_id]);

  if (loading) {
    return <div>Schoolgegevens laden...</div>;
  }

  if (!school) {
    return <div>Geen schoolgegevens gevonden. Zorg ervoor dat de beheerder is gekoppeld aan een school.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Beheer voor: {school.naam}</h1>
      <p className="text-gray-600 mb-6">Hier kun je de gegevens van de school aanpassen.</p>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold">School Details</h2>
        <p>Naam: {school.naam}</p>
        <p>Stad: {school.stad}</p>
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Huidig Logo</h3>
          {school.logo_url ? (
            <img src={school.logo_url} alt={`${school.naam} logo`} className="h-24 w-auto mt-2 border p-2 rounded-md" />
          ) : (
            <p className="text-gray-500 mt-2">Geen logo ingesteld.</p>
          )}
        </div>

        {/* Hier gebruik je de uploader component */}
        <SchoolLogoUploader schoolId={school.id} />
      </div>
    </div>
  );
}
