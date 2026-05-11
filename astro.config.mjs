import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: 'https://www.mmseo.co.uk',

  integrations: [
    tailwind({ applyBaseStyles: false }),
  ],

  output: "hybrid",
  adapter: cloudflare()
});