import json5 from 'json5';
import type { Switch, TextField, Button } from 'mdui';
import type { RawApp, IArray, RawAppRule } from '@gkd-kit/api';
import iArrayToArray from '../utils/iArrayToArray';
import { send } from '../utils/event';

export default async (element: Button) => {
  const ruleName = (document.querySelector('#ruleName') as TextField).value;
  const category = window.Hanashiro.currentCategory;
  const isNoExample = (document.querySelector('#noExample') as Switch).checked;
  const origin: RawApp = json5.parse(window.Hanashiro.originRule);

  if (ruleName) origin.groups[0].name = ruleName;
  else origin.groups[0].name = '';

  if (category) {
    if (!ruleName) origin.groups[0].name = category;
    else origin.groups[0].name = `${category}-${origin.groups[0].name}`;

    if (category == '开屏广告') {
      origin.groups[0].priorityTime = 10000;
      const rule = iArrayToArray(origin.groups[0].rules as IArray<RawAppRule>)[0];
      delete rule.activityIds;
      origin.groups[0].rules = [rule];
    }
  }

  if (isNoExample) {
    const rule = iArrayToArray(origin.groups[0].rules as IArray<RawAppRule>)[0];
    delete rule.exampleUrls;
    origin.groups[0].rules = [rule];
  }

  window.Hanashiro.returnResult = json5.stringify(origin, null, 2);

  send('closePage');
  send('modifyEnd');

  if (element.id === 'ok_open') send('openVscode');
  else if (element.id === 'ok_open_append') send('openVscodeAppend');
};
