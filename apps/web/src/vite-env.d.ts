/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_ISOMETRIC_CITY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
