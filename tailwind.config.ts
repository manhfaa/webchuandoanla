import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        paper: "var(--paper)",
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          soft: "var(--surface-soft)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          50: "var(--canvas)",
          100: "var(--surface-soft)",
          300: "var(--line)",
          400: "var(--ink-soft)",
          500: "var(--ink-soft)",
          700: "var(--ink)",
          800: "var(--ink)",
          900: "var(--ink)",
          950: "var(--ink)",
        },
        line: "var(--line)",
        forest: "var(--forest)",
        "on-forest": "var(--on-forest)",
        "on-forest-muted": "var(--on-forest-muted)",
        "on-leaf": "var(--on-leaf)",
        "on-danger": "var(--on-danger)",
        leaf: {
          DEFAULT: "var(--leaf)",
          strong: "var(--leaf-strong)",
          50: "color-mix(in srgb, var(--mint) 34%, var(--surface))",
          100: "color-mix(in srgb, var(--mint) 62%, var(--surface))",
          200: "var(--mint)",
          300: "color-mix(in srgb, var(--leaf) 54%, var(--mint))",
          400: "color-mix(in srgb, var(--leaf) 78%, var(--mint))",
          500: "var(--leaf)",
          600: "var(--leaf-strong)",
          700: "var(--leaf-strong)",
          800: "var(--forest)",
          900: "var(--forest)",
          950: "var(--canvas)",
        },
        mint: "var(--mint)",
        sun: "var(--sun)",
        soil: "var(--soil)",
        danger: "var(--danger)",
        info: "var(--info)",

        // Legacy colors mapped to new tokens for gradual migration
        app: {
          DEFAULT: "var(--canvas)",
          surface: "var(--surface)",
          "surface-2": "var(--surface-soft)",
        },
        "on-dark": "var(--ink)",
        "on-dark-strong": "var(--ink)",
        "muted-on-dark": "var(--ink-soft)",
        "border-dark": "var(--line)",
        "border-light": "var(--line)",
        brand: {
          50: "var(--mint)",
          100: "var(--mint)",
          200: "var(--mint)",
          300: "color-mix(in srgb, var(--leaf) 54%, var(--mint))",
          400: "color-mix(in srgb, var(--leaf) 78%, var(--mint))",
          500: "var(--leaf)",
          600: "var(--leaf-strong)",
          700: "var(--leaf-strong)",
          800: "var(--forest)",
          900: "var(--forest)",
        },
      },
      fontSize: {
        display: ["44px", { lineHeight: "1.1", fontWeight: "700" }],
        h1: ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["18px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        body: ["14px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "500" }],
        overline: ["11px", { lineHeight: "1.2", fontWeight: "600" }],
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        "2xl": "var(--r-2xl)",
        full: "var(--r-pill)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        glow: "var(--shadow-glow)",
        soft: "var(--shadow-md)",
        panel: "var(--shadow-md)",
        float: "var(--shadow-lg)",
      },
      maxHeight: {
        section: "720px",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-3px)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.85" },
          "70%": { transform: "scale(1.08)", opacity: "0.18" },
          "100%": { transform: "scale(1.12)", opacity: "0" },
        },
        barGrow: {
          from: { width: "0%" },
          to: { width: "var(--bar-target, 100%)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulseRing: "pulseRing 2.4s ease-out infinite",
        "bar-grow": "barGrow 0.9s ease-out forwards",
      },
      backgroundImage: {
        mesh: "radial-gradient(circle at top left, rgba(35, 133, 84, 0.08), transparent 40%), linear-gradient(180deg, var(--canvas) 0%, var(--surface) 100%)",
        "dashboard-mesh":
          "radial-gradient(circle at 20% 0%, rgba(35, 133, 84, 0.08), transparent 42%), radial-gradient(circle at 90% 10%, rgba(35, 133, 84, 0.05), transparent 35%), linear-gradient(180deg, var(--canvas) 0%, var(--surface-soft) 100%)",
        "hero-radial":
          "radial-gradient(ellipse 80% 60% at 70% 20%, rgba(35, 133, 84, 0.1), transparent 55%)",
      },
      fontFamily: {
        display: ["var(--font-be-vietnam)", "system-ui", "sans-serif"],
        sans: ["var(--font-be-vietnam)", "system-ui", "sans-serif"],
      },
      transitionDuration: {
        150: "150ms",
        180: "180ms",
        200: "200ms",
        260: "260ms",
        80: "80ms",
      },
      ringOffsetColor: {
        canvas: "var(--canvas)",
      },
    },
  },
  plugins: [],
};

export default config;
