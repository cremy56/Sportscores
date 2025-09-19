// src/components/MobileActionButtons.jsx
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function MobileActionButtons({ onEdit, onDelete, editLabel = 'Bewerken', deleteLabel = 'Verwijderen' }) {
  return (
    <div className="flex items-center space-x-2 flex-shrink-0">
      <button
        onClick={onEdit}
        aria-label={editLabel}
        className="p-2 text-gray-500 hover:bg-blue-100 hover:text-blue-700 rounded-full transition-colors"
      >
        <PencilIcon className="h-5 w-5" />
      </button>
      <button
        onClick={onDelete}
        aria-label={deleteLabel}
        className="p-2 text-gray-500 hover:bg-red-100 hover:text-red-700 rounded-full transition-colors"
      >
        <TrashIcon className="h-5 w-5" />
      </button>
    </div>
  );
}