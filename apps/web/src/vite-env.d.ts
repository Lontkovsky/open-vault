/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IDENTITY_ORIGIN: string;
  readonly VITE_BALLOT_ORIGIN: string;
  readonly VITE_MANAGEMENT_ORIGIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
