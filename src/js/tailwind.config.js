tailwind.config = {
  theme: {
    extend: {
      colors: {
        dark: '#0b0e11',
        accent: '#00ffa3',
        accent2: '#ff007c',
        muted: '#3a3a3a'
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif']
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0%)' },
          to: { transform: 'translateX(-50%)' }
        },
        spinSlow: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' }
        }
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
        spinSlow: 'spinSlow 60s linear infinite'
      }
    }
  }
};
