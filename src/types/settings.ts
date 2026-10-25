import type { RawCategory } from '@gkd-kit/api';

export interface ISettings {
  categories: RawCategory[];
  hideLoadSnackbar: boolean;
  simplyName: boolean;
  readClipboard: boolean;
  vidAdaption: boolean;
}
