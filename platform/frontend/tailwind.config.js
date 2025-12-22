/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // ================================
      // 高端简约现代艺术画廊风格配色
      // ================================
      colors: {
        // 核心色调 - 画廊色板
        'pure-white': '#FFFFFF',
        'off-white': '#FAFAFA',
        'gallery-gray': '#F5F5F5',
        'silk-gray': '#E8E8E8',
        'mist-gray': '#D4D4D4',
        'stone-gray': '#9CA3AF',
        'charcoal': '#4B5563',
        'ink-black': '#1F2937',
        'deep-black': '#111827',
        
        // 点缀色 - 奢华金属
        'champagne-gold': '#C9A962',
        'rose-gold': '#B76E79',
        'platinum': '#A8A9AD',
        'copper': '#B87333',
        
        // 功能色（极度克制使用）
        'success': '#2D5A27',
        'success-light': '#E8F5E8',
        'warning': '#92400E',
        'error': '#8B4049',
        'info': '#5B7C99',
      },
      
      // ================================
      // 字体系统
      // ================================
      fontFamily: {
        // 英文/数字：画廊感衬线字体
        'display': ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        // 中文：思源宋体
        'serif-cn': ['"Noto Serif SC"', '"Source Han Serif SC"', '"STSong"', 'serif'],
        // UI 辅助：无衬线
        'sans': ['"Inter"', '"SF Pro Text"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      
      // ================================
      // 字号层级
      // ================================
      fontSize: {
        'display-xl': ['32px', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '400' }],
        'display-lg': ['28px', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '400' }],
        'display-md': ['24px', { lineHeight: '1.3', letterSpacing: '0.05em', fontWeight: '400' }],
        'title': ['20px', { lineHeight: '1.3', letterSpacing: '0.05em', fontWeight: '500' }],
        'subtitle': ['16px', { lineHeight: '1.4', letterSpacing: '0.03em', fontWeight: '400' }],
        'body': ['14px', { lineHeight: '1.7', letterSpacing: '0.02em', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.5', letterSpacing: '0.02em', fontWeight: '400' }],
        'tiny': ['10px', { lineHeight: '1.4', letterSpacing: '0.03em', fontWeight: '400' }],
      },
      
      // ================================
      // 圆角 - 近乎直角的画廊感
      // ================================
      borderRadius: {
        'none': '0',
        'gallery': '2px',
        'card': '4px',
        'soft': '6px',
        'button': '2px',
      },
      
      // ================================
      // 阴影 - 微妙层次
      // ================================
      boxShadow: {
        'subtle': '0 1px 3px rgba(0, 0, 0, 0.04)',
        'soft': '0 4px 12px rgba(0, 0, 0, 0.05)',
        'elevated': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'gold': '0 4px 16px rgba(201, 169, 98, 0.2)',
      },
      
      // ================================
      // 间距系统
      // ================================
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
        'safe': '24px',
        'nav': '56px',
      },
      
      // ================================
      // 边框宽度
      // ================================
      borderWidth: {
        'hairline': '0.5px',
        'thin': '1px',
      },
      
      // ================================
      // 动画
      // ================================
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'fade-in-scale': 'fadeInScale 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'breathe': 'breathe 4s ease-in-out infinite',
        'subtle-pulse': 'subtlePulse 2s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.4' },
          '50%': { transform: 'scale(1.05)', opacity: '0.7' },
        },
        subtlePulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
      },
      
      // ================================
      // 过渡时间
      // ================================
      transitionDuration: {
        'elegant': '400ms',
        'subtle': '250ms',
        'quick': '150ms',
      },
      transitionTimingFunction: {
        'elegant': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
      
      // ================================
      // 最大宽度
      // ================================
      maxWidth: {
        'mobile': '414px',
        'content': '640px',
      },
    },
  },
  plugins: [],
};
