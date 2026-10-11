import json5 from 'json5';
import type { IInspectSettings } from '../types/inspectSettings';

export const getInspectSettings = (): IInspectSettings | null => {
  const inspectSettings = localStorage.getItem('settings');

  if(inspectSettings) return json5.parse<IInspectSettings>(inspectSettings);
  else return null;
};

export const setInspectSettings = (newSettings: IInspectSettings) => {
  localStorage.setItem('settings', JSON.stringify(newSettings));
};