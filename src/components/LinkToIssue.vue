<script lang="ts">
import { defineComponent } from 'vue';
import { prompt, snackbar } from 'mdui';
import { send } from '../utils/event';
import getSnapshotId from '../utils/getSnapshotId';
import { getSnapshotInfo, writeSnapshotInfo } from '../utils/indexedDB';

export default defineComponent({
  methods: {
    async linkIssue(link: string) {
      const snapshotId = await getSnapshotId();
      const snapshotInfo = (await getSnapshotInfo(snapshotId))!;

      if (!link && snapshotInfo.linkedIssue) {
        delete snapshotInfo.linkedIssue;
        await writeSnapshotInfo(snapshotId, snapshotInfo);

        snackbar({
          message: '已移除已连接的议题！',
          placement: 'top',
        });

        send('closePage');
        return;
      }

      const splitedPathname = new URL(link).pathname.split('/');
      const numberWithRepo = `${splitedPathname[1]}/${splitedPathname[2]}#${splitedPathname[4]}`;

      snapshotInfo.linkedIssue = numberWithRepo;

      await writeSnapshotInfo(snapshotId, snapshotInfo);

      snackbar({
        message: `已连接当前快照至 ${numberWithRepo}！`,
        placement: 'top',
      });

      send('closePage');
    },
    cancel() {
      send('closePage');
    },
  },
  async mounted() {
    prompt({
      headline: '请输入 Issue 链接',
      description: '仅接受 Github Issue 链接，留空删除',
      confirmText: '确认',
      cancelText: '取消',
      onConfirm: (value) => this.linkIssue(value),
      onCancel: this.cancel,
    });
  },
});
</script>
