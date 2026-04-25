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

// ─── EHBODashboard — BUITEN parent zodat React geen remount-loop maakt ────────
function EHBODashboard({ loading, error, classStats, students, selectedStudent, selectedGroup, selectedGroupName }) {
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
          <svg className="h-8 w-8 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-3">
            <h3 className="text-red-800 font-semibold">Informatie niet beschikbaar</h3>
            <p className="text-red-700 mt-1">{error}</p>
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">EHBO Competenties Overzicht</h2>
            <p className="text-gray-600">
              {selectedStudent ? `Individuele voortgang - ${selectedStudent.naam}` :
               selectedGroup !== 'all' ? `Groepsvoortgang - ${selectedGroupName}` : 'EHBO competenties'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">{classStats.totalStudents || 0}</p>
            <p className="text-gray-500">Leerlingen</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: <UserGroupIcon className="h-8 w-8 text-blue-600" />, bg: 'bg-blue-50', label: 'Totaal Leerlingen', value: classStats.totalStudents || 0 },
          { icon: <CheckCircleIcon className="h-8 w-8 text-green-600" />, bg: 'bg-green-50', label: 'EHBO Competent', value: classStats.studentsCompleted || 0 },
          { icon: <ChartBarIcon className="h-8 w-8 text-amber-600" />, bg: 'bg-amber-50', label: 'Gemiddelde Score', value: `${classStats.averageScore || 0}%` },
          { icon: <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />, bg: 'bg-orange-50', label: 'Hulp Nodig', value: classStats.strugglingStudents?.length || 0 },
        ].map(({ icon, bg, label, value }, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`p-3 ${bg} rounded-lg`}>{icon}</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{label}</p>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">EHBO Voortgang per Leerling</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Leerling', 'Voortgang', 'Gem. Score', "Scenario's", 'Status', 'Laatste Activiteit'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(students || []).map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-semibold">
                        {(student.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="ml-4 text-sm font-medium text-gray-900">{student.name || '—'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.isRegistered ? (
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-3">
                          <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${student.progressPercentage || 0}%` }} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{student.progressPercentage || 0}%</span>
                      </div>
                    ) : <span className="text-sm text-gray-500">-</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.isRegistered ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (student.averageScore || 0) >= 80 ? 'bg-green-100 text-green-800' :
                        (student.averageScore || 0) >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>{student.averageScore || 0}%</span>
                    ) : <span className="text-sm text-gray-500">-</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.isRegistered ? student.completedScenarios : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {!student.isRegistered ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Niet geregistreerd</span>
                    ) : student.certificationReady ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />Competent
                      </span>
                    ) : (student.progressPercentage || 0) > 50 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <ClockIcon className="w-4 h-4 mr-1" />Bezig
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Niet gestart</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.isRegistered
                      ? (student.lastActivity ? new Date(student.lastActivity).toLocaleDateString('nl-NL') : 'Nooit')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(classStats.topPerformers?.length > 0) && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <TrophyIcon className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-green-800">Top Presteerders</h3>
            </div>
            <div className="space-y-3">
              {classStats.topPerformers.slice(0, 3).map((s, i) => (
                <div key={i} className="bg-white rounded-lg p-4 border border-green-200 flex items-center justify-between">
                  <span className="font-bold text-gray-900">{s.name}</span>
                  <div className="text-right">
                    <div className="text-green-600 font-medium">{s.averageScore}% gemiddeld</div>
                    <div className="text-sm text-gray-500">{s.completedScenarios} scenario's</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {(classStats.strugglingStudents?.length > 0) && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-3" />
              <h3 className="text-lg font-semibold text-orange-800">Extra Hulp Nodig</h3>
            </div>
            <div className="space-y-3">
              {classStats.strugglingStudents.map((s, i) => (
                <div key={i} className="bg-white rounded-lg p-4 border border-orange-200 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{s.name}</span>
                    <span className="ml-2 text-sm text-gray-500">({s.issue === 'low_scores' ? 'Lage scores' : 'Inactief'})</span>
                  </div>
                  <span className="text-sm text-gray-600">{s.recommendation}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WelzijnDashboard — BUITEN parent ─────────────────────────────────────────
function WelzijnDashboard({ loading, error, welzijnStats, selectedStudent, selectedGroup, selectedGroupName }) {
  const getScoreColor = (score) => {
    if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-green-700 bg-green-50 border-green-200';
    if (score >= 55) return 'text-amber-700 bg-amber-50 border-amber-200';
    if (score >= 40) return 'text-orange-700 bg-orange-50 border-orange-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

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
        <svg className="h-8 w-8 text-red-500 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-red-700">{error}</span>
      </div>
    );
  }

  if (!welzijnStats?.groupStats) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <HeartIcon className="h-16 w-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Welzijn & Gezondheid Overzicht</h3>
        <p className="text-gray-600">Selecteer een groep of leerling om welzijn statistieken te bekijken</p>
      </div>
    );
  }

  const { groupStats, studentData = [] } = welzijnStats;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welzijn & Gezondheid Overzicht</h2>
            <p className="text-gray-600">
              {selectedStudent ? `Individuele analyse - ${selectedStudent.naam}` :
               selectedGroup !== 'all' ? `Groepsanalyse - ${selectedGroupName}` : 'Welzijn statistieken'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">{groupStats.totalStudents || 0}</p>
            <p className="text-gray-500">Leerlingen</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg"><ChartBarIcon className="h-8 w-8 text-blue-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Gem. Welzijnsscore</p>
              <p className="text-3xl font-bold text-gray-900">{groupStats.avgScore || 0}%</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${groupStats.avgScore || 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg"><UserGroupIcon className="h-8 w-8 text-green-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Actieve Deelname (7d)</p>
              <p className="text-3xl font-bold text-gray-900">{groupStats.activeParticipation || 0}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg"><ClockIcon className="h-8 w-8 text-purple-600" /></div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Gem. Slaap (30d)</p>
              <p className="text-3xl font-bold text-gray-900">{groupStats.avgSleep || 0}u</p>
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
              <p className="text-3xl font-bold text-gray-900">{(groupStats.avgSteps || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Individuele Prestaties</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Leerling', 'Welzijnsscore', 'Slaap', 'Stappen', 'Activiteit (7d)', 'Trend (30d)'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {studentData.map((student, i) => (
                <tr key={student.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                        {(student.naam || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="ml-4 text-sm font-medium text-gray-900">{student.naam || '—'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getScoreColor(student.avgScore || 0)}`}>
                      {student.avgScore || 0}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={(student.avgSleep || 0) >= 8 ? 'text-green-600' : (student.avgSleep || 0) >= 7 ? 'text-amber-600' : 'text-red-600'}>
                      {student.avgSleep || 0}u
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={(student.avgSteps || 0) >= 10000 ? 'text-green-600' : (student.avgSteps || 0) >= 7500 ? 'text-amber-600' : 'text-red-600'}>
                      {(student.avgSteps || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                        (student.logs?.last7days || 0) >= 5 ? 'bg-green-100 text-green-800' :
                        (student.logs?.last7days || 0) >= 3 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>{student.logs?.last7days || 0}</span>
                      <span className="ml-2 text-sm text-gray-500">/ 7</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                        (student.logs?.last30days || 0) >= 20 ? 'bg-green-100 text-green-800' :
                        (student.logs?.last30days || 0) >= 15 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>{student.logs?.last30days || 0}</span>
                      <span className="ml-2 text-sm text-gray-500">/ 30</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Welzijnsmonitor (parent) ─────────────────────────────────────────────────
const Welzijnsmonitor = () => {
  const { profile } = useOutletContext();
  const [activeTab, setActiveTab] = useState('ehbo');
  const [classStats, setClassStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [availableGroups, setAvailableGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [welzijnStats, setWelzijnStats] = useState(null);

  const isTeacher = profile?.rol === 'leerkracht';
  const isAdmin = ['administrator', 'super-administrator'].includes(profile?.rol);
  const selectedGroupName = availableGroups.find(g => g.id === selectedGroup)?.originalName || '';

  useEffect(() => {
    if (profile?.school_id && (isTeacher || isAdmin)) {
      loadUserGroups();
    }
  }, [profile?.school_id]);

  useEffect(() => {
    if (!profile?.school_id || !(isTeacher || isAdmin)) return;

    let groupId, studentId;
    if (isAdmin && selectedStudent) {
      studentId = selectedStudent.id;
    } else if (selectedGroup !== 'all') {
      groupId = selectedGroup;
    } else {
      setClassStats(null);
      setStudents([]);
      setWelzijnStats(null);
      return;
    }

    if (activeTab === 'ehbo') {
      loadEHBOStats({ groupId, studentId });
    } else {
      loadWelzijnStats({ groupId, studentId });
    }
  }, [profile?.school_id, selectedGroup, selectedStudent, activeTab]);

  const loadUserGroups = async () => {
    setGroupsLoading(true);
    try {
      const result = await apiPost('get_groepen', { schoolId: profile.school_id }, profile._token);
      const groepen = result.groepen || [];
      setAvailableGroups([
        { id: 'all', naam: 'Selecteer een groep...' },
        ...groepen.map(g => ({
          id: g.id,
          naam: `${g.naam}${g.leerling_ids?.length ? ` - ${g.leerling_ids.length} lln` : ''}`,
          originalName: g.naam,
        })),
      ]);
    } catch (err) {
      console.error('Groepen laden mislukt:', err);
      setAvailableGroups([{ id: 'all', naam: 'Kan groepen niet laden' }]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const loadEHBOStats = async ({ groupId, studentId }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiPost('get_ehbo_stats', {
        schoolId: profile.school_id, classId: groupId, studentId,
      }, profile._token);
      if (result.success) {
        setClassStats(result.classStats);
        setStudents(result.students || []);
      } else {
        throw new Error(result.error || 'Onbekende fout');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWelzijnStats = async ({ groupId, studentId }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiPost('get_welzijn_stats', {
        schoolId: profile.school_id, classId: groupId, studentId,
      }, profile._token);
      if (result.success) {
        setWelzijnStats(result);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 overflow-y-auto pt-20">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8">

        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Welzijnsmonitor</h1>
              <p className="text-slate-600">
                {isTeacher ? 'Overzicht van EHBO competenties voor uw groepen' :
                 isAdmin ? 'Overzicht voor de hele school' : 'EHBO en welzijn statistieken'}
              </p>
            </div>

            {(isTeacher || isAdmin) && (
              <div className="lg:flex-shrink-0 lg:w-[600px]">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Groep Selecteren
                      {groupsLoading && <span className="text-xs text-gray-500 ml-2">(Laden...)</span>}
                    </label>
                    <select
                      value={selectedGroup}
                      onChange={e => { setSelectedGroup(e.target.value); setSelectedStudent(null); }}
                      disabled={groupsLoading}
                      className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-red-500 disabled:bg-gray-100"
                    >
                      {availableGroups.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
                    </select>
                  </div>

                  {isAdmin && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Specifieke Leerling</label>
                      <StudentSearch
                        onStudentSelect={s => { setSelectedStudent(s); setSelectedGroup('all'); }}
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
                        className="w-full h-10 px-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-sm"
                      >
                        Verwijder Leerling Filter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-8 bg-white rounded-xl p-2 shadow-sm border border-gray-200">
          <button
            onClick={() => setActiveTab('ehbo')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'ehbo' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <AcademicCapIcon className="w-5 h-5" />EHBO Competenties
          </button>
          <button
            onClick={() => setActiveTab('welzijn')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'welzijn' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <HeartIcon className="w-5 h-5" />Welzijn & Gezondheid
          </button>
        </div>

        {activeTab === 'ehbo' && (
          <EHBODashboard
            loading={loading} error={error} classStats={classStats} students={students}
            selectedStudent={selectedStudent} selectedGroup={selectedGroup} selectedGroupName={selectedGroupName}
          />
        )}
        {activeTab === 'welzijn' && (
          <WelzijnDashboard
            loading={loading} error={error} welzijnStats={welzijnStats}
            selectedStudent={selectedStudent} selectedGroup={selectedGroup} selectedGroupName={selectedGroupName}
          />
        )}
      </div>
    </div>
  );
};

export default Welzijnsmonitor;