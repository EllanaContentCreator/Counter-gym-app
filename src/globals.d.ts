/** Build stamp injected by Vite, shown in Me → About. */
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  /** Address of the sheet reader, baked in at build time so the group needs no setup. */
  readonly VITE_READER_URL?: string;
  /** Shared passcode for that reader, baked in alongside it. */
  readonly VITE_READER_PASSCODE?: string;
  readonly VITE_SINGLE_FILE?: string;
  readonly BASE_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
