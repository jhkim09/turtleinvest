import React from 'react';

// Momentum Theme 색상 (임시로 inline 정의)
const colors = {
  text: {
    primary: '#1f2937',
    secondary: '#6b7280'
  }
};

interface DonutChartData {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartData[];
  width?: number;
  height?: number;
  centerText?: string;
  centerValue?: string;
  title?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({ 
  data, 
  width = 200, 
  height = 200, 
  centerText = '', 
  centerValue = '',
  title = ''
}) => {
  const radius = Math.min(width, height) / 2 - 20;
  const innerRadius = radius * 0.6;
  const centerX = width / 2;
  const centerY = height / 2;

  // 총합 계산
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div style={{ 
        width, 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        color: '#9ca3af',
        fontSize: '14px'
      }}>
        {title && <div style={{ fontWeight: '600', marginBottom: '8px' }}>{title}</div>}
        <div>데이터가 없습니다</div>
      </div>
    );
  }

  // 각 섹션의 각도 계산
  let currentAngle = -90; // 12시 방향부터 시작
  const sections = data.map(item => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    // SVG 경로 계산
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const largeArcFlag = angle >= 360 ? 1 : angle > 180 ? 1 : 0;
    
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    // 360도(완전한 원)인 경우 미세하게 조정
    const adjustedEndAngleRad = angle >= 359 ? endAngleRad - 0.01 : endAngleRad;
    const x2 = centerX + radius * Math.cos(adjustedEndAngleRad);
    const y2 = centerY + radius * Math.sin(adjustedEndAngleRad);
    
    const x3 = centerX + innerRadius * Math.cos(startAngleRad);
    const y3 = centerY + innerRadius * Math.sin(startAngleRad);
    const x4 = centerX + innerRadius * Math.cos(adjustedEndAngleRad);
    const y4 = centerY + innerRadius * Math.sin(adjustedEndAngleRad);
    
    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${x4} ${y4}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x3} ${y3}`,
      'Z'
    ].join(' ');
    
    currentAngle = endAngle;
    
    return {
      ...item,
      percentage,
      pathData,
      startAngle,
      endAngle
    };
  });

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      padding: '16px'
    }}>
      {title && (
        <h3 style={{ 
          margin: '0 0 16px 0', 
          color: colors.text.primary,
          fontSize: '16px',
          fontWeight: '600'
        }}>
          {title}
        </h3>
      )}
      
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <svg width={width} height={height}>
          {/* 도넛 섹션들 */}
          {sections.map((section, index) => (
            <path
              key={index}
              d={section.pathData}
              fill={section.color}
              stroke="white"
              strokeWidth="2"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                transition: 'all 0.3s ease'
              }}
              className="donut-section"
            />
          ))}
          
          {/* 중앙 텍스트 */}
          <text
            x={centerX}
            y={centerY - 8}
            textAnchor="middle"
            style={{
              fontSize: '24px',
              fontWeight: '700',
              fill: colors.text.primary
            }}
          >
            {centerValue}
          </text>
          
          <text
            x={centerX}
            y={centerY + 12}
            textAnchor="middle"
            style={{
              fontSize: '12px',
              fill: colors.text.secondary
            }}
          >
            {centerText}
          </text>
        </svg>
        
        {/* 호버 효과를 위한 CSS */}
        <style>{`
          .donut-section:hover {
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2)) brightness(1.1);
            transform: scale(1.02);
            transform-origin: ${centerX}px ${centerY}px;
          }
        `}</style>
      </div>
      
      {/* 범례 */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '12px',
        justifyContent: 'center',
        maxWidth: width + 40
      }}>
        {sections.map((section, index) => (
          <div 
            key={index} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '12px',
              color: colors.text.secondary
            }}
          >
            <div 
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: section.color,
                flexShrink: 0
              }}
            />
            <span style={{ whiteSpace: 'nowrap' }}>
              {section.label} ({section.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;