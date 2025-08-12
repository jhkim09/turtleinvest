// Momentum 서비스에서 추출한 디자인 시스템
export const MomentumTheme = {
  // 🎨 컬러 팔레트
  colors: {
    // 메인 브랜드 컬러
    primary: '#5c7ee5',        // Momentum 메인 블루
    primaryLight: '#7a96ff',   // 밝은 블루
    primaryDark: '#3d5cb8',    // 어두운 블루
    
    // 액센트 컬러
    accent: '#e3454a',         // 코랄 레드
    accentLight: '#ff6b70',    // 밝은 코랄
    accentDark: '#c73237',     // 어두운 코랄
    
    // 강조 컬러
    highlight: '#ff4b59',      // 브라이트 레드
    
    // 그라데이션 컬러
    gradientStart: '#3aaab9',  // 틸
    gradientEnd: '#5a1092',    // 퍼플
    
    // 기본 컬러
    background: '#ffffff',
    surface: '#f8fafc',
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
      light: '#9ca3af'
    },
    
    // 상태 컬러 (Momentum 스타일로 조정)
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    // 보조 컬러
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827'
    }
  },
  
  // 📐 스페이싱 (Momentum 스타일)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  
  // 🔤 타이포그래피 (Momentum에서 사용하던 폰트)
  typography: {
    fontFamily: {
      primary: '"Noto Sans KR", "Segoe UI", "Malgun Gothic", sans-serif',
      secondary: '"NanumSquare", "Apple Gothic", sans-serif'
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '32px',
      '4xl': '40px'
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    }
  },
  
  // 🔘 버튼 스타일 (Momentum 디자인)
  button: {
    primary: {
      background: 'linear-gradient(135deg, #5c7ee5 0%, #3d5cb8 100%)',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      padding: '12px 24px',
      fontSize: '16px',
      fontWeight: '600',
      boxShadow: '0 4px 12px rgba(92, 126, 229, 0.3)',
      hover: {
        transform: 'translateY(-1px)',
        boxShadow: '0 6px 16px rgba(92, 126, 229, 0.4)'
      }
    },
    accent: {
      background: 'linear-gradient(135deg, #e3454a 0%, #c73237 100%)',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      padding: '12px 24px',
      fontSize: '16px',
      fontWeight: '600',
      boxShadow: '0 4px 12px rgba(227, 69, 74, 0.3)'
    },
    outline: {
      background: 'transparent',
      color: '#5c7ee5',
      border: '2px solid #5c7ee5',
      borderRadius: '8px',
      padding: '10px 22px',
      fontSize: '16px',
      fontWeight: '600'
    }
  },
  
  // 📦 카드 스타일
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(229, 231, 235, 0.5)'
  },
  
  // 🏷️ 상태 배지 (Momentum 스타일)
  badge: {
    primary: {
      background: 'rgba(92, 126, 229, 0.1)',
      color: '#3d5cb8',
      borderRadius: '20px',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: '600'
    },
    success: {
      background: 'rgba(16, 185, 129, 0.1)',
      color: '#065f46',
      borderRadius: '20px',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: '600'
    },
    warning: {
      background: 'rgba(245, 158, 11, 0.1)',
      color: '#92400e',
      borderRadius: '20px',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: '600'
    },
    error: {
      background: 'rgba(239, 68, 68, 0.1)',
      color: '#dc2626',
      borderRadius: '20px',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: '600'
    }
  },
  
  // 🌅 헤더 그라데이션 (Momentum 특화)
  gradients: {
    primary: 'linear-gradient(135deg, #5c7ee5 0%, #3d5cb8 100%)',
    accent: 'linear-gradient(135deg, #e3454a 0%, #c73237 100%)',
    tealPurple: 'linear-gradient(to bottom, #3aaab9 0%, #5a1092 100%)',
    subtle: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
  }
};

// 🎯 Momentum 스타일 컴포넌트 헬퍼
export const MomentumComponents = {
  // 통계 카드 스타일
  statsCard: (colorKey: 'primary' | 'accent' | 'success' | 'warning') => ({
    background: MomentumTheme.gradients[colorKey === 'primary' ? 'primary' : 
                                       colorKey === 'accent' ? 'accent' : 
                                       'primary'],
    borderRadius: '16px',
    padding: '24px',
    color: 'white',
    boxShadow: `0 4px 20px rgba(92, 126, 229, 0.3)`,
    transition: 'all 0.3s ease'
  }),
  
  // 헤더 스타일
  header: {
    background: MomentumTheme.gradients.primary,
    color: 'white',
    padding: '20px 30px',
    boxShadow: '0 4px 12px rgba(92, 126, 229, 0.2)'
  },
  
  // 탭 스타일 (Momentum 스타일)
  tab: (isActive: boolean) => ({
    flex: 1,
    padding: '15px 20px',
    border: 'none',
    borderRadius: '8px',
    background: isActive ? MomentumTheme.gradients.primary : 'transparent',
    color: isActive ? 'white' : MomentumTheme.colors.text.secondary,
    fontSize: '16px',
    fontWeight: isActive ? '600' : '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: MomentumTheme.typography.fontFamily.primary
  })
};