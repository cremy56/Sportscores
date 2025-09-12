import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { 
  AcademicCapIcon, 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  TrophyIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

const Welzijnsmonitor = () => {
  const { profile } = useOutletContext();
  const [activeTab, setActiveTab] = useState('ehbo');
  const [classStats, setClassStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load EHBO class statistics
  useEffect(() => {
    if (profile?.school_id && ['leerkracht', 'administrator'].includes(profile.rol)) {
      loadEHBOStats();
    }
  }, [profile]);
useEffect(() => {
  let retryCount = 0;
  const maxRetries = 3;
  
  const loadWithRetry = async () => {
    if (!profile?.school_id || !['leerkracht', 'administrator'].includes(profile.rol)) {
      setLoading(false);
      return;
    }
    
    try {
      await loadEHBOStats();
    } catch (error) {
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying EHBO stats load (attempt ${retryCount}/${maxRetries})`);
        setTimeout(loadWithRetry, 2000 * retryCount); // Exponential backoff
      }
    }
  };
  
  loadWithRetry();
}, [profile]);

 const loadEHBOStats = async () => {
  setLoading(true);
  setError(null); // Clear any previous errors
  
  // Set up timeout
  const timeoutId = setTimeout(() => {
    setLoading(false);
    setError('Het laden van de gegevens duurt te lang. Probeer het later opnieuw.');
    console.error('EHBO stats loading timeout after 30 seconds');
  }, 30000); // 30 second timeout
  
  try {
    console.log('Starting EHBO stats load for school:', profile.school_id);
    
    const getClassEHBOStats = httpsCallable(functions, 'getClassEHBOStats');
    
    // Add timeout to the Firebase call itself
    const result = await Promise.race([
      getClassEHBOStats({
        schoolId: profile.school_id,
        classId: profile.klas || 'all'
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firebase function timeout')), 25000)
      )
    ]);
    
    // Clear timeout since we got a response
    clearTimeout(timeoutId);
    
    console.log('EHBO stats result:', result.data);
    
    if (result.data && result.data.success) {
      setClassStats(result.data.classStats);
      setStudents(result.data.students || []);
      console.log('Successfully loaded EHBO stats');
    } else {
      throw new Error(result.data?.error || 'Onbekende fout bij laden van statistieken');
    }
    
  } catch (error) {
    console.error('Error loading EHBO stats:', error);
    clearTimeout(timeoutId);
    
    // Set specific error messages based on error type
    if (error.code === 'functions/unauthenticated') {
      setError('U bent niet geautoriseerd. Log opnieuw in.');
    } else if (error.code === 'functions/permission-denied') {
      setError('Geen toegang tot deze gegevens. Controleer uw rechten.');
    } else if (error.code === 'functions/not-found') {
      setError('De functie kon niet worden gevonden. Contacteer de administrator.');
    } else if (error.message.includes('timeout')) {
      setError('De verbinding is verlopen. Controleer uw internetverbinding en probeer opnieuw.');
    } else {
      setError(`Fout bij laden: ${error.message || 'Onbekende fout'}`);
    }
    
  } finally {
    setLoading(false);
  }
};
const debugLoadEHBO = async () => {
  console.log('=== DEBUG EHBO LOAD ===');
  console.log('Profile:', profile);
  console.log('School ID:', profile?.school_id);
  console.log('Role:', profile?.rol);
  console.log('Class:', profile?.klas);
  
  try {
    // Test if functions are available
    console.log('Functions object:', functions);
    
    // Try a simple function call first
    const testFunction = httpsCallable(functions, 'getClassEHBOStats');
    console.log('Function callable created');
    
    const result = await testFunction({
      schoolId: profile.school_id,
      classId: 'all'
    });
    
    console.log('Function result:', result);
    
  } catch (error) {
    console.error('Debug error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
};

// Add this button temporarily to your JSX for debugging:
<button
  onClick={debugLoadEHBO}
  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
>
  Debug EHBO Load
</button>
  // EHBO Dashboard Component
  const EHBODashboard = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <span className="ml-3 text-gray-600">Laden van EHBO statistieken...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <h3 className="text-red-800 font-semibold">Fout bij laden</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <UserGroupIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Totaal Leerlingen</p>
                <p className="text-3xl font-bold text-gray-900">{classStats?.totalStudents || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">EHBO Competent</p>
                <p className="text-3xl font-bold text-gray-900">{classStats?.studentsCompleted || 0}</p>
                <p className="text-sm text-gray-500">
                  {classStats?.totalStudents > 0 ? 
                    Math.round((classStats.studentsCompleted / classStats.totalStudents) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <ChartBarIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gemiddelde Score</p>
                <p className="text-3xl font-bold text-gray-900">{classStats?.averageScore || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hulp Nodig</p>
                <p className="text-3xl font-bold text-gray-900">{classStats?.strugglingStudents?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Student Progress Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">EHBO Voortgang per Leerling</h3>
              <button
                onClick={loadEHBOStats}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Vernieuwen
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leerling
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Voortgang
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gemiddelde Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scenario's
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Laatste Activiteit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-3">
                          <div
                            className="bg-red-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${student.progressPercentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{student.progressPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.averageScore >= 80 ? 'bg-green-100 text-green-800' :
                        student.averageScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.averageScore}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.completedScenarios}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.certificationReady ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="w-4 h-4 mr-1" />
                          Competent
                        </span>
                      ) : student.progressPercentage > 50 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          Bezig
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Niet gestart
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.lastActivity ? 
                        new Date(student.lastActivity).toLocaleDateString('nl-NL') : 
                        'Nooit'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Struggling Students Alert */}
        {classStats?.strugglingStudents?.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-3" />
              <h3 className="text-lg font-semibold text-orange-800">Leerlingen die Extra Hulp Nodig Hebben</h3>
            </div>
            <div className="space-y-3">
              {classStats.strugglingStudents.map((student, index) => (
                <div key={index} className="bg-white rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{student.name}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({student.issue === 'low_scores' ? 'Lage scores' : 'Inactief'})
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Aanbeveling: {student.recommendation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Performers */}
        {classStats?.topPerformers?.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <TrophyIcon className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-green-800">Top Presteerders</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {classStats.topPerformers.slice(0, 6).map((student, index) => (
                <div key={index} className="bg-white rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{student.name}</div>
                    <div className="text-green-600 font-medium">{student.averageScore}% gemiddeld</div>
                    <div className="text-sm text-gray-500">{student.completedScenarios} scenario's</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Welzijn Dashboard Component (placeholder for existing functionality)
  const WelzijnDashboard = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <HeartIcon className="h-6 w-6 text-blue-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Welzijn & Gezondheid Statistieken</h3>
        </div>
        <p className="text-gray-600 mb-4">
          Hier komen de welzijn statistieken zoals BMI, vetpercentage, en andere gezondheidsmetrieken.
        </p>
        
        {/* Placeholder for welzijn charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center">
            <p className="text-gray-500">BMI Verdeling Chart</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center">
            <p className="text-gray-500">Vetpercentage Trends</p>
          </div>
        </div>

        {/* Data Input Form */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-3">Aanvullende Gezondheidsmeting Invoeren</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leerling</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option>Selecteer leerling...</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vetpercentage (%)</label>
              <input type="number" step="0.1" className="w-full border border-gray-300 rounded-md px-3 py-2" />
            </div>
            <div className="flex items-end">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
                Opslaan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
          Welzijnsmonitor - {profile?.rol === 'administrator' ? 'School Dashboard' : 'Klas Dashboard'}
        </h1>
        <p className="text-slate-600">
          Overzicht van EHBO competenties en welzijn statistieken voor {profile?.rol === 'administrator' ? 'de hele school' : 'uw klas'}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-8 bg-white rounded-xl p-2 shadow-sm border border-gray-200">
        <button
          onClick={() => setActiveTab('ehbo')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'ehbo' 
              ? 'bg-red-600 text-white' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AcademicCapIcon className="w-5 h-5" />
          EHBO Competenties
        </button>
        <button
          onClick={() => setActiveTab('welzijn')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'welzijn' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HeartIcon className="w-5 h-5" />
          Welzijn & Gezondheid
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'ehbo' && <EHBODashboard />}
      {activeTab === 'welzijn' && <WelzijnDashboard />}
    </div>
  );
};

export default Welzijnsmonitor;