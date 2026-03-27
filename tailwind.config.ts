import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Sattvic Design System
        saffron:    '#E8793A',
        turmeric:   '#F5A623',
        lotus:      '#C2546E',
        leaf:       '#4A7C59',
        protein:    '#5B8DD9',
        cream:      '#FDF6EC',
        'warm-white':'#FFFDF8',
        charcoal:   '#2C2416',
        mid:        '#6B5B45',
        light:      '#C9B99A',
        'fast-bg':  '#F3EAF7',
        'fast-border':'#9B6BB5',
      },
      borderRadius: {
        card: '14px',
        pill: '50px',
        input: '10px',
      },
      boxShadow: {
        card: '0 2px 16px rgba(44,36,22,0.10)',
        modal: '0 8px 40px rgba(0,0,0,0.20)',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
