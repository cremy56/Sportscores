import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import StudentSearch from '../components/StudentSearch';
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
  
  // State for role-based functionality
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [availableGroups, setAvailableGroups] = useState([]);

  const isTeacher = profile?.rol === 'leerkracht';
  const isAdmin = ['administrator', 'super-administrator'].includes(profile?.rol);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const selectedGroupName = availableGroups.find(g => g.id === selectedGroup)?.originalName || '';



  // Load available groups for teachers
useEffect(() => {
  if (profile && (isTeacher || isAdmin)) {
    loadUserGroups();
  }
}, [profile, isTeacher, isAdmin]);

  // Load EHBO statistics based on user role
useEffect(() => {
    if (!profile?.school_id || !(isTeacher || isAdmin)) {
      return;
    }
    
    // Prioriteit 1: Een specifieke leerling is geselecteerd via de zoekbalk
    if (isAdmin && selectedStudent) {
      loadEHBOStats({ studentId: selectedStudent.id });
      return; // Stop hier
    }
    
    // Prioriteit 2: Een specifieke groep is geselecteerd
    if ((isTeacher || isAdmin) && selectedGroup !== 'all') {
      loadEHBOStats({ groupId: selectedGroup });
      return; // Stop hier
    }
    
    // Standaard geval: Geen selectie, dus wis de data
    setClassStats(null);
    setStudents([]);
    setLoading(false);
    
  }, [profile, selectedGroup, selectedStudent, isTeacher, isAdmin]);

  // Aangepaste functie die de groupId als argument accepteert
 const loadEHBOStats = async ({ groupId, studentId }) => {
    setLoading(true);
    setError(null);
    
    try {
      const getClassEHBOStats = httpsCallable(functions, 'getClassEHBOStats');
      
      const requestData = {
        schoolId: profile.school_id,
        classId: groupId,   // Wordt 'undefined' als niet meegegeven, wat ok is
        studentId: studentId // Wordt 'undefined' als niet meegegeven, wat ok is
      };
      
      const result = await getClassEHBOStats(requestData);
      
      if (result.data && result.data.success) {
        setClassStats(result.data.classStats);
        setStudents(result.data.students || []);
      } else {
        throw new Error(result.data?.error || 'Onbekende fout bij laden van statistieken');
      }
      
    } catch (error) {
      console.error('Error loading EHBO stats:', error);
      setError(`Fout bij laden: ${error.message || 'Onbekende fout'}`);
    } finally {
      setLoading(false);
    }
  };

