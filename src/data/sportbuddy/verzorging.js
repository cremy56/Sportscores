// src/data/sportbuddy/verzorging.js
// LABELS voor de dagelijkse verzorgingskeuzes. De IDs zijn een bewuste kopie
// van lib/sportbuddy/keuzes.js (server-side waarheid) — synchroon houden!
// Effecten leven uitsluitend server-side; hier alleen wat de leerling ziet.

export const TRAINING_OPTIES = [
  { id: 'rust', emoji: '🛋️', label: 'Rustdag', uitleg: 'Geen training — herstel is óók trainen.' },
  { id: 'herstel', emoji: '🚶', label: 'Hersteltraining', uitleg: 'Rustig bewegen: losfietsen, wandelen, rekken.' },
  { id: 'techniek', emoji: '🎯', label: 'Techniek', uitleg: 'Balgevoel, passing, coördinatie en evenwicht.' },
  { id: 'kracht', emoji: '🏋️', label: 'Kracht', uitleg: 'Kracht en stabiliteit — de basis tegen blessures.' },
  { id: 'interval', emoji: '⚡', label: 'Interval', uitleg: 'Korte sprints met rust: uithouding én snelheid.' },
  { id: 'match', emoji: '⚽', label: 'Wedstrijd', uitleg: 'De zwaarste dag van de week — alles komt samen.' },
];

export const VOEDING_OPTIES = [
  { id: 'licht', emoji: '🥗', label: 'Licht', uitleg: 'Klein en licht — prima op een rustdag.' },
  { id: 'gewoon', emoji: '🍽️', label: 'Gewoon', uitleg: 'Gevarieerd volgens de voedingsdriehoek.' },
  { id: 'koolhydraatrijk', emoji: '🍝', label: 'Koolhydraatrijk', uitleg: 'Extra energie — slim rond zware trainingen.' },
  { id: 'fastfood', emoji: '🍟', label: 'Fastfood', uitleg: 'Lekker, maar remt het herstel.' },
];

export const WATER_OPTIES = [
  { id: 'weinig', emoji: '💧', label: 'Weinig', uitleg: 'Minder dan 1 liter.' },
  { id: 'voldoende', emoji: '💧💧', label: 'Voldoende', uitleg: '1,5 à 2 liter, meer bij inspanning.' },
  { id: 'veel', emoji: '💧💧💧', label: 'Veel', uitleg: 'Extra bij warmte of een zware dag.' },
];

export const SLAAP_OPTIES = [
  { id: 'kort', emoji: '🥱', label: '±6 uur', uitleg: 'Te kort voor een tiener — herstel hapert.' },
  { id: 'normaal', emoji: '😴', label: '±8 uur', uitleg: 'Degelijk, maar tieners mogen méér.' },
  { id: 'lang', emoji: '🛌', label: '9-10 uur', uitleg: 'De norm voor tieners: groeihormoon piekt \'s nachts.' },
];

export const MENTAAL_OPTIES = [
  { id: 'geen', emoji: '➖', label: 'Niets', uitleg: 'Vandaag geen mentale routine.' },
  { id: 'ademhaling', emoji: '🌬️', label: 'Ademhaling', uitleg: '4-7-8-oefening: stress en hartslag zakken.' },
  { id: 'visualisatie', emoji: '🧠', label: 'Visualisatie', uitleg: 'De wedstrijd vooraf in je hoofd spelen.' },
];

export const VERZORGING_SECTIES = [
  { key: 'training', titel: 'Training', opties: TRAINING_OPTIES },
  { key: 'voeding', titel: 'Voeding', opties: VOEDING_OPTIES },
  { key: 'water', titel: 'Drinken', opties: WATER_OPTIES },
  { key: 'slaap', titel: 'Slaap (afgelopen nacht)', opties: SLAAP_OPTIES },
  { key: 'mentaal', titel: 'Mentale routine', opties: MENTAAL_OPTIES },
];
