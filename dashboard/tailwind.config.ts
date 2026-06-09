import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          main: "#0a0b0d",
          surface: "#121418",
          elevated: "#1a1d24",
          card: "#181A20",
          hover: "#242830",
        },
        accent: {
          cyan: "#00e5ff",
          purple: "#9d4edd",
        },
        crypto: {
          green: "#00e676",
          red: "#ff1744",
        },
        status: {
          offline: "#64748b",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#A0A8B4",
          muted: "#5E6673",
          dim: "#3A3E45",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          subtle: "rgba(255, 255, 255, 0.05)",
          glow: "rgba(0, 229, 255, 0.15)",
          light: "rgba(255, 255, 255, 0.1)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        "neon-cyan": "0 0 12px rgba(0, 229, 255, 0.15)",
        "neon-purple": "0 0 12px rgba(157, 78, 221, 0.15)",
        card: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
        elevated: "0 8px 24px rgba(0,0,0,0.4)",
      },
      keyframes: {
        "pulse-green": {
          "0%": { backgroundColor: "rgba(0, 230, 118, 0.15)" },
          "100%": { backgroundColor: "transparent" },
        },
        "pulse-red": {
          "0%": { backgroundColor: "rgba(255, 23, 68, 0.15)" },
          "100%": { backgroundColor: "transparent" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0, 229, 255, 0.1)" },
          "50%": { boxShadow: "0 0 0 8px rgba(0, 229, 255, 0)" },
        },
      },
      animation: {
        "flash-up": "pulse-green 0.4s ease-out forwards",
        "flash-down": "pulse-red 0.4s ease-out forwards",
        "fade-up": "fade-up 0.35s ease forwards",
        "slide-in": "slide-in 0.3s ease forwards",
        "pulse-ring": "pulse-ring 2s infinite",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      fontSize: {
        xxs: "0.65rem",
        xs: "0.7rem",
        sm: "0.8rem",
        base: "0.875rem",
        lg: "1rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [
    function ({ addUtilities }: { addUtilities: Function }) {
      addUtilities({
        ".will-change-transform-opacity": {
          "will-change": "transform, opacity",
        },
        ".text-gradient-cyan": {
          "background": "linear-gradient(135deg, #00e5ff, #9d4edd)",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
        },
        ".bg-gradient-card": {
          "background": "linear-gradient(135deg, #121418 0%, #1a1d24 100%)",
        },
        ".border-glow-cyan": {
          "border-color": "rgba(0, 229, 255, 0.2)",
          "box-shadow": "0 0 12px rgba(0, 229, 255, 0.08)",
        },
        ".border-glow-purple": {
          "border-color": "rgba(157, 78, 221, 0.2)",
          "box-shadow": "0 0 12px rgba(157, 78, 221, 0.08)",
        },
      });
    },
  ],
};

export default config;
