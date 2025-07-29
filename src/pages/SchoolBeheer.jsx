// src/pages/SchoolBeheer.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import SchoolLogoUploader from '../components/SchoolLogoUploader';
import { DataConsistencyNotifications } from '../components/DataConsistencyNotifications';

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="text-lg font-medium text-gray-700">Schoolgegevens laden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 text-center">
          <p className="text-lg text-gray-700">
            Geen schoolgegevens gevonden. Zorg ervoor dat de beheerder is gekoppeld aan een school.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Data Consistency Notifications - bovenaan voor zichtbaarheid */}
        <DataConsistencyNotifications userRole={profile?.rol} />
        
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Beheer voor: {school.naam}</h1>
              <p className="text-sm text-gray-600">Hier kun je de gegevens van de school aanpassen.</p>
            </div>
          </div>
        </div>

        {/* School Details */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">School Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-600 mb-2"><span className="font-semibold">Naam:</span> {school.naam}</p>
              <p className="text-gray-600"><span className="font-semibold">Stad:</span> {school.stad}</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Huidig Logo</h3>
              {school.logo_url ? (
                <img 
                  src={school.logo_url} 
                  alt={`${school.naam} logo`} 
                  className="h-24 w-auto border-2 border-gray-200 p-2 rounded-lg bg-white" 
                />
              ) : (
                <div className="h-24 w-24 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Geen logo</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logo Uploader */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-6">
          <SchoolLogoUploader schoolId={school.id} />
        </div>
      </div>
    </div>
  );
}