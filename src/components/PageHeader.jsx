// src/components/PageHeader.jsx
import { PlusIcon } from '@heroicons/react/24/outline';

export default function PageHeader({ 
  title, 
  subtitle, 
  showCreateButton = false, 
  createButtonText = "Nieuw", 
  createButtonIcon: CreateButtonIcon = PlusIcon,
  onCreateClick,
  children 
}) {
  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          </div>
          {showCreateButton && (
            <button
              onClick={onCreateClick}
              className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
            >
              <CreateButtonIcon className="h-6 w-6" />
            </button>
          )}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block max-w-7xl mx-auto mb-12">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              {title}
            </h1>
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
          </div>
          {showCreateButton && (
            <button
              onClick={onCreateClick}
              className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
            >
              <CreateButtonIcon className="h-6 w-6 mr-2" />
              <span>{createButtonText}</span>
            </button>
          )}
        </div>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </>
  );
}