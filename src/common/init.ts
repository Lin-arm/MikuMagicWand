import { snackbar } from 'mdui';
import { encode } from 'js-base64';
import { getHanashiroSettings, setHanashiroSettings, getSnapshotInfo } from '../utils/indexedDB';
import { getInspectSettings, setInspectSettings } from '../utils/inspectSettings';
import { receive } from '../utils/event';
import getSnapshotId from '../utils/getSnapshotId';
import type { ICount } from '../types/count';

Object.defineProperty(window, 'Hanashiro', {
  value: {},
  writable: true,
});

if (!getInspectSettings())
  setInspectSettings({
    autoUploadImport: false,
    ignoreUploadWarn: false,
    maxShowNodeSize: 2000,
    themeMode: 'system',
  });

if (!(await getHanashiroSettings<ICount>('count')))
  await setHanashiroSettings<ICount>('count', {
    rejectRules: 0,
    loaded: 0,
  });

const count = (await getHanashiroSettings<ICount>('count'))!;
count.loaded++;
await setHanashiroSettings<ICount>('count', count);

receive('openVscode', async () => {
  const packageName = (await getSnapshotInfo(await getSnapshotId()))?.appId;

  window.location.href = `vscode://tianfangyetan.gkd-toolkit/open?app=${packageName}`;
});
receive('openVscodeAppend', async () => {
  const packageName = (await getSnapshotInfo(await getSnapshotId()))?.appId;

  receive(
    'ruleWriteClipboardDone',
    () => {
      window.location.href = `vscode://tianfangyetan.gkd-toolkit/append?app=${packageName}&payload=${encode(window.Hanashiro.returnResult, true)}`;
    },
    true,
  );
});

if (!(await getHanashiroSettings<boolean>('hideLoadSnackbar'))) {
  snackbar({
    message: '世界第一公主殿下已经降下魔法~',
    autoCloseDelay: 2000,
    placement: 'top',
  });
}
