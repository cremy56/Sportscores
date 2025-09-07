// src/pages/Rewards.jsx
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Users, Target, Calendar, Zap, Star, TrendingUp, Award, CheckCircle, Clock } from 'lucide-react';

const Rewards = () => {
  const { profile, school } = useOutletContext();
  
  // Redirect als gebruiker geen leerling is
  if (profile?.rol !== 'leerling') {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Alleen voor leerlingen</h2>
          <p className="text-gray-500">Het rewards systeem is alleen beschikbaar voor leerlingen.</p>
        </div>
      </div>
    );
  }
  const [studentData, setStudentData] = useState({
    xp: 0,
    sparks: 0,
    streak_days: 0,
    weeklyProgress: {
      kompas: 0,
      trainingen: 0,
      perfectWeek: false
    },
    personalRecords: 0,
    klasChallenge: {
      current: 0,
      target: 5000,
      participated: false
    }
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Real-time data loading from Firestore
  useEffect(() => {
    if (!profile?.id) return;

    const userRef = doc(db, 'users', profile.id);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setStudentData(prev => ({
          ...prev,
          xp: userData.xp || 0,
          sparks: userData.sparks || 0,
          streak_days: userData.streak_days || 0,
          weeklyProgress: userData.weekly_stats || prev.weeklyProgress,
          personalRecords: userData.personal_records_count || 0
        }));
      }
    });

    return () => unsubscribe();
  }, [profile?.id]);

  // Load class challenge data
  useEffect(() => {
    if (!school?.id) return;

    // Get current week start (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // In practice, you'd query class_challenges collection here
    // For now, we'll use mock data
  }, [school?.id]);

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Huidige XP</p>
              <p className="text-3xl font-bold">{studentData.xp}</p>
              <p className="text-purple-200 text-xs mt-1">= {Math.floor(studentData.xp / 100)} Sparks</p>
            </div>
            <Star className="w-8 h-8 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Sparks</p>
              <p className="text-3xl font-bold">{studentData.sparks}</p>
              <p className="text-yellow-200 text-xs mt-1">Premium Currency</p>
            </div>
            <Zap className="w-8 h-8 text-yellow-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Streak</p>
              <p className="text-3xl font-bold">{studentData.streak_days}</p>
              <p className="text-green-200 text-xs mt-1">dagen actief</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-200" />
          </div>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-blue-600" />
          Deze Week
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Kompas invullingen</span>
              <span className="text-sm font-semibold">{studentData.weeklyProgress.kompas}/7</span>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(studentData.weeklyProgress.kompas / 7) * 100}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Trainingen</span>
              <span className="text-sm font-semibold">{studentData.weeklyProgress.trainingen}/3</span>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(studentData.weeklyProgress.trainingen / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        {studentData.weeklyProgress.perfectWeek && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">Perfecte Week Bonus behaald! +50 XP</span>
            </div>
          </div>
        )}
      </div>

      {/* Class Challenge */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-purple-600" />
          Klas Challenge - Deze Week
        </h3>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Klas XP Verzameld</span>
            <span className="text-sm font-semibold">{studentData.klasChallenge.current}/{studentData.klasChallenge.target}</span>
          </div>
          <div className="bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(studentData.klasChallenge.current / studentData.klasChallenge.target) * 100}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Jouw bijdrage</span>
          {studentData.klasChallenge.participated ? (
            <span className="flex items-center text-green-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4 mr-1" />
              Actief deelgenomen
            </span>
          ) : (
            <span className="text-orange-600 text-sm">Nog geen bijdrage</span>
          )}
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-gold-600" />
          Recente Prestaties
        </h3>
        
        <div className="space-y-3">
          {studentData.personalRecords > 0 ? (
            <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Trophy className="w-5 h-5 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  {studentData.personalRecords} Persoonlijk Record{studentData.personalRecords > 1 ? 's' : ''} verbroken
                </p>
                <p className="text-xs text-yellow-600">+{studentData.personalRecords * 100} XP verdiend</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Nog geen recente prestaties</p>
              <p className="text-xs mt-1">Doe mee aan sporttesten om XP en Sparks te verdienen!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const EarningsTab = () => (
    <div className="space-y-6">
      {/* Dagelijkse XP */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">Dagelijkse XP Mogelijkheden</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <span className="text-sm">Welzijn kompas volledig invullen</span>
            <span className="font-semibold text-blue-600">+20 XP</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <span className="text-sm">Training loggen</span>
            <span className="font-semibold text-green-600">+15 XP</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
            <span className="text-sm">EHBO scenario voltooien</span>
            <span className="font-semibold text-red-600">+30 XP</span>
          </div>
        </div>
      </div>

      {/* Test & Prestatie XP */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4 text-purple-600">Test & Prestatie XP</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
            <span className="text-sm">Test deelname</span>
            <span className="font-semibold text-purple-600">+50 XP</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border-2 border-yellow-200">
            <span className="text-sm font-medium">Persoonlijk Record verbreken 🎉</span>
            <span className="font-bold text-yellow-600">+100 XP</span>
          </div>
        </div>
      </div>

      {/* Wekelijkse Bonussen */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4 text-green-600">Wekelijkse Bonussen</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <span className="text-sm">3 trainingen per week</span>
            <span className="font-semibold text-green-600">+25 XP</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
            <span className="text-sm font-medium">Perfecte Week (5x kompas + 2x training)</span>
            <span className="font-bold text-blue-600">+50 XP</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
            <span className="text-sm font-medium">Klas Challenge behaald</span>
            <span className="font-bold text-purple-600">+40 XP</span>
          </div>
        </div>
      </div>
    </div>
  );

  const SparksTab = () => (
    <div className="space-y-6">
      {/* Consistency Beloningen */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-orange-600" />
          Consistency Beloningen
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
            <span className="text-sm">7 dagen alle kompas segmenten</span>
            <span className="font-semibold text-orange-600 flex items-center">
              3 <Zap className="w-4 h-4 ml-1" />
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
            <span className="text-sm">30 dagen streak</span>
            <span className="font-semibold text-red-600 flex items-center">
              12 <Zap className="w-4 h-4 ml-1" />
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
            <span className="text-sm">100 dagen streak</span>
            <span className="font-semibold text-purple-600 flex items-center">
              40 <Zap className="w-4 h-4 ml-1" />
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <span className="text-sm">Volledig trainingsprogramma</span>
            <span className="font-semibold text-green-600 flex items-center">
              8 <Zap className="w-4 h-4 ml-1" />
            </span>
          </div>
        </div>
      </div>

      {/* Prestatie Beloningen */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
          Prestatie Beloningen
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border-2 border-yellow-300">
            <span className="text-sm font-medium">🥇 Schoolrecord 1e plaats</span>
            <span className="font-bold text-yellow-600 flex items-center">
              15 <Zap className="w-4 h-4 ml-1" />
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-gray-300">
            <span className="text-sm font-medium">🥈 Schoolrecord 2e plaats</span>
            <span className="font-bold text-gray-600 flex items-center">
              10 <Zap className="w-4 h-4 ml-1" />
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border-2 border-orange-300">
            <span className="text-sm font-medium">🥉 Schoolrecord 3e-5e plaats</span>
            <span className="font-bold text-orange-600 flex items-center">
              5 <Zap className="w-4 h-4 ml-1" />
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <span className="text-sm">Leeftijdsrecord 1e-2e plaats</span>
            <span className="font-semibold text-blue-600 flex items-center">
              5 <Zap className="w-4 h-4 ml-1" />
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <span className="text-sm">Leeftijdsrecord 3e-5e plaats</span>
            <span className="font-semibold text-blue-600 flex items-center">
              3 <Zap className="w-4 h-4 ml-1" />
            </span>
          </div>
        </div>
      </div>

      {/* Conversie Info */}
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-6 border-2 border-purple-200">
        <h3 className="text-lg font-semibold mb-2 text-purple-800 flex items-center">
          <Zap className="w-5 h-5 mr-2" />
          Wist je dat...
        </h3>
        <p className="text-purple-700 text-sm">
          Je kunt XP omzetten naar Sparks: <span className="font-bold">100 XP = 1 Spark</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Rewards</h1>
        <p className="text-gray-600">Verdien XP en Sparks door actief te blijven en je doelen te behalen</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Overzicht
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'earnings'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Star className="w-4 h-4 inline mr-2" />
          XP Verdienen
        </button>
        <button
          onClick={() => setActiveTab('sparks')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'sparks'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Zap className="w-4 h-4 inline mr-2" />
          Sparks Verdienen
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'earnings' && <EarningsTab />}
      {activeTab === 'sparks' && <SparksTab />}
    </div>
  );
};

export default Rewards;