/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          900: "#0b0d12",
          800: "#11141b",
          700: "#161a23",
          600: "#1d2230",
          500: "#262c3c",
        },
        edge: {
          DEFAULT: "#232838",
          soft: "#1a1f2b",
        },
        accent: {
          DEFAULT: "#7c5cff",
          hover: "#6a48ff",
          soft: "#2a2348",
        },
        ink: {
          DEFAULT: "#e6e8ee",
          muted: "#9aa0ad",
          faint: "#5f6675",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', '"SF Mono"', "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
