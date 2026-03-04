import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#050816",
        surface: "rgba(15, 23, 42, 0.8)"
      },
      borderRadius: {
        glass: "24px"
      },
      boxShadow: {
        glass: "0 10px 40px rgba(15,23,42,0.65)"
      }
    }
  },
  plugins: []
};

export default config;

