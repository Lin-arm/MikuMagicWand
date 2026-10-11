import { z } from 'zod';

const inspectSettings = z.object({
  autoUploadImport: z.boolean(),
  ignoreUploadWarn: z.boolean(),
  maxShowNodeSize: z.number(),
  themeMode: z.enum(['light', 'dark', 'system']),
});
export type IInspectSettings = z.infer<typeof inspectSettings>;

export default inspectSettings;
