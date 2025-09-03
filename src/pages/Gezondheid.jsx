import React, { useState, useEffect } from 'react';

const MijnGezondheid = () => {
  const [welzijnData, setWelzijnData] = useState({
    beweging: 85,
    voeding: 75,
    slaap: 68,
    mentaal: 88
  });
  
  const [hartslag, setHartslag] = useState(72);
  const [showHartslagModal, setShowHartslagModal] = useState(false);
  const [tempHartslag, setTempHartslag] = useState(72);

  const handleSegmentClick = (segment) => {
    console.log(`${segment} segment geklikt`);
  };

  const WelzijnsKompas = () => (
    <div className="flex justify-center mb-8">
      <div className="relative">
        {/* 3D Kompas Container */}
        <div 
          className="relative w-96 h-96 rounded-full"
          style={{
            background: 'linear-gradient(145deg, #e2e8f0, #cbd5e1)',
            boxShadow: `
              20px 20px 60px #94a3b8,
              -20px -20px 60px #ffffff,
              inset 0 0 0 1px rgba(255,255,255,0.1)
            `,
            transform: 'perspective(1000px) rotateX(10deg)',
          }}
        >
          {/* Beweging segment - Rechtsboven */}
          <div 
            onClick={() => handleSegmentClick('Beweging')}
            className="absolute inset-4 rounded-full cursor-pointer transition-transform hover:scale-105"
            style={{
              background: `conic-gradient(from -45deg, 
                #60a5fa 0deg, 
                #3b82f6 ${welzijnData.beweging * 0.9}deg, 
                #e5e7eb ${welzijnData.beweging * 0.9}deg 90deg,
                #4ade80 90deg,
                #22c55e ${90 + welzijnData.voeding * 0.9}deg,
                #e5e7eb ${90 + welzijnData.voeding * 0.9}deg 180deg,
                #a78bfa 180deg,
                #8b5cf6 ${180 + welzijnData.slaap * 0.9}deg,
                #e5e7eb ${180 + welzijnData.slaap * 0.9}deg 270deg,
                #fb923c 270deg,
                #f97316 ${270 + welzijnData.mentaal * 0.9}deg,
                #e5e7eb ${270 + welzijnData.mentaal * 0.9}deg 360deg)`,
              mask: 'radial-gradient(transparent 120px, black 120px)',
              WebkitMask: 'radial-gradient(transparent 120px, black 120px)',
              boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.1)',
            }}
          />

          {/* Segment Overlays voor klikgebieden - aangepast voor correcte zones */}
          {/* Beweging - Rechtsboven (0° tot 90°) */}
          <div 
            onClick={() => handleSegmentClick('Beweging')}
            className="absolute top-4 right-4 cursor-pointer hover:bg-blue-500/10 transition-colors"
            style={{
              width: '176px',
              height: '176px',
              clipPath: 'polygon(50% 50%, 100% 50%, 50% 0%)',
              borderRadius: '50%',
            }}
          />
          
          {/* Voeding - Rechtsonder (90° tot 180°) */}
          <div 
            onClick={() => handleSegmentClick('Voeding')}
            className="absolute bottom-4 right-4 cursor-pointer hover:bg-green-500/10 transition-colors"
            style={{
              width: '176px',
              height: '176px',
              clipPath: 'polygon(50% 50%, 100% 50%, 50% 100%)',
              borderRadius: '50%',
            }}
          />
          
          {/* Slaap - Linksonder (180° tot 270°) */}
          <div 
            onClick={() => handleSegmentClick('Slaap')}
            className="absolute bottom-4 left-4 cursor-pointer hover:bg-purple-500/10 transition-colors"
            style={{
              width: '176px',
              height: '176px',
              clipPath: 'polygon(50% 50%, 0% 50%, 50% 100%)',
              borderRadius: '50%',
            }}
          />
          
          {/* Mentaal - Linksboven (270° tot 360°) */}
          <div 
            onClick={() => handleSegmentClick('Mentaal')}
            className="absolute top-4 left-4 cursor-pointer hover:bg-orange-500/10 transition-colors"
            style={{
              width: '176px',
              height: '176px',
              clipPath: 'polygon(50% 50%, 0% 50%, 50% 0%)',
              borderRadius: '50%',
            }}
          />

          {/* Percentages aangepast naar het midden van de segmenten */}
          {/* Beweging (85%) - hoger boven bij blauwe segment */}
          <div 
            className="absolute pointer-events-none"
            style={{ 
              top: '40px', 
              left: '50%',
              transform: 'translate(-50%, 0)'
            }}
          >
            <span className="text-white font-bold text-xl drop-shadow-lg">
              {welzijnData.beweging}%
            </span>
          </div>

          {/* Voeding (75%) - lager rechts bij groene segment */}
          <div 
            className="absolute pointer-events-none"
            style={{ 
              top: '60%', 
              right: '40px',
              transform: 'translate(0, -50%)'
            }}
          >
            <span className="text-white font-bold text-xl drop-shadow-lg">
              {welzijnData.voeding}%
            </span>
          </div>

          {/* Slaap (68%) - lager onder bij paarse segment */}
          <div 
            className="absolute pointer-events-none"
            style={{ 
              bottom: '40px', 
              left: '50%',
              transform: 'translate(-50%, 0)'
            }}
          >
            <span className="text-white font-bold text-xl drop-shadow-lg">
              {welzijnData.slaap}%
            </span>
          </div>

          {/* Mentaal (88%) - lager links bij oranje segment */}
          <div 
            className="absolute pointer-events-none"
            style={{ 
              top: '60%', 
              left: '25px',
              transform: 'translate(0, -50%)'
            }}
          >
            <span className="text-white font-bold text-xl drop-shadow-lg">
              {welzijnData.mentaal}%
            </span>
          </div>

          {/* Labels buiten het kompas */}
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-center">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              Beweging
            </div>
          </div>

          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 text-center">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              Voeding
            </div>
          </div>

          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-center">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              Slaap
            </div>
          </div>

          <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 text-center">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              Mentaal
            </div>
          </div>

          {/* Hart in het midden */}
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110"
            onClick={() => setShowHartslagModal(true)}
            style={{
              width: '180px',
              height: '180px',
              background: 'linear-gradient(145deg, #ef4444, #dc2626, #b91c1c)',
              borderRadius: '50%',
              boxShadow: `
                0 20px 40px rgba(239, 68, 68, 0.4),
                inset 0 4px 8px rgba(255,255,255,0.2),
                inset 0 -4px 8px rgba(0,0,0,0.1)
              `,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'slowPulse 3s infinite ease-in-out',
            }}
          >
            <div 
              style={{
                fontSize: '4rem',
                marginBottom: '8px',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
              }}
            >
              ❤️
            </div>
            <div className="text-white font-bold text-3xl leading-none filter drop-shadow-md">
              {hartslag}
            </div>
            <div className="text-white text-sm opacity-90 font-medium">
              BPM
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const handleHartslagSave = () => {
    if (tempHartslag >= 30 && tempHartslag <= 220) {
      setHartslag(tempHartslag);
      setShowHartslagModal(false);
    } else {
      alert('Voer een geldige hartslag in tussen 30 en 220 BPM');
    }
  };

  const getGemiddeldeScore = () => {
    const totaal = welzijnData.beweging + welzijnData.voeding + welzijnData.slaap + welzijnData.mentaal;
    return Math.round(totaal / 4);
  };

  const getBalansStatus = () => {
    const gemiddelde = getGemiddeldeScore();
    if (gemiddelde >= 80) return { status: 'Uitstekend', kleur: 'text-green-600', emoji: '🌟' };
    if (gemiddelde >= 70) return { status: 'Goed', kleur: 'text-blue-600', emoji: '👍' };
    if (gemiddelde >= 60) return { status: 'Kan beter', kleur: 'text-orange-600', emoji: '⚡' };
    return { status: 'Focus nodig', kleur: 'text-red-600', emoji: '🎯' };
  };

  const balansStatus = getBalansStatus();

  return (
    <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 lg:px-8 space-y-4">
        
        <div className="mb-8 mt-20">
          <div className="flex justify-between items-center mb-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Mijn Gezondheid
            </h1>
            <div className="flex-shrink-0">
              <div className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 border border-white/30 shadow-lg">
                <span className="text-sm font-medium text-gray-700">🔒 Privé gegevens</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <WelzijnsKompas />

          <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 p-8 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3 filter drop-shadow-lg">{balansStatus.emoji}</div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">
                Algemene Score: {getGemiddeldeScore()}%
              </h2>
              <p className={`text-xl font-semibold ${balansStatus.kleur}`}>
                {balansStatus.status}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl border-2 border-blue-100 shadow-sm">
                <div className="text-2xl mb-2">🏃‍♂️</div>
                <div className="text-xl font-bold text-blue-600">{welzijnData.beweging}%</div>
                <div className="text-sm text-gray-600 font-medium">Beweging</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl border-2 border-green-100 shadow-sm">
                <div className="text-2xl mb-2">🥗</div>
                <div className="text-xl font-bold text-green-600">{welzijnData.voeding}%</div>
                <div className="text-sm text-gray-600 font-medium">Voeding</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl border-2 border-purple-100 shadow-sm">
                <div className="text-2xl mb-2">🌙</div>
                <div className="text-xl font-bold text-purple-600">{welzijnData.slaap}%</div>
                <div className="text-sm text-gray-600 font-medium">Slaap</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-xl border-2 border-orange-100 shadow-sm">
                <div className="text-2xl mb-2">🧠</div>
                <div className="text-xl font-bold text-orange-600">{welzijnData.mentaal}%</div>
                <div className="text-sm text-gray-600 font-medium">Mentaal</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md border-2 border-slate-200 p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Snelle Acties</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button 
                onClick={() => handleSegmentClick('Beweging')}
                className="p-6 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-105 shadow-sm border-2 border-blue-100"
              >
                <div className="text-sm font-medium text-slate-700">Activiteit</div>
              </button>
              <button 
                onClick={() => handleSegmentClick('Voeding')}
                className="p-6 bg-green-50 hover:bg-green-100 rounded-xl transition-all duration-200 hover:scale-105 shadow-sm border-2 border-green-100"
              >
                <div className="text-sm font-medium text-slate-700">Water</div>
              </button>
              <button 
                onClick={() => handleSegmentClick('Slaap')}
                className="p-6 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all duration-200 hover:scale-105 shadow-sm border-2 border-purple-100"
              >
                <div className="text-sm font-medium text-slate-700">Slaap</div>
              </button>
              <button 
                className="p-6 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 hover:scale-105 shadow-sm border-2 border-red-100"
                onClick={() => setShowHartslagModal(true)}
              >
                <div className="text-sm font-medium text-slate-700">Hartslag</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hartslag Modal */}
      {showHartslagModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">❤️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Hartslag Invoeren</h3>
              <p className="text-gray-600">Voer je huidige hartslag in BPM</p>
            </div>
            
            <div className="mb-6">
              <input 
                type="number"
                value={tempHartslag}
                onChange={(e) => setTempHartslag(parseInt(e.target.value))}
                className="w-full text-center text-2xl font-bold p-4 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
                placeholder="72"
                min="30"
                max="220"
              />
              <p className="text-sm text-gray-500 mt-2 text-center">Tussen 30 en 220 BPM</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowHartslagModal(false)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Annuleren
              </button>
              <button 
                onClick={handleHartslagSave}
                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slowPulse {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1); 
            box-shadow: 
              0 20px 40px rgba(239, 68, 68, 0.4),
              inset 0 4px 8px rgba(255,255,255,0.2),
              inset 0 -4px 8px rgba(0,0,0,0.1);
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.05); 
            box-shadow: 
              0 25px 50px rgba(239, 68, 68, 0.5),
              inset 0 4px 8px rgba(255,255,255,0.3),
              inset 0 -4px 8px rgba(0,0,0,0.1);
          }
        }
      `}</style>
    </div>
  );
};

export default MijnGezondheid;