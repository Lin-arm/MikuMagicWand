<script lang="ts">
import { defineComponent } from 'vue';
import { snackbar } from 'mdui';
import { send } from '../utils/event';
import getSnapshotId from '../utils/getSnapshotId';
import { getSnapshotInfo } from '../utils/indexedDB';

export default defineComponent({
  methods: {
    async jumpLinkedIssue() {
      const snapshotId = await getSnapshotId();
      const snapshotInfo = (await getSnapshotInfo(snapshotId))!;

      if (snapshotInfo.linkedIssue) {
        const paths = snapshotInfo.linkedIssue.split('#');
        const url = `https://github.com/${paths[0]}/issues/${paths[1]}`;
        window.open(url);
      } else
        snackbar({
          message: '当前快照未连接至议题！',
          placement: 'top',
        });

      send('closePage');
    },
  },
  async mounted() {
    this.jumpLinkedIssue();
  },
});
</script>
