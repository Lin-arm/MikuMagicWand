import type { RawApp, RawCategory, RawAppGroup, RawAppRule } from '@gkd-kit/api';

interface ITsOutputDepthData {
  outputDepth: 'ts';
  originRule: string;
  categories: RawCategory[];
}

interface IAppOutputDepthData {
  outputDepth: 'app';
  originRule: RawApp;
  categories: RawCategory[];
}

interface IGroupOutputDepthData {
  outputDepth: 'group';
  originRule: RawAppGroup;
  categories: RawCategory[];
}

interface IRuleOutputDepthData {
  outputDepth: 'rule';
  originRule: RawAppRule;
  categories: RawCategory[];
}

export type MainDataType = ITsOutputDepthData | IAppOutputDepthData | IGroupOutputDepthData | IRuleOutputDepthData;