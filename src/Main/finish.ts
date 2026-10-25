import json5 from 'json5';
import type { Switch, TextField, Button } from 'mdui';
import type { RawApp, IArray, RawAppRule, RawAppGroup } from '@gkd-kit/api';
import iArrayToArray from '../utils/iArrayToArray';
import { send } from '../utils/event';
import type { MainDataType } from '../types/output';

export default async (element: Button, data: MainDataType) => {
  const ruleName = (document.querySelector('#ruleName') as TextField).value;
  const category = window.Hanashiro.currentCategory;
  const isNoExample = (document.querySelector('#noExample') as Switch).checked;
  const origin = data.originRule as RawApp | RawAppGroup;

  if (ruleName) {
    if (data.outputDepth === 'app') (origin as RawApp).groups[0].name = ruleName;
    else (origin as RawAppGroup).name = ruleName;
  } else {
    if (data.outputDepth === 'app') (origin as RawApp).groups[0].name = '';
    else (origin as RawAppGroup).name = '';
  }

  if (category) {
    if (!ruleName) {
      if (data.outputDepth === 'app') (origin as RawApp).groups[0].name = category;
      else (origin as RawAppGroup).name = category;
    } else {
      if (data.outputDepth === 'app')
        (origin as RawApp).groups[0].name = `${category}-${(origin as RawApp).groups[0].name}`;
      else (origin as RawAppGroup).name = `${category}-${origin.name}`;
    }
  }

  if (isNoExample) {
    const rule =
      data.outputDepth === 'app'
        ? iArrayToArray((origin as RawApp).groups[0].rules as IArray<RawAppRule>)[0]
        : iArrayToArray((origin as RawAppGroup).rules as IArray<RawAppRule>)[0];
    delete rule.exampleUrls;

    if (data.outputDepth === 'app') (origin as RawApp).groups[0].rules = [rule];
    else (origin as RawAppGroup).rules = [rule];
  }

  window.Hanashiro.returnResult = json5.stringify(origin, null, 2);

  send('closePage');
  send('modifyEnd');

  if (element.id === 'ok_open') send('openVscode');
  else if (element.id === 'ok_open_append') send('openVscodeAppend');
};
