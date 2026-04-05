
import { ModuleBuild } from '../types';

const STORAGE_KEY = 'helios_mis_module_builds_v1';

const getUUID = () => crypto.randomUUID();

const createDefaultBuilds = (): ModuleBuild[] => [
  {
    id: getUUID(),
    name: 'Default 540Wp Mono PERC',
    wp: 540,
    area: 2.53,
    degradation: { firstYear: 2.0, subsequentYears: 0.55 },
  },
  {
    id: getUUID(),
    name: 'Generic 450Wp Poly',
    wp: 450,
    area: 2.15,
    degradation: { firstYear: 2.5, subsequentYears: 0.7 },
  },
];

export const getModuleBuilds = (): ModuleBuild[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    } else {
      const defaults = createDefaultBuilds();
      saveModuleBuilds(defaults);
      return defaults;
    }
  } catch (e) {
    console.error("Failed to load module builds", e);
    const defaults = createDefaultBuilds();
    saveModuleBuilds(defaults);
    return defaults;
  }
};

export const saveModuleBuilds = (builds: ModuleBuild[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(builds));
  } catch (e) {
    console.error("Failed to save module builds", e);
  }
};

export const addModuleBuild = (newBuild: Omit<ModuleBuild, 'id'>) => {
  const builds = getModuleBuilds();
  const buildWithId: ModuleBuild = { ...newBuild, id: getUUID() };
  saveModuleBuilds([...builds, buildWithId]);
};

export const updateModuleBuild = (updatedBuild: ModuleBuild) => {
  const builds = getModuleBuilds();
  const newBuilds = builds.map(b => b.id === updatedBuild.id ? updatedBuild : b);
  saveModuleBuilds(newBuilds);
};

export const deleteModuleBuild = (id: string) => {
  const builds = getModuleBuilds();
  saveModuleBuilds(builds.filter(b => b.id !== id));
};
