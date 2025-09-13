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
const [welzijnStats, setWelzijnStats] = useState(null);


  // Load available groups for teachers
useEffect(() => {
  if (profile && (isTeacher || isAdmin)) {
    loadUserGroups();
  }
}, [profile, isTeacher, isAdmin]);

  // Load EHBO statistics based on user role
useEffect(() => {
  if (!profile?.school_id || !(isTeacher || isAdmin)) return;

  const params = {};
  let shouldLoad = false;

  if (isAdmin && selectedStudent) {
    params.studentId = selectedStudent.id;
    shouldLoad = true;
  } else if ((isTeacher || isAdmin) && selectedGroup !== 'all') {
    params.groupId = selectedGroup;
    shouldLoad = true;
  }

  if (shouldLoad) {
    if (activeTab === 'ehbo') {
      loadEHBOStats(params);
    } else if (activeTab === 'welzijn') {
      loadWelzijnStats(params);
    }
  } else {
    // Reset data als er geen selectie is
    setClassStats(null);
    setStudents([]);
    setWelzijnStats(null);
    setLoading(false);
  }
}, [profile, selectedGroup, selectedStudent, isTeacher, isAdmin, activeTab]);

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
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
        <span className="ml-3 text-gray-600">Laden...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-red-800 font-medium">{error.includes('nog niet geregistreerd') ? 'Student niet geregistreerd' : 'Fout bij laden'}</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!classStats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <AcademicCapIcon className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">EHBO Competenties</h3>
        <p className="text-gray-600">Selecteer een groep of leerling</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compacte header met statistieken in één rij */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">EHBO Competenties</h2>
            <p className="text-sm text-gray-600">
              {selectedStudent ? selectedStudent.naam : 
               selectedGroup !== 'all' ? selectedGroupName : 'Overzicht'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{classStats?.totalStudents || 0}</div>
            <div className="text-xs text-gray-500">Leerlingen</div>
          </div>
        </div>
        
        {/* Compacte statistieken in één rij */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-700">{classStats?.studentsCompleted || 0}</div>
            <div className="text-xs text-green-600">Competent</div>
            {classStats?.totalStudents > 0 && (
              <div className="text-xs text-gray-500">
                {Math.round((classStats.studentsCompleted / classStats.totalStudents) * 100)}%
              </div>
            )}
          </div>
          
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-xl font-bold text-amber-700">{classStats?.averageScore || 0}%</div>
            <div className="text-xs text-amber-600">Gem. Score</div>
          </div>
          
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-xl font-bold text-orange-700">{classStats?.strugglingStudents?.length || 0}</div>
            <div className="text-xs text-orange-600">Hulp Nodig</div>
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Student Voortgang</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Leerling</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Voortgang</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Scenario's</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Laatst Actief</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-medium text-sm">
                        {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {student.isRegistered ? (
                      <div className="flex items-center">
                        <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: `${student.progressPercentage}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-700">{student.progressPercentage}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {student.isRegistered ? (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        student.averageScore >= 80 ? 'bg-green-100 text-green-800' :
                        student.averageScore >= 60 ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.averageScore}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {student.isRegistered ? student.completedScenarios : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {!student.isRegistered ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Niet geregistreerd
                      </span>
                    ) : student.certificationReady ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        Competent
                      </span>
                    ) : student.progressPercentage > 50 ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        Bezig
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Niet gestart
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                    {student.isRegistered ? (
                      student.lastActivity ? 
                        new Date(student.lastActivity).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }) : 
                        'Nooit'
                    ) : (
                      'Registreren'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compacte insights onderaan (alleen tonen als er data is) */}
      {(classStats?.topPerformers?.length > 0 || classStats?.strugglingStudents?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {classStats?.topPerformers?.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2 flex items-center">
                <TrophyIcon className="h-4 w-4 mr-2" />
                Top Presteerders
              </h3>
              <div className="space-y-2">
                {classStats.topPerformers.slice(0, 2).map((student, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-green-900">{student.name}</span>
                    <span className="text-green-600">{student.averageScore}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {classStats?.strugglingStudents?.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-medium text-orange-800 mb-2 flex items-center">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                Extra Hulp Nodig
              </h3>
              <div className="space-y-2">
                {classStats.strugglingStudents.slice(0, 2).map((student, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-orange-900">{student.name}</span>
                    <span className="text-orange-600 text-xs">{student.issue === 'low_scores' ? 'Lage scores' : 'Inactief'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
   



// Verbeterd Welzijn Dashboard Component met subtielere kleuren
const WelzijnDashboard = () => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Laden...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-red-800 font-medium">Fout bij laden welzijn data</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!welzijnStats || !welzijnStats.groupStats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <HeartIcon className="h-12 w-12 text-blue-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Welzijn & Gezondheid</h3>
        <p className="text-gray-600">Selecteer een groep of leerling</p>
      </div>
    );
  }

  const { groupStats, studentData } = welzijnStats;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-700 bg-green-50 border-green-200';
    if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Compacte header met statistieken */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Welzijn & Gezondheid</h2>
            <p className="text-sm text-gray-600">
              {selectedStudent ? selectedStudent.naam : 
               selectedGroup !== 'all' ? selectedGroupName : 'Overzicht'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{(groupStats?.totalStudents || 0)}</div>
            <div className="text-xs text-gray-500">Leerlingen</div>
          </div>
        </div>

        {/* Compacte statistieken in één rij */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-700">{(groupStats?.avgScore || 0)}%</div>
            <div className="text-xs text-blue-600">Welzijn</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-700">{(groupStats?.activeParticipation || 0)}%</div>
            <div className="text-xs text-green-600">Actief (7d)</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-lg font-bold text-purple-700">{(groupStats?.avgSleep || 0)}u</div>
            <div className="text-xs text-purple-600">Slaap</div>
          </div>
          
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-lg font-bold text-emerald-700">{((groupStats?.avgSteps || 0) / 1000).toFixed(0)}k</div>
            <div className="text-xs text-emerald-600">Stappen</div>
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Individuele Prestaties</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Leerling</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Slaap</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stappen</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">7d</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">30d</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {studentData.map((student, index) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm">
                        {student.naam.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{student.naam}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getScoreColor(student.avgScore)}`}>
                      {student.avgScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{(student.avgSleep || 0)}u</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{((student.avgSteps || 0) / 1000).toFixed(0)}k</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      student.logs.last7days >= 5 ? 'bg-green-100 text-green-800' :
                      student.logs.last7days >= 3 ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {student.logs.last7days}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      student.logs.last30days >= 20 ? 'bg-green-100 text-green-800' :
                      student.logs.last30days >= 15 ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {student.logs.last30days}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compacte insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-800 mb-2 flex items-center">
            <TrophyIcon className="h-4 w-4 mr-2" />
            Positieve Prestaties
          </h3>
          <div className="space-y-2">
            {studentData.filter(s => s.avgScore >= 80 || s.logs.last7days >= 5).slice(0, 3).map((student, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-green-900">{student.naam}</span>
                <span className="text-green-600 text-xs">
                  {student.avgScore >= 80 ? `${student.avgScore}%` : `${student.logs.last7days}/7`}
                </span>
              </div>
            ))}
            {studentData.filter(s => s.avgScore >= 80 || s.logs.last7days >= 5).length === 0 && (
              <p className="text-green-700 italic text-sm">Geen uitblinkers</p>
            )}
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-medium text-orange-800 mb-2 flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
            Aandachtspunten
          </h3>
          <div className="space-y-2">
            {studentData.filter(s => s.avgScore < 60 || s.logs.last7days < 3).slice(0, 3).map((student, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-orange-900">{student.naam}</span>
                <span className="text-orange-600 text-xs">
                  {student.avgScore < 60 ? `${student.avgScore}%` : `${student.logs.last7days}/7`}
                </span>
              </div>
            ))}
            {studentData.filter(s => s.avgScore < 60 || s.logs.last7days < 3).length === 0 && (
              <p className="text-orange-700 italic text-sm">Geen aandachtspunten</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const handleStudentSelection = (student) => {
    setSelectedStudent(student);
    setSelectedGroup('all'); // Reset de groep-selectie
  };
const handleGroupSelection = (groupId) => {
    setSelectedGroup(groupId);
    setSelectedStudent(null); // BELANGRIJK: Reset de leerling-selectie
  };
const loadWelzijnStats = async ({ groupId, studentId }) => {
  setLoading(true);
  setError(null);
  try {
    const getStats = httpsCallable(functions, 'getClassWelzijnStats');
    
    // DEBUG: Log wat we versturen
    console.log('📤 SENDING TO BACKEND:', {
      schoolId: profile.school_id,
      classId: groupId,
      studentId: studentId,
    });
    
    const result = await getStats({
      schoolId: profile.school_id,
      classId: groupId,
      studentId: selectedStudent?.email || selectedStudent?.id,  // ← Dit wordt waarschijnlijk niet goed verwerkt in de backend
    });
    
    console.log('🔍 WELZIJN RESPONSE:', JSON.stringify(result.data, null, 2));
    
    if (result.data.success) {
      setWelzijnStats(result.data);
    } else {
      throw new Error(result.data.error);
    }
  } catch (error) {
    console.error('Error loading welzijn stats:', error);
    setError(error.message);
  } finally {
    setLoading(false);
  }
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
                      onChange={(e) => handleGroupSelection(e.target.value)}
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