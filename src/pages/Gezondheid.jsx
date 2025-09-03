import React, { useState } from 'react';
import WelzijnKompas from './WelzijnKompas'; // Importeer de nieuwe 3D component

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

  // Functie die wordt aangeroepen als er op een segment of het hart wordt geklikt
  const handleKompasClick = (type, value) => {
    console.log(`Gebruiker klikte op ${type} met waarde ${value}`);
    if (type === 'Hartslag') {
      setShowHartslagModal(true);
    }
    // Voeg hier logica toe voor andere segmenten, bv. open een andere modal
  };

  const handleHartslagSave = () => {
    if (tempHartslag >= 30 && tempHartslag <= 220) {
      setHartslag(tempHartslag);
      setShowHartslagModal(false);
    } else {
      alert('Voer een geldige hartslag in tussen 30 en 220 BPM');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 lg:px-8 space-y-4">
        
        <div className="mb-8 mt-20">
          <h1 className="text-center text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            Mijn Welzijn Kompas
          </h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-8 bg-white rounded-2xl shadow-md p-4 sm:p-8">
          {/* De nieuwe 3D component wordt hier aangeroepen */}
          <WelzijnKompas 
            beweging={welzijnData.beweging}
            mentaal={welzijnData.mentaal}
            voeding={welzijnData.voeding}
            slaap={welzijnData.slaap}
            hartslag={hartslag}
            onKompasClick={handleKompasClick}
          />
        </div>
      </div>

      {/* Hartslag Modal (onveranderd) */}
      {showHartslagModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Hartslag Invoeren</h3>
            </div>
            <input 
              type="number" value={tempHartslag}
              onChange={(e) => setTempHartslag(parseInt(e.target.value))}
              className="w-full text-center text-2xl font-bold p-4 border-2 rounded-xl"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowHartslagModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl">Annuleren</button>
              <button onClick={handleHartslagSave} className="flex-1 py-3 bg-red-500 text-white rounded-xl">Opslaan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MijnGezondheid;