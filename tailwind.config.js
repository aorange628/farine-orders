/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs de la charte FARINE
        farine: {
          green: {
            DEFAULT: '#4A7C59',
            light: '#5A9C69',
            dark: '#3A5C49',
          },
          beige: {
            DEFAULT: '#F5F1E8',
            light: '#FFFDF8',
            dark: '#E5E1D8',
          },
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
