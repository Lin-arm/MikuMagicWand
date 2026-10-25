export default (): 'ts' | 'app' | 'group' | 'rule' | null => {
  const selectElement = document.querySelector(
    'div.n-select:has(div.n-base-selection-input:is([title="应用配置"],[title="规则组"],[title="单条规则"],[title="TypeScript 文件"]))',
  )! as HTMLDivElement;
  const vueNode = selectElement.__VUE__?.find((node) => node.vnode.props && node.vnode.props.value);

  if (!vueNode) return null;
  else return vueNode.vnode.props!.value as 'ts' | 'app' | 'group' | 'rule';
};
