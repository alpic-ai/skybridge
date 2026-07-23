/** @type {import('@ladle/react').UserConfig} */
export default {
  stories: "src/**/*.stories.{ts,tsx}",
  viteConfig: ".ladle/vite.config.ts",
  addons: {
    theme: {
      enabled: true,
      defaultState: "light",
    },
  },
};
