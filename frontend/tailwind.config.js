/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          primary: '#2563EB',
          secondary: '#059669',
          danger: '#dc2626',
          text: '#0f172a',
          muted: '#64748b'
        }
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
