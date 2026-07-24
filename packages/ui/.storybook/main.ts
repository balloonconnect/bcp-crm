import type { StorybookConfig } from "@storybook/react-vite";
import path from "node:path";

/**
 * Component preview environment for @bcp/ui. Every app in the monorepo
 * consumes this package, so this Storybook instance is the single source
 * of truth for how a component looks/behaves across breakpoints and
 * themes before it ships anywhere.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-viewport",
    "@storybook/addon-a11y",
    "@chromatic-com/storybook",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  viteFinal: async (viteConfig) => {
    viteConfig.resolve = viteConfig.resolve ?? {};
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias ?? {}),
      "@bcp/ui": path.resolve(__dirname, "../src"),
    };
    return viteConfig;
  },
  docs: {
    autodocs: "tag",
  },
};

export default config;
