/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_PROXY_URL: string
  readonly VITE_ANNOTATION_PHASE: string
  readonly VITE_APP_MODE: 'office' | 'field'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
