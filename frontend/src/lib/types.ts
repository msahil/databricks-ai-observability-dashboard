export type Platform = 'databricks' | 'newrelic' | 'servicenow';

export interface HeroScenario {
  id: 'a' | 'b' | 'c';
  title: string;
  theme: string;
  keyMessage: string;
  incidentNumber: string;
  changeNumber?: string;
  priority: string;
  durationMin: number;
  regions: string[];
  platformVisibility: Record<Platform, boolean>;
  acts?: { label: string; steps: number[] }[];
}

export interface ScenarioStepMeta {
  step: number;
  platform: Platform;
  title: string;
}
