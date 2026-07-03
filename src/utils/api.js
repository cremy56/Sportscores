// src/utils/api.js
// ─────────────────────────────────────────────────────────────────────────────
// Centrale API-helper — DE aanbevolen manier om de backend aan te roepen.
//
// Waarom: componenten haalden het token uit profile._token (gedeelde string)
// of eigen fetch-code. Deze helper:
//   1. haalt bij ELKE call een vers token op (de SDK cachet en ververst zelf,
//      dus dit kost niets extra)
//   2. vangt 401 op met één geforceerde token-refresh + retry (bv. na
//      laptop-slaapstand)
//   3. vangt 429 (rate limit) op met een vriendelijke toast
//   4. gooit voor andere fouten een Error met .status, zodat de aanroeper
//      kan reageren
//
// Gebruik:
//   import { apiCall } from '../utils/api';
//   const data = await apiCall('/api/tests', { action: 'get_leaderboard', ... });
//   const content = await apiCall('/api/content', null, { method: 'GET' });
//
// Migratie: vervang per component het fetch-blok door apiCall(...). Nieuwe
// code gebruikt ALTIJD deze helper — nooit meer profile._token of eigen fetch.
// ─────────────────────────────────────────────────────────────────────────────

import { getAuth } from 'firebase/auth';
import toast from 'react-hot-toast';

export async function apiCall(endpoint, body = null, opties = {}) {
    const user = getAuth().currentUser;
    if (!user) {
        throw Object.assign(new Error('Niet ingelogd'), { status: 401 });
    }

    const method = opties.method || 'POST';

    const doFetch = async (forceer = false) => {
        const token = await user.getIdToken(forceer);
        return fetch(endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            ...(body !== null && method !== 'GET' ? { body: JSON.stringify(body) } : {}),
        });
    };

    let response = await doFetch();

    // 401 → token kan net verlopen zijn (bv. na slaapstand):
    // één geforceerde refresh + retry vóór we opgeven.
    if (response.status === 401) {
        response = await doFetch(true);
    }

    // 429 → rate limit: vriendelijke melding, aanroeper krijgt Error met status
    if (response.status === 429) {
        if (!opties.stil) {
            toast.error('Even rustig aan — probeer het over een minuutje opnieuw.');
        }
        throw Object.assign(new Error('Te veel verzoeken'), { status: 429 });
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw Object.assign(
            new Error(data.error || `Serverfout (${response.status})`),
            { status: response.status }
        );
    }

    return data;
}