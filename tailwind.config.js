/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: { 50:'#f4f6f2',100:'#e6ece3',200:'#cdd9c7',300:'#aebfa6',400:'#8aa381',500:'#6b8763',600:'#536b4e',700:'#43563f',800:'#384635',900:'#2f3a2d' },
        cream: '#FAF7F0',
        gold: { DEFAULT:'#C9A96A', light:'#E8D9B8', dark:'#9A7F45' },
      },
      fontFamily: {
        script: ['"Great Vibes"','cursive'],
        serif: ['"Cormorant Garamond"','serif'],
        sans: ['"Jost"','system-ui','sans-serif'],
      },
    },
  },
  plugins: [],
}
