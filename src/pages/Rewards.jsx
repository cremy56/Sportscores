import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Users, Target, Calendar, Zap, Star, TrendingUp, Award, CheckCircle, Clock, Medal } from 'lucide-react';

const Rewards = () => {
  const { profile, school } = useOutletContext();
  
  // Redirect if not student
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
    personal_records_count: 0,
    completed_programs: 0,
    weeklyProgress: {
      kompas: 0,
      trainingen: 0,
      perfectWeek: false
    },
    recentAchievements: [],
    classChallenges: []
  });
  
  const [activeTab, setActiveTab] = useState('overview');

  // Real-time data loading
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
          personal_records_count: userData.personal_records_count || 0,
          completed_programs: userData.completed_programs || 0,
          weeklyProgress: userData.weekly_stats || prev.weeklyProgress
        }));
      }
    });

    return () => unsubscribe();
  }, [profile?.id]);

  // Load achievements
  useEffect(() => {
    if (!profile?.id) return;

    const loadAchievements = async () => {
      try {
        const achievementsQuery = query(
          collection(db, 'users', profile.id, 'achievements'),
          orderBy('achieved_at', 'desc'),
          limit(5)
        );
        
        const achievementsSnap = await getDocs(achievementsQuery);
        const achievements = achievementsSnap.docs.map(doc => doc.data());
        
        setStudentData(prev => ({
          ...prev,
          recentAchievements: achievements
        }));
      } catch (error) {
        console.error('Error loading achievements:', error);
      }
    };

    loadAchievements();
  }, [profile?.id]);

  // Load class challenges
  useEffect(() => {
    if (!profile?.groepen || profile.groepen.length === 0) return;

    const loadClassChallenges = async () => {
      try {
        // Get current week
        const now = new Date();
        const weekStart = getWeekStart(now);
        const weekId = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
        
        const challenges = [];
        for (const groupId of profile.groepen) {
          const challengeId = `${groupId}_${weekId}`;
          const challengeQuery = query(
            collection(db, 'class_challenges'),
            where('__name__', '==', challengeId)
          );
          
          const challengeSnap = await getDocs(challengeQuery);
          challengeSnap.docs.forEach(doc => {
            challenges.push(doc.data());
          });
        }
        
        setStudentData(prev => ({
          ...prev,
          classChallenges: challenges
        }));
      } catch (error) {
        console.error('Error loading class challenges:', error);
      }
    };

    loadClassChallenges();
  }, [profile?.groepen]);

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <div className="bg-gradient-to-br from-pink-500 to-red-500 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-pink-100 text-sm">Personal Records</p>
              <p className="text-3xl font-bold">{studentData.personal_records_count}</p>
              <p className="text-pink-200 text-xs mt-1">Records verbroken</p>
            </div>
            <Trophy className="w-8 h-8 text-pink-200" />
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
                style={{ width: `${Math.min((studentData.weeklyProgress.kompas / 7) * 100, 100)}%` }}
              />
            </div>
            {studentData.weeklyProgress.kompas >= 5 && (
              <p className="text-xs text-blue-600 mt-1">Klaar voor Perfect Week bonus!</p>
            )}
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Trainingen</span>
              <span className="text-sm font-semibold">{studentData.weeklyProgress.trainingen}/3</span>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((studentData.weeklyProgress.trainingen / 3) * 100, 100)}%` }}
              />
            </div>
            {studentData.weeklyProgress.trainingen >= 3 && (
              <p className="text-xs text-green-600 mt-1">Weekly Training Bonus behaald!</p>
            )}
          </div>
        </div>
        
        {(studentData.weeklyProgress.kompas >= 5 && studentData.weeklyProgress.trainingen >= 2) && (
          <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">Perfect Week behaald! +50 XP</span>
            </div>
          </div>
        )}
      </div>

      {/* Class Challenges */}
      {studentData.classChallenges.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-purple-600" />
            Klas Challenges - Deze Week
          </h3>
          
          {studentData.classChallenges.map((challenge, index) => (
            <div key={index} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{challenge.group_name}</span>
                <span className="text-xs text-gray-500">{challenge.status === 'completed' ? 'Voltooid!' : 'Actief'}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Klas XP</span>
                    <span>{challenge.current_progress?.total_xp || 0}/{challenge.targets?.total_xp || 0}</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${Math.min(((challenge.current_progress?.total_xp || 0) / (challenge.targets?.total_xp || 1)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Trainingen</span>
                    <span>{challenge.current_progress?.total_trainings || 0}/{challenge.targets?.total_trainings || 0}</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${Math.min(((challenge.current_progress?.total_trainings || 0) / (challenge.targets?.total_trainings || 1)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {challenge.status === 'completed' && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-700 text-sm">Challenge voltooid! +{challenge.reward_xp} XP behaald</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recent Achievements */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Award className="w-5 h-5 mr-2 text-gold-600" />
          Recente Prestaties
        </h3>
        
        {studentData.recentAchievements.length > 0 ? (
          <div className="space-y-3">
            {studentData.recentAchievements.map((achievement, index) => (
              <div key={index} className="flex items-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                {achievement.type === 'school_record' ? (
                  <Medal className="w-5 h-5 text-yellow-600 mr-3" />
                ) : achievement.type === 'age_record' ? (
                  <Trophy className="w-5 h-5 text-blue-600 mr-3" />
                ) : (
                  <Award className="w-5 h-5 text-green-600 mr-3" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {achievement.description}
                  </p>
                  <p className="text-xs text-gray-600">
                    {achievement.test_name} • +{achievement.sparks} Sparks
                  </p>
                </div>
              </div>
            ))}
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
  );

  const EarningsTab = () => (
    <div className="space-y-6">
      {/* Dagelijkse XP */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4 text-blue-600">Dagelijkse XP Mogelijkheden</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <div>
              <span className="text-sm font-medium">Welzijn kompas volledig invullen</span>
              <p className="text-xs text-blue-600 mt-1">Vul alle 5 segmenten in voor bonus XP</p>
            </div>
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
            <div>
              <span className="text-sm font-medium">Test deelname</span>
              <p className="text-xs text-purple-600 mt-1">Voor elke test die je doet, ongeacht het resultaat</p>
            </div>
            <span className="font-semibold text-purple-600">+50 XP</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-300">
            <div>
              <span className="text-sm font-medium">Personal Record verbreken</span>
              <p className="text-xs text-yellow-700 mt-1">
                Elke verbetering van je eigen beste score telt als PR
              </p>
            </div>
            <span className="font-bold text-yellow-600">+100 XP</span>
          </div>
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Totaal per test:</strong> 50 XP deelname + 100 XP PR = 150 XP maximaal
            </p>
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
            <div>
              <span className="text-sm font-medium">Perfect Week</span>
              <p className="text-xs text-blue-600 mt-1">5x kompas + 2x training</p>
            </div>
            <span className="font-bold text-blue-600">+50 XP</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
            <div>
              <span className="text-sm font-medium">Klas Challenge behaald</span>
              <p className="text-xs text-purple-600 mt-1">Als je klas het doel haalt</p>
            </div>
            <span className="font-bold text-purple-600">+40 XP</span>
          </div>
        </div>
      </div>

      {/* Personal Records Uitleg */}
      <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl p-6 border-2 border-blue-200">
        <h3 className="text-lg font-semibold mb-2 text-blue-800 flex items-center">
          <Trophy className="w-5 h-5 mr-2" />
          Personal Records Uitleg
        </h3>
        <div className="space-y-2 text-blue-700 text-sm">
          <p><strong>Wat is een Personal Record?</strong></p>
          <p>Elke keer dat je je eigen beste score verbetert bij een test, behaal je een PR.</p>
          <p><strong>Hoe werkt het?</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Je eerste test score is automatisch een PR</li>
            <li>Bij sprint: snellere tijd = PR</li>
            <li>Bij verspringen: verder springen = PR</li>
            <li>Bij Cooper test: meer afstand = PR</li>
          </ul>
<p className="font-medium">Focus op je eigen groei, niet op anderen verslaan!</p>
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
           <span className="text-sm font-medium">Schoolrecord 1e plaats</span>
           <span className="font-bold text-yellow-600 flex items-center">
             15 <Zap className="w-4 h-4 ml-1" />
           </span>
         </div>
         <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-gray-300">
           <span className="text-sm font-medium">Schoolrecord 2e plaats</span>
           <span className="font-bold text-gray-600 flex items-center">
             10 <Zap className="w-4 h-4 ml-1" />
           </span>
         </div>
         <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border-2 border-orange-300">
           <span className="text-sm font-medium">Schoolrecord 3e-5e plaats</span>
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

     {/* Huidige Streak Status */}
     {studentData.streak_days > 0 && (
       <div className="bg-white rounded-xl shadow-lg p-6 border">
         <h3 className="text-lg font-semibold mb-4 flex items-center">
           <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
           Jouw Streak Status
         </h3>
         <div className="space-y-4">
           <div className="text-center">
             <div className="text-3xl font-bold text-green-600 mb-2">
               {studentData.streak_days} dagen
             </div>
             <p className="text-gray-600 text-sm">Huidige streak</p>
           </div>
           
           {/* Progress naar volgende milestone */}
           <div className="space-y-2">
             {[7, 30, 100].map(milestone => {
               if (studentData.streak_days < milestone) {
                 const progress = (studentData.streak_days / milestone) * 100;
                 const remaining = milestone - studentData.streak_days;
                 const sparks = milestone === 7 ? 3 : milestone === 30 ? 12 : 40;
                 
                 return (
                   <div key={milestone} className="bg-gray-50 p-4 rounded-lg">
                     <div className="flex justify-between items-center mb-2">
                       <span className="text-sm font-medium">Volgende: {milestone} dagen</span>
                       <span className="text-sm text-gray-600">{remaining} dagen te gaan</span>
                     </div>
                     <div className="bg-gray-200 rounded-full h-2 mb-2">
                       <div 
                         className="bg-green-500 h-2 rounded-full transition-all duration-300"
                         style={{ width: `${progress}%` }}
                       />
                     </div>
                     <p className="text-xs text-green-600">Beloning: {sparks} Sparks</p>
                   </div>
                 );
               }
               return null;
             }).filter(Boolean)[0] || (
               <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                 <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                 <p className="text-green-800 font-medium">Alle streak milestones behaald!</p>
                 <p className="text-green-600 text-sm mt-1">Blijf doorgaan om je streak te behouden</p>
               </div>
             )}
           </div>
         </div>
       </div>
     )}
   </div>
 );

 // Helper functions
 function getWeekStart(date) {
   const result = new Date(date);
   const day = result.getDay();
   const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Monday
   result.setDate(diff);
   result.setHours(0, 0, 0, 0);
   return result;
 }

 function getWeekNumber(date) {
   const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
   const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
   return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
 }

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