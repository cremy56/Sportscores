// src/components/GroupCard.jsx
import { Link } from 'react-router-dom';
import { UsersIcon } from '@heroicons/react/24/outline';

// De props zijn nu simpeler
export default function GroupCard({ group }) {
  const memberCount = group.leden?.length || 0;

  return (
    // De hele kaart is een link naar de detailpagina
    <Link to={`/groep/${group.groep_id}`} className="block bg-white p-4 rounded-lg shadow-sm hover:shadow-lg transition-shadow">
      <div className="border-b pb-3 mb-3">
        <h3 className="font-bold text-lg text-purple-800">{group.groep_naam}</h3>
        <div className="flex items-center text-sm text-gray-500 mt-1">
          <UsersIcon className="h-4 w-4 mr-1.5" />
          <span>{memberCount} {memberCount === 1 ? 'leerling' : 'leerlingen'}</span>
        </div>
      </div>
      <div className="text-right">
        <span className="text-xs text-purple-700 font-semibold hover:underline">Leerlingen toevoegen</span>
      </div>
    </Link>
  );
}