import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
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

// ─── API helper ───────────────────────────────────────────────────────────────
async function apiPost(action, body, token) {
  const response = await fetch('/api/tests', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'API fout');
  return data;
}

const Welzijnsmonitor = () => {
  const { profile, school } = useOutletContext();
  const [activeTab, setActiveTab] = useState('ehbo');
  const [classStats, setClassStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [availableGroups, setAvailableGroups] = useState([]);

  const isTeacher = profile?.rol === 'leerkracht';
  const isAdmin = ['administrator', 'super-administrator'].includes(profile?.rol);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const selectedGroupName = availableGroups.find(g => g.id === selectedGroup)?.originalName || '';
  const [welzijnStats, setWelzijnStats] = useState(null);

  // Load available groups for teachers/admins
  useEffect(() => {
    if (profile && (isTeacher || isAdmin)) {
      loadUserGroups();
    }
  }, [profile, isTeacher, isAdmin]);

  // Load stats based on tab, group, student selection
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
      setClassStats(null);
      setStudents([]);
      setWelzijnStats(null);
      setLoading(false);
    }
  }, [profile, selectedGroup, selectedStudent, isTeacher, isAdmin, activeTab]);

  // ── was: httpsCallable(functions, 'getClassEHBOStats') ──────────────────────
  const loadEHBOStats = async ({ groupId, studentId }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiPost('get_ehbo_stats', {
        schoolId: profile.school_id,
        classId: groupId,
        studentId: studentId,
      }, profile._token);

      if (result.success) {
        setClassStats(result.classStats);
        setStudents(result.students || []);
      } else {
        throw new Error(result.error || 'Onbekende fout bij laden van statistieken');
      }
    } catch (err) {
      console.error('Error loading EHBO stats:', err);
      setError(`Fout bij laden: ${err.message || 'Onbekende fout'}`);
    } finally {
      setLoading(false);
    }
  };

  // ── was: httpsCallable(functions, 'getUserGroups') ───────────────────────────
  const loadUserGroups = async () => {
    setGroupsLoading(true);
    try {
      const result = await apiPost('get_groepen', {
        schoolId: profile.school_id,
      }, profile._token);

      const groepen = result.groepen || [];

      const dropdownGroups = [
        { id: 'all', naam: 'Selecteer een groep...' },
        ...groepen.map(group => {
          const count = group.leerling_ids?.length ?? group.leerling_count ?? 0;
          let displayName = group.naam;

          if (isAdmin) {
            displayName += ` (${group.leerkracht_id}) - ${count} lln`;
          } else if (count) {
            displayName += ` - ${count} lln`;
          }

          return {
            id: group.id,
            naam: displayName,
            originalName: group.naam,
            role: isAdmin ? 'admin' : 'teacher',
            studentCount: count,
          };
        }),
      ];

      setAvailableGroups(dropdownGroups);
    } catch (err) {
      console.error('Error loading groups:', err);
      setAvailableGroups([
        { id: 'all', naam: 'Selecteer een groep...' },
        { id: 'error', naam: 'Kan groepen niet laden' },
      ]);
    } finally {
      setGroupsLoading(false);
    }
  };

  // ── was: httpsCallable(functions, 'getClassWelzijnStats') ────────────────────
  const loadWelzijnStats = async ({ groupId, studentId }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiPost('get_welzijn_stats', {
        schoolId: profile.school_id,
        classId: groupId,
        studentId: selectedStudent?.id,
      }, profile._token);

      if (result.success) {
        setWelzijnStats(result);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Error loading welzijn stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── EHBO Dashboard ──────────────────────────────────────────────────────────
  const EHBODashboard = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          <span className="ml-3 text-gray-600">Laden van EHBO statistieken...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-red-800 font-semibold">
                {error.includes('nog niet geregistreerd') ? 'Student niet geregistreerd' : 
                 error.includes('niet gevonden') ? 'Student niet gevonden' : 
                 'Informatie niet beschikbaar'}
              </h3>
              <p className="text-red-700 mt-1">{error}</p>
              {error.includes('nog niet geregistreerd') && (
                <div className="mt-3 text-sm text-red-600 bg-red-100 rounded-md p-3">
                  <strong>Wat te doen:</strong> De student moet eerst inloggen op het platform. Na de eerste login worden de EHBO gegevens automatisch beschikbaar.
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (!classStats) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <AcademicCapIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">EHBO Competenties Overzicht</h3>
          <p className="text-gray-600">Selecteer een groep of leerling om EHBO voortgang te bekijken</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">EHBO Competenties Overzicht</h2>
              <p className="text-gray-600">
                {selectedStudent ? `Individuele voortgang - ${selectedStudent.naam}` : 
                 selectedGroup !== 'all' ? `Groepsvoortgang - ${selectedGroupName}` :
                 'EHBO competenties'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{classStats?.totalStudents || 0}</p>
              <p className="text-gray-500">Leerlingen</p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-lg">
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
              <div className={`p-3 rounded-lg ${(classStats?.studentsCompleted || 0) > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                {(classStats?.studentsCompleted || 0) > 0 ? (
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                ) : (
                  <AcademicCapIcon className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">EHBO Competent</p>
                <p className={`text-3xl font-bold ${(classStats?.studentsCompleted || 0) > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                  {classStats?.studentsCompleted || 0}
                </p>
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
              <div className="p-3 bg-amber-50 rounded-lg">
                <ChartBarIcon className="h-8 w-8 text-amber-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gemiddelde Score</p>
                <p className="text-3xl font-bold text-gray-900">{classStats?.averageScore || 0}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-50 rounded-lg">
                <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
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
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedStudent ? `EHBO Voortgang - ${selectedStudent.naam}` : 
               selectedGroup !== 'all' ? `EHBO Voortgang - ${selectedGroupName}` :
               'EHBO Voortgang'}
            </h3>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leerling</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voortgang</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gemiddelde Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scenario's</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Laatste Activiteit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className={`hover:bg-gray-50 ${!student.isRegistered ? 'bg-orange-25' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-semibold">
                          {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.isRegistered ? (
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-3">
                            <div
                              className="bg-red-500 h-2.5 rounded-full transition-all duration-300"
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
                          student.averageScore >= 60 ? 'bg-amber-100 text-amber-800' :
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
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
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
                        'Nog geen activiteit waargenomen'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {classStats?.topPerformers?.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <TrophyIcon className="h-6 w-6 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold text-green-800">Top Presteerders</h3>
              </div>
              <div className="space-y-3">
                {classStats.topPerformers.slice(0, 3).map((student, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-gray-900">{student.name}</div>
                      <div className="text-right">
                        <div className="text-green-600 font-medium">{student.averageScore}% gemiddeld</div>
                        <div className="text-sm text-gray-500">{student.completedScenarios} scenario's</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {classStats?.strugglingStudents?.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-semibold text-orange-800">Leerlingen die Extra Hulp Nodig Hebben</h3>
              </div>
              <div className="space-y-3">
                {classStats.strugglingStudents.map((student, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">{student.name}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          ({student.issue === 'low_scores' ? 'Lage scores' : 'Inactief'})
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">{student.recommendation}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Welzijn Dashboard ────────────────────────────────────────────────────────
  const WelzijnDashboard = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Laden van welzijn statistieken...</span>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-red-800 font-semibold">Fout bij laden welzijn data</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      );
    }
    
    if (!welzijnStats || !welzijnStats.groupStats) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <HeartIcon className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Welzijn & Gezondheid Overzicht</h3>
          <p className="text-gray-600">Selecteer een groep of leerling om welzijn statistieken te bekijken</p>
        </div>
      );
    }

    const { groupStats, studentData } = welzijnStats;

    const getScoreColor = (score) => {
      if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      if (score >= 70) return 'text-green-700 bg-green-50 border-green-200';
      if (score >= 55) return 'text-amber-700 bg-amber-50 border-amber-200';
      if (score >= 40) return 'text-orange-700 bg-orange-50 border-orange-200';
      return 'text-red-700 bg-red-50 border-red-200';
    };

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welzijn & Gezondheid Overzicht</h2>
              <p className="text-gray-600">
                {selectedStudent ? `Individuele analyse - ${selectedStudent.naam}` : 
                 selectedGroup !== 'all' ? `Groepsanalyse - ${selectedGroupName}` :
                 'Welzijn statistieken'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{groupStats.totalStudents}</p>
              <p className="text-gray-500">Leerlingen</p>
            </div>
          </div>
        </div>

        {/* Statistieken */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gem. Welzijnsscore</p>
                <p className="text-3xl font-bold text-gray-900">{groupStats.avgScore}%</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${groupStats.avgScore}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <UserGroupIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Actieve Deelname (7d)</p>
                <p className="text-3xl font-bold text-gray-900">{groupStats.activeParticipation}%</p>
                <p className="text-sm text-gray-500 mt-1">
                  {Math.round((groupStats.activeParticipation / 100) * groupStats.totalStudents)} van {groupStats.totalStudents} actief
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-50 rounded-lg">
                <ClockIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gem. Slaap (30d)</p>
                <p className="text-3xl font-bold text-gray-900">{groupStats.avgSleep}u</p>
                <p className="text-sm text-gray-500 mt-1">
                  {groupStats.avgSleep >= 8 ? 'Uitstekend' : groupStats.avgSleep >= 7 ? 'Goed' : groupStats.avgSleep >= 6 ? 'Voldoende' : 'Te weinig'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gem. Stappen (30d)</p>
                <p className="text-3xl font-bold text-gray-900">{groupStats.avgSteps.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {groupStats.avgSteps >= 10000 ? 'Uitstekend' : groupStats.avgSteps >= 7500 ? 'Goed' : groupStats.avgSteps >= 5000 ? 'Voldoende' : 'Te weinig'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Log Activiteit */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Log Activiteit & Betrokkenheid</h3>
            <p className="text-gray-600">Hoe actief zijn leerlingen met het bijhouden van hun welzijn?</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-orange-50 rounded-lg border border-orange-200">
                <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold">{Math.round(groupStats.avgLogs7Days * 7)}</span>
                </div>
                <p className="text-lg font-semibold text-orange-700">Logs per week</p>
                <p className="text-sm text-orange-600">(gemiddeld)</p>
              </div>
              <div className="text-center p-6 bg-amber-50 rounded-lg border border-amber-200">
                <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold">{groupStats.avgLogs7Days}</span>
                </div>
                <p className="text-lg font-semibold text-amber-700">Logs per dag</p>
                <p className="text-sm text-amber-600">(laatste 7 dagen)</p>
              </div>
              <div className="text-center p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="w-16 h-16 bg-yellow-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold">{groupStats.avgLogs30Days}</span>
                </div>
                <p className="text-lg font-semibold text-yellow-700">Logs per dag</p>
                <p className="text-sm text-yellow-600">(laatste 30 dagen)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Individuele leerlingen tabel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Individuele Prestaties</h3>
            <p className="text-gray-600">Gedetailleerd overzicht per leerling (laatste 30 dagen)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leerling</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Welzijnsscore</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slaap (gem.)</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stappen (gem.)</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activiteit (7d)</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend (30d)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentData.map((student, index) => (
                  <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                          {student.naam.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.naam}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getScoreColor(student.avgScore)}`}>
                        {student.avgScore}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        (student.avgSleep || 0) >= 8 ? 'text-green-600' :
                        (student.avgSleep || 0) >= 7 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {(student.avgSleep || 0)}u
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        student.avgSteps >= 10000 ? 'text-green-600' :
                        student.avgSteps >= 7500 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {student.avgSteps.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                          student.logs.last7days >= 5 ? 'bg-green-100 text-green-800' :
                          student.logs.last7days >= 3 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {student.logs.last7days}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">/ 7</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                          student.logs.last30days >= 20 ? 'bg-green-100 text-green-800' :
                          student.logs.last30days >= 15 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {student.logs.last30days}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">/ 30</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <TrophyIcon className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-green-800">Positieve Prestaties</h3>
            </div>
            <div className="space-y-3">
              {studentData.filter(s => s.avgScore >= 80 || s.logs.last7days >= 5).slice(0, 3).map((student, index) => (
                <div key={index} className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-900">{student.naam}</span>
                    <span className="text-sm text-green-600">
                      {student.avgScore >= 80 ? `${student.avgScore}% welzijn` : `${student.logs.last7days}/7 logs`}
                    </span>
                  </div>
                </div>
              ))}
              {studentData.filter(s => s.avgScore >= 80 || s.logs.last7days >= 5).length === 0 && (
                <p className="text-green-700 italic">Geen uitblinkers deze periode</p>
              )}
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-3" />
              <h3 className="text-lg font-semibold text-orange-800">Aandachtspunten</h3>
            </div>
            <div className="space-y-3">
              {studentData.filter(s => s.avgScore < 60 || s.logs.last7days < 3).slice(0, 3).map((student, index) => (
                <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-orange-900">{student.naam}</span>
                    <span className="text-sm text-orange-600">
                      {student.avgScore < 60 ? `${student.avgScore}% welzijn` : `${student.logs.last7days}/7 logs`}
                    </span>
                  </div>
                </div>
              ))}
              {studentData.filter(s => s.avgScore < 60 || s.logs.last7days < 3).length === 0 && (
                <p className="text-orange-700 italic">Geen aandachtspunten deze periode</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleStudentSelection = (student) => {
    setSelectedStudent(student);
    setSelectedGroup('all');
  };

  const handleGroupSelection = (groupId) => {
    setSelectedGroup(groupId);
    setSelectedStudent(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-50 overflow-y-auto pt-20">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Welzijnsmonitor</h1>
              <p className="text-slate-600">
                {isTeacher ? 'Overzicht van EHBO competenties voor uw groepen' : 
                 isAdmin ? 'Overzicht van EHBO competenties en welzijn voor de hele school' :
                 'Overzicht van EHBO competenties en welzijn statistieken'}
              </p>
            </div>

            <div className="lg:flex-shrink-0 lg:w-[600px]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
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
                          <option key={group.id} value={group.id}>{group.naam}</option>
                        ))
                      ) : (
                        <option value="all">Geen groepen gevonden</option>
                      )}
                    </select>
                  </div>
                )}

                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Specifieke Leerling (Optioneel)
                    </label>
                    <StudentSearch 
                      onStudentSelect={handleStudentSelection}
                      schoolId={profile?.school_id}
                      token={profile?._token} 
                      initialStudent={selectedStudent}
                      placeholder="Extra filter op leerling"
                    />
                  </div>
                )}

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

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white rounded-xl p-2 shadow-sm border border-gray-200">
          <button
            onClick={() => setActiveTab('ehbo')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'ehbo' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <AcademicCapIcon className="w-5 h-5" />
            EHBO Competenties
          </button>
          <button
            onClick={() => setActiveTab('welzijn')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'welzijn' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <HeartIcon className="w-5 h-5" />
            Welzijn & Gezondheid
          </button>
        </div>

        {activeTab === 'ehbo' && <EHBODashboard />}
        {activeTab === 'welzijn' && <WelzijnDashboard />}
      </div>
    </div>
  );
};

export default Welzijnsmonitor;