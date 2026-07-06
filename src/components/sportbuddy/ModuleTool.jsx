// src/components/sportbuddy/ModuleTool.jsx
// Kiest de juiste interactieve tool voor een module. Nieuwe tool toevoegen:
// component maken onder tools/, hier registreren, en het id in
// MODULES_MET_TOOL (kennis.js) zetten.

import HartslagLab from './tools/HartslagLab';
import EnergieLab from './tools/EnergieLab';
import VoedingLab from './tools/VoedingLab';
import MentaalLab from './tools/MentaalLab';
import FysiekLab from './tools/FysiekLab';
import HoudingLab from './tools/HoudingLab';

const TOOLS = {
  hart: HartslagLab,
  energie: EnergieLab,
  voeding: VoedingLab,
  mentaal: MentaalLab,
  fysiek: FysiekLab,
  houding: HoudingLab,
};

export default function ModuleTool({ moduleId, graad = 2, buddy }) {
  const Tool = TOOLS[moduleId];
  if (!Tool) return null;
  return <Tool graad={graad} buddy={buddy} />;
}
