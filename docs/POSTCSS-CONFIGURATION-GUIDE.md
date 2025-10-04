# PostCSS Configuration Guide

## Issue

When deploying to Vercel, the build was failing with the error:
```
postcssConfig?.plugins.slice is not a function
```

This occurred because of an incorrect PostCSS configuration in `vite.config.js`.

## Solution

We identified and fixed three key issues in the PostCSS configuration:

### 1. Plugin Format
The plugins were initially configured as an object:
```js
plugins: {
  tailwindcss: {},
  autoprefixer: {},
}
```

This was incorrect as Vite expects an array of plugin functions, not an object.

### 2. Module Import System
We were using `require()` in an ES module file (which uses `import` syntax). This caused compatibility issues in the build environment.

### 3. Correct Tailwind CSS Package
The error message indicated:
```
It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. The PostCSS plugin has moved to a separate package, so to continue using Tailwind CSS with PostCSS you'll need to install `@tailwindcss/postcss` and update your PostCSS configuration.
```

## Final Configuration

The corrected `vite.config.js` configuration:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  // ... other configuration
})
```

## Key Takeaways

1. Always use `@tailwindcss/postcss` (not `tailwindcss`) when configuring Tailwind as a PostCSS plugin
2. PostCSS plugins in Vite should be an array of imported plugin functions
3. Maintain consistency between module systems (use `import` with ES modules, not `require`)
4. The `@tailwindcss/postcss` package is the official way to integrate Tailwind CSS with PostCSS-based build tools