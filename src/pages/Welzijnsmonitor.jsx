import React from 'react';

const Welzijnsmonitor = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
        Welzijnsmonitor
      </h1>
      <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
        <p className="text-slate-700">
          Dit is het overzicht voor leerkrachten en administrators. Hier komen de statistieken en invoervelden voor aanvullende data zoals vetpercentage.
        </p>
        {/* Placeholder for future charts and data input forms */}
      </div>
    </div>
  );
};

export default Welzijnsmonitor;
