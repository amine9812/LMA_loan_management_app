module.exports = {
  content: ["./src/renderer/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        ink: "#101820",
        mist: "#F5F7FA",
        slate: "#475569",
        accent: "#0F766E",
        ember: "#EA580C"
      },
      fontFamily: {
        display: ["IBM Plex Serif", "serif"],
        sans: ["IBM Plex Sans", "sans-serif"]
      },
      boxShadow: {
        soft: "0 12px 30px rgba(16, 24, 40, 0.08)"
      }
    }
  },
  plugins: []
};
