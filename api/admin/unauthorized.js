// api/admin/unauthorized.js
// Fallback voor requests zonder Authorization header naar /api/admin/*
export default function handler(req, res) {
    return res.status(401).json({ error: 'Niet geauthenticeerd' });
}