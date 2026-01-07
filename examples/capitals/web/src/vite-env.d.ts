/// <reference types="vite/client" />

declare module "vite/client" {
  interface ImportMetaEnv {
    readonly VITE_MAPBOX_PUBLIC_TOKEN: string;
  }
}
