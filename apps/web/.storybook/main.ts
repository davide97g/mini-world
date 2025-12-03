import type { StorybookConfig } from "@storybook/react-vite";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): string {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    getAbsolutePath("@chromatic-com/storybook"),
    getAbsolutePath("@storybook/addon-vitest"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-onboarding"),
  ],
  framework: getAbsolutePath("@storybook/react-vite"),
  viteFinal: async (config) => {
    // Ensure path aliases work in Storybook
    const storybookDir = dirname(fileURLToPath(import.meta.url));
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@": join(storybookDir, "../src"),
      };
    }

    // Ensure PostCSS with Tailwind CSS v4 is configured
    // Use object format to match postcss.config.js
    config.css = {
      ...config.css,
      postcss: {
        plugins: {
          "@tailwindcss/postcss": {},
          autoprefixer: {},
        },
      },
    };

    return config;
  },
  staticDirs: ["../public"],
};
export default config;
