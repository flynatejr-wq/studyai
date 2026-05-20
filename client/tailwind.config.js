export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      screens: {
        xs: "380px",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #f472b6 100%)",
        "gradient-hero":  "linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #f472b6 100%)",
      },
      boxShadow: {
        "glow-sm":  "0 0 12px rgba(99,102,241,0.2)",
        "glow":     "0 0 24px rgba(99,102,241,0.25)",
        "glow-lg":  "0 0 48px rgba(99,102,241,0.2)",
        "glow-xl":  "0 0 80px rgba(99,102,241,0.15)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      animation: {
        "float":        "float 6s ease-in-out infinite",
        "float-slow":   "float-slow 9s ease-in-out infinite",
        "float-delay":  "float 8s ease-in-out infinite 2s",
        "fire":         "fire 0.8s ease-in-out infinite",
        "shimmer":      "shimmer 1.4s ease-in-out infinite",
        "gradient":     "gradient-shift 8s ease infinite",
        "pulse-ring":   "pulse-ring 2s ease-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px) scale(1)" },
          "50%":      { transform: "translateY(-20px) scale(1.03)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%":      { transform: "translateY(-30px) rotate(5deg)" },
        },
        fire: {
          "0%, 100%": { transform: "scaleY(1) rotate(-2deg)" },
          "50%":      { transform: "scaleY(1.1) rotate(2deg)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        "pulse-ring": {
          "0%":   { boxShadow: "0 0 0 0 rgba(99,102,241,0.4)" },
          "70%":  { boxShadow: "0 0 0 10px rgba(99,102,241,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(99,102,241,0)" },
        },
      },
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "expo":   "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
