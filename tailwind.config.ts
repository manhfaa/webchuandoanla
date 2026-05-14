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
        leaf: {
          50: "var(--leaf-50)",
          100: "var(--leaf-100)",
          200: "var(--leaf-200)",
          300: "var(--leaf-300)",
          400: "var(--leaf-400)",
          500: "var(--leaf-500)",
          600: "var(--leaf-600)",
          700: "var(--leaf-700)",
          800: "var(--leaf-800)",
          900: "var(--leaf-900)",
          950: "var(--leaf-950)",
        },
        ink: {
          DEFAULT: "var(--ink-900)",
          50: "var(--ink-50)",
          100: "var(--ink-100)",
          300: "var(--ink-300)",
          500: "var(--ink-500)",
          700: "var(--ink-700)",
          900: "var(--ink-900)",
        },
        app: {
          DEFAULT: "var(--bg-app)",
          surface: "var(--bg-surface)",
          "surface-2": "var(--bg-surface-2)",
        },
        surface: {
          DEFAULT: "var(--bg-surface)",
          2: "var(--bg-surface-2)",
        },
        "on-dark": "var(--text-on-dark)",
        "on-dark-strong": "var(--text-strong)",
        "muted-on-dark": "var(--text-muted-on-dark)",
        "border-dark": "var(--border-dark)",
        "border-light": "var(--border-light)",
        earth: {
          100: "var(--earth-100)",
          300: "var(--earth-300)",
          500: "var(--earth-500)",
        },
        sun: {
          100: "var(--sun-100)",
          400: "var(--sun-400)",
          600: "var(--sun-600)",
        },
        berry: {
          300: "var(--berry-300)",
          500: "var(--berry-500)",
        },
        /* Legacy `brand` maps to leaf for gradual migration */
        brand: {
          50: "var(--leaf-50)",
          100: "var(--leaf-100)",
          200: "var(--leaf-200)",
          300: "var(--leaf-300)",
          400: "var(--leaf-400)",
          500: "var(--leaf-500)",
          600: "var(--leaf-600)",
          700: "var(--leaf-700)",
          800: "var(--leaf-800)",
          900: "var(--leaf-900)",
        },
      },
      fontSize: {
        display: ["44px", { lineHeight: "1.1", fontWeight: "700" }],
        h1: ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["18px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        body: ["14px", { lineHeight: "1.55", fontWeight: "400" }],
        "body-sm": ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "500" }],
        overline: ["11px", { lineHeight: "1.2", fontWeight: "600" }],
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
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
          "50%": { transform: "translateY(-10px)" },
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
        mesh: "radial-gradient(circle at top left, rgba(143, 216, 166, 0.35), transparent 40%), linear-gradient(180deg, var(--ink-50) 0%, var(--leaf-50) 100%)",
        "dashboard-mesh":
          "radial-gradient(circle at 20% 0%, rgba(47, 166, 100, 0.12), transparent 42%), radial-gradient(circle at 90% 10%, rgba(47, 166, 100, 0.08), transparent 35%), linear-gradient(180deg, var(--bg-app) 0%, var(--leaf-950) 100%)",
        "hero-radial":
          "radial-gradient(ellipse 80% 60% at 70% 20%, rgba(47, 166, 100, 0.14), transparent 55%)",
      },
      fontFamily: {
        display: ["var(--font-be-vietnam)", "system-ui", "sans-serif"],
        sans: ["var(--font-be-vietnam)", "system-ui", "sans-serif"],
      },
      transitionDuration: {
        150: "150ms",
        200: "200ms",
        80: "80ms",
      },
      ringOffsetColor: {
        app: "var(--bg-app)",
      },
    },
  },
  plugins: [],
};

export default config;
