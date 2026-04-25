import { useOutletContext } from 'react-router-dom';

export default function Welzijnsmonitor() {
  const ctx = useOutletContext();
  return (
    <div style={{ padding: 40, background: 'white' }}>
      <h1 style={{ fontSize: 24 }}>Test</h1>
      <p>Rol: {ctx?.profile?.rol}</p>
      <p>School: {ctx?.profile?.school_id}</p>
    </div>
  );
}