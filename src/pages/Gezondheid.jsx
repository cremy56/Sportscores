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
    // Hier kun je functionaliteit toevoegen voor elk segment
  };

  const WelzijnsKompas = () => {
    const segmenten = [
      { naam: 'Beweging', waarde: welzijnData.beweging, kleur: '#60a5fa', rotatie: -45, positie: 'top-0 right-0' },
      { naam: 'Mentaal', waarde: welzijnData.mentaal, kleur: '#fb923c', rotatie: -135, positie: 'top-0 left-0' },
      { naam: 'Slaap', waarde: welzijnData.slaap, kleur: '#a78bfa', rotatie: 135, positie: 'bottom-0 left-0' },
      { naam: 'Voeding', waarde: welzijnData.voeding, kleur: '#4ade80', rotatie: 45, positie: 'bottom-0 right-0' },
    ];
    
    return (
    <div className="flex justify-center items-center my-8">
        <div className="relative w-[400px] h-[400px]">
            {/* Grote 3D Hart in het midden */}
            <div
                onClick={() => setShowHartslagModal(true)}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] cursor-pointer group"
            >
                <div
                    className="relative w-full h-full transition-transform duration-300 group-hover:scale-105"
                    style={{
                        filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.2))'
                    }}
                >
                    <div
                        className="absolute w-[90px] h-[135px] -top-[45px] left-1/2 -translate-x-1/2 bg-red-500 rounded-t-full"
                        style={{
                            transform: 'rotate(-45deg)',
                            transformOrigin: 'bottom center',
                            background: 'linear-gradient(135deg, #ef4444, #b91c1c)'
                        }}
                    ></div>
                    <div
                        className="absolute w-[90px] h-[135px] -top-[45px] left-1/2 -translate-x-1/2 bg-red-500 rounded-t-full"
                        style={{
                            transform: 'rotate(45deg)',
                            transformOrigin: 'bottom center',
                            background: 'linear-gradient(45deg, #b91c1c, #ef4444)'
                        }}
                    ></div>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 pointer-events-none">
                    <div className="font-bold text-5xl leading-none" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                        {hartslag}
                    </div>
                    <div className="text-lg font-medium opacity-90" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                        BPM
                    </div>
                </div>
            </div>

            {/* Segmenten */}
            {segmenten.map((seg, index) => (
                <div
                    key={index}
                    className={`absolute w-[190px] h-[190px] ${seg.positie}`}
                    style={{ transform: `rotate(${seg.rotatie}deg)` }}
                >
                    <div
                        onClick={() => handleSegmentClick(seg.naam)}
                        className="w-full h-full rounded-full cursor-pointer transition-transform hover:scale-105"
                        style={{
                            backgroundColor: seg.kleur,
                            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                            boxShadow: 'inset 5px 5px 15px rgba(255, 255, 255, 0.2), inset -5px -5px 15px rgba(0, 0, 0, 0.15)',
                            transform: 'rotate(-45deg)' // Compensate for parent rotation
                        }}
                    >
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-white font-bold"
                             style={{
                                 transform: `rotate(${45 - seg.rotatie}deg)`, // Counter-rotate text
                                 textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                             }}>
                            <span>{seg.naam}</span>
                            <span className="text-2xl">{seg.waarde}%</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
   );
 };


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
              Mijn Welzijn Kompas
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
                <div className="text-xl font-bold text-blue-600">{welzijnData.beweging}%</div>
                <div className="text-sm text-gray-600 font-medium">Beweging</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl border-2 border-green-100 shadow-sm">
                <div className="text-xl font-bold text-green-600">{welzijnData.voeding}%</div>
                <div className="text-sm text-gray-600 font-medium">Voeding</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl border-2 border-purple-100 shadow-sm">
                <div className="text-xl font-bold text-purple-600">{welzijnData.slaap}%</div>
                <div className="text-sm text-gray-600 font-medium">Slaap</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-xl border-2 border-orange-100 shadow-sm">
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
    </div>
  );
};

export default MijnGezondheid;