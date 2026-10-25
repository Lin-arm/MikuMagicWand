import { type TextField, snackbar } from 'mdui';
import json5 from 'json5';
import type { RawAppRule } from '@gkd-kit/api';

export default () => {
  const key = (document.querySelector('#key') as TextField).value;
  const origin: RawAppRule = json5.parse(window.Hanashiro.originRule);

  if (key) {
    origin.key = Number(key);

    window.Hanashiro.originRule = json5.stringify(origin, null, 2);

    snackbar({
      message: 'key 值修改成功！',
      placement: 'top',
    });
  }
};
