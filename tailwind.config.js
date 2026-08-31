/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b5bfd",
          600: "#2f47db",
          700: "#2536b0",
          900: "#101a4a",
        },
      },
    },
  },
  plugins: [],
}

