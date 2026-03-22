import { defineConfig } from 'father';

export default defineConfig({
  esm: {
    output: "dist",
    transformer:"babel"
  },
  cjs: {
    output: "dist",
    transformer:"babel"
  }
});
