// src/data/sportbuddy/api.js
// Dunne wrapper rond de centrale apiCall() uit src/utils/api.js.
//
// Deze helper deed het al goed (vers token per call, 401 → geforceerde
// refresh + retry), maar was een tweede netwerklaag naast apiCall(). Nu is
// er nog één plek waar netwerkgedrag geregeld is, en krijgt Sportbuddy er
// de 429-afhandeling van apiCall bij: een vriendelijke toast bij rate
// limiting in plaats van een kale foutmelding.
//
// De signatuur is bewust ongewijzigd — sportbuddyApi(body) — zodat alle
// bestaande aanroepers blijven werken. Fouten komen nog steeds als Error
// met .status, dus foutafhandeling elders hoeft niet aangepast.

import { apiCall } from '../../utils/api';

export function sportbuddyApi(body, opties = {}) {
  return apiCall('/api/sportbuddy', body, opties);
}
