// src/utils/adValvasHelpers.js
// MARKER_ADVALVAS_HELPERS
// Pure helperfuncties voor het ad valvas-dashboard. Stonden voorheen binnen
// de AdValvas-component (en werden daar bij elke render opnieuw aangemaakt);
// hier zijn ze stabiel en herbruikbaar door de subcomponenten.

// Toont enkel voornaam + initiaal ("Jan P.").
// GDPR-dataminimalisatie: het ad valvas-scherm hangt publiek in de gang,
// dus nooit de volledige achternaam tonen. Niet wijzigen zonder DPO-check.
export const formatNameForDisplay = (fullName) => {
  if (!fullName) return 'Onbekend';
  const nameParts = fullName.split(' ');
  if (nameParts.length < 2) return fullName;
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  return `${firstName} ${lastName.charAt(0)}.`;
};

// Fisher-Yates shuffle op een kopie (muteert de input niet).
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const formatTime = (date) =>
  date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (date) =>
  date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });

export const getRelativeTime = (date) => {
  const days = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Vandaag';
  if (days === 1) return 'Gisteren';
  if (days === 2) return 'Eergisteren';
  if (days < 7) return `${days} dagen geleden`;
  if (days < 14) return '1 week geleden';
  if (days < 30) return `${Math.floor(days / 7)} weken geleden`;
  return `${Math.floor(days / 30)} maanden geleden`;
};

// Bepaalt of de ingelogde gebruiker mededelingen mag plaatsen.
// Administrators altijd; leerkrachten enkel als de schoolinstelling dat toelaat.
export const canPostMessages = (profile, school) => {
  if (profile?.rol === 'administrator' || profile?.rol === 'super-administrator') {
    return true;
  }
  if (profile?.rol === 'leerkracht') {
    return school?.instellingen?.teachersCanPostAnnouncements === true;
  }
  return false;
};
