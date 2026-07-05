// src/data/sportbuddy/api.js
// Eén centrale helper voor alle Sportbuddy-API-calls.
// Lost het "token verlopen na inactiviteit"-probleem structureel op:
// het ID-token wordt bij ELKE call vers opgevraagd via getIdToken() — de
// Firebase-SDK geeft het gecachte token terug zolang het geldig is en
// ververst het automatisch zodra het verlopen is (bv. na een uur inactiviteit).
// Extra vangnet: antwoordt de server tóch 401 (randgeval: klokverschil),
// dan forceren we één verse refresh en proberen we één keer opnieuw.

import { auth } from '../../firebase';

async function haalToken(forceer = false) {
  const user = auth.currentUser;
  if (!user) throw new Error('Niet aangemeld — log opnieuw in.');
  return user.getIdToken(forceer);
}

export async function sportbuddyApi(body) {
  let token = await haalToken();

  const doe = async (t) => fetch('/api/sportbuddy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${t}`,
    },
    body: JSON.stringify(body),
  });

  let response = await doe(token);

  // Randgeval: token net verlopen op de server → één geforceerde refresh + retry
  if (response.status === 401) {
    token = await haalToken(true);
    response = await doe(token);
  }

  const result = await response.json();
  if (!response.ok) {
    const fout = new Error(result.error || 'Verzoek mislukt');
    fout.status = response.status;
    throw fout;
  }
  return result;
}
