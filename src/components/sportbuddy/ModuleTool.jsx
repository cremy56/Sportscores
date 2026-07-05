// src/components/sportbuddy/ModuleTool.jsx
// Kiest de juiste interactieve tool voor een module. Nieuwe tool toevoegen:
// component maken onder tools/, hier registreren, en het id in
// MODULES_MET_TOOL (kennis.js) zetten.

import HartslagLab from './tools/HartslagLab';

const TOOLS = {
  hart: HartslagLab,
  // voeding: Bordbouwer,   (volgende sessie)
  // energie: EnergieSorteerder,
  // slaap: SlaaptekortSimulator,
};

export default function ModuleTool({ moduleId }) {
  const Tool = TOOLS[moduleId];
  if (!Tool) return null;
  return <Tool />;
}
