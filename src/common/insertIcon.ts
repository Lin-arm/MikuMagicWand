import { send } from '../utils/event';
import observeElement from '../utils/observeElement';
import { createBarIcon } from '../utils/createIcon';

observeElement(
  '.GkDraggableCard > div > .selector-syntax-field',
  () => {
    if (!document.querySelector('#iconBar')) {
      const selectorSyntaxField = document.querySelector(
        '.GkDraggableCard > div > .selector-syntax-field',
      )!;
      const iconBar = document.createElement('div');
      iconBar.id = 'iconBar';

      // 更换截图按钮
      const ChangeScreenshotIcon = createBarIcon('photo', '更换截图', () =>
        send('openChangeScreenshot'),
      );

      // 连接议题按钮
      const LinkToIssueIcon = createBarIcon('link', '连接议题', () => send('openLinkToIssue'));

      // 跳转连接议题按钮
      const JumpLinkedIssueIcon = createBarIcon('arrow_outward', '跳转连接议题', () =>
        send('openJumpLinkedIssue'),
      );

      // 在 VSCode 中打开按钮
      const OpenVscodeIcon = createBarIcon('open_in_new', '在 VSCode 中打开', () =>
        send('openVscode'),
      );

      // AI 辅助按钮
      const AIAssistIcon = createBarIcon('text_snippet', 'AI 辅助', () => send('openAIAssist'));

      // 设置按钮
      const SettingsIcon = createBarIcon('settings', '脚本设置', () => send('openSettings'));

      // 统计按钮
      const CountIcon = createBarIcon('bar_chart', '统计', () => send('openCount'));

      // 帮助按钮
      const HelpIcon = createBarIcon('help', '帮助', () => send('openHelp'));

      // 捐赠按钮
      const SponsorIcon = createBarIcon('coffee', '捐赠', () => {
        window.open('https://afdian.com/a/Adpro');
      });

      iconBar.append(
        ChangeScreenshotIcon,
        LinkToIssueIcon,
        JumpLinkedIssueIcon,
        OpenVscodeIcon,
        AIAssistIcon,
        SettingsIcon,
        CountIcon,
        HelpIcon,
        SponsorIcon,
      );
      selectorSyntaxField.insertAdjacentElement('beforebegin', iconBar);
    }
  },
  true,
);