const loadUserGroups = async () => {
  setGroupsLoading(true);
  
  try {
    console.log('Loading groups for user...');
    const getUserGroups = httpsCallable(functions, 'getUserGroups');
    const result = await getUserGroups();
    
    if (result.data.success) {
      const groups = result.data.groups;
      console.log('Loaded groups:', groups);
      
      // Prepare groups for dropdown
      const dropdownGroups = [
        { id: 'all', naam: 'Selecteer een groep...' }
      ];
      
      // Add user's groups
      groups.forEach(group => {
        let displayName = group.naam;
        
        // Add extra info for admins
        if (isAdmin && group.role === 'admin') {
          displayName += ` (${group.leerkracht_naam}) - ${group.leerling_count} leerlingen`;
        } else if (group.leerling_count) {
          displayName += ` - ${group.leerling_count} leerlingen`;
        }
        
        dropdownGroups.push({
          id: group.id,
          naam: displayName,
          originalName: group.naam,
          role: group.role,
          studentCount: group.leerling_count
        });
      });
      
      setAvailableGroups(dropdownGroups);
      
    } else {
      console.error('Failed to load groups:', result.data.error);
      // Fallback
      setAvailableGroups([
        { id: 'all', naam: 'Selecteer een groep...' },
        { id: 'error', naam: 'Fout bij laden groepen' }
      ]);
    }
    
  } catch (error) {
    console.error('Error loading groups:', error);
    setAvailableGroups([
      { id: 'all', naam: 'Selecteer een groep...' },
      { id: 'error', naam: 'Kan groepen niet laden' }
    ]);
  } finally {
    setGroupsLoading(false);
  }
};
  // EHBO Dashboard Component with role-based controls
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-blue-800 font-semibold">
                {error.includes('nog niet geregistreerd') ? 'Student niet geregistreerd' : 
                 error.includes('niet gevonden') ? 'Student niet gevonden' : 
                 'Informatie niet beschikbaar'}
              </h3>
              <p className="text-blue-700 mt-1">{error}</p>
              {error.includes('nog niet geregistreerd') && (
                <div className="mt-3 text-sm text-blue-600 bg-blue-100 rounded-md p-3">
                  <strong>Wat te doen:</strong> De student moet eerst inloggen op het platform. Na de eerste login worden de EHBO gegevens automatisch beschikbaar.
                </div>
              )}
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
    
            <div className={`p-3 rounded-lg ${
              (classStats?.studentsCompleted || 0) > 0 ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {(classStats?.studentsCompleted || 0) > 0 ? (
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              ) : (
                <AcademicCapIcon className="h-8 w-8 text-gray-500" />
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">EHBO Competent</p>
              <p className={`text-3xl font-bold ${
                (classStats?.studentsCompleted || 0) > 0 ? 'text-gray-900' : 'text-gray-500'
              }`}>{classStats?.studentsCompleted || 0}</p>
             {/* Toon de percentagelijn alleen als er daadwerkelijk competente leerlingen zijn */}
              {(classStats?.studentsCompleted || 0) > 0 && (
                <p className="text-sm text-gray-500">
                  {classStats?.totalStudents > 0 ? 
                    Math.round((classStats.studentsCompleted / classStats.totalStudents) * 100) : 0}%
                </p>
              )}
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
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedStudent ? `EHBO Voortgang - ${selectedStudent.naam}` : 
                selectedGroup !== 'all' ? `EHBO Voortgang - ${selectedGroupName}` :
                'EHBO Voortgang'}
              </h3>
              
            </div>
            {selectedGroup === 'all' && !selectedStudent && (
              <p className="text-sm text-gray-500 mt-2">
                Selecteer een groep of leerling om EHBO voortgang te bekijken
              </p>
            )}
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
                    <tr key={student.id} className={`hover:bg-gray-50 ${!student.isRegistered ? 'bg-orange-25' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student.name}
                          </div>
                      
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.isRegistered ? (
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-3">
                              <div
                                className="bg-red-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${student.progressPercentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{student.progressPercentage}%</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.isRegistered ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.averageScore >= 80 ? 'bg-green-100 text-green-800' :
                            student.averageScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {student.averageScore}%
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.isRegistered ? student.completedScenarios : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!student.isRegistered ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Niet geregistreerd
                          </span>
                        ) : student.certificationReady ? (
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
                        {student.isRegistered ? (
                          student.lastActivity ? 
                            new Date(student.lastActivity).toLocaleDateString('nl-NL') : 
                            'Nooit'
                        ) : (
                          'Moet nog registreren'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
        </div>

        {/* Rest of the existing cards (struggling students, top performers) */}
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

  // Welzijn Dashboard Component (placeholder)
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
      </div>
    </div>
  );

const handleStudentSelection = (student) => {
    setSelectedStudent(student);
    setSelectedGroup('all'); // Reset de groep-selectie
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header with Role-Based Controls */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="text-center lg:text-left lg:flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
              Welzijnsmonitor - {profile?.rol === 'administrator' || profile?.rol === 'super-administrator' ? 'School Dashboard' : 'Groep Dashboard'}
            </h1>
            <p className="text-slate-600">
              {isTeacher ? 'Overzicht van EHBO competenties voor uw groepen' : 
               isAdmin ? 'Overzicht van EHBO competenties en welzijn voor de hele school' :
               'Overzicht van EHBO competenties en welzijn statistieken'}
            </p>
          </div>
          
         {/* Role-Based Controls */}
          <div className="lg:flex-shrink-0 lg:w-[600px]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              
              {/* Everyone gets group selection if they are teacher or admin */}
                {(isTeacher || isAdmin) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Groep Selecteren
                      {groupsLoading && <span className="text-xs text-gray-500 ml-2">(Laden...)</span>}
                    </label>
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      disabled={groupsLoading}
                      className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-red-500 focus:ring-red-500 disabled:bg-gray-100"
                    >
                      {groupsLoading ? (
                        <option value="all">Groepen laden...</option>
                      ) : availableGroups.length > 0 ? (
                        availableGroups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.naam}
                          </option>
                        ))
                      ) : (
                        <option value="all">Geen groepen gevonden</option>
                      )}
                    </select>
                    
                    {/* Show group info */}
                    {selectedGroup !== 'all' && !groupsLoading && (
                      <div className="mt-1 text-xs text-gray-500">
                        {availableGroups.find(g => g.id === selectedGroup)?.studentCount 
                          ? `${availableGroups.find(g => g.id === selectedGroup)?.studentCount} leerlingen`
                          : 'Groep geselecteerd'}
                      </div>
                    )}
                  </div>
                )}
              
              {/* Admin: Student Search (optional, additional filter) */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Specifieke Leerling (Optioneel)
                  </label>
                  <StudentSearch 
                    onStudentSelect={handleStudentSelection}
                    schoolId={profile?.school_id}
                    initialStudent={selectedStudent}
                    placeholder="Extra filter op leerling"
                  />
                </div>
              )}
              
              {/* Clear Student Selection for Admins */}
              {isAdmin && selectedStudent && (
                <div className="flex items-end">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="w-full h-10 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                  >
                    Verwijder Leerling Filter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
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