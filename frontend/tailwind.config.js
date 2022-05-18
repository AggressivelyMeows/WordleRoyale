const defaultTheme = require('tailwindcss/defaultTheme')
const colors = require('tailwindcss/colors')

/** @type {import("@types/tailwindcss/tailwind-config").TailwindConfig } */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: colors.neutral,
        'primary': {
          DEFAULT: '#D90429',
          '50': '#FD98A9',
          '100': '#FD8399',
          '200': '#FC5B77',
          '300': '#FB3356',
          '400': '#FB0B35',
          '500': '#D90429',
          '600': '#A2031F',
          '700': '#6B0214',
          '800': '#34010A',
          '900': '#000000'
        },
      },
      fontFamily: {
        sans: ['"Inter var"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/line-clamp'),
    require('@tailwindcss/aspect-ratio'),
    require("a17t")
  ],
}
