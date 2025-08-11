import React, { memo } from 'react';

interface PlatformStats {
  totalCompanies: number;
  totalEmployees: number;
  totalCounselors: number;
  totalSessions: number;
  activeCompanies: number;
  monthlyRevenue: number;
  growthRate: number;
}

interface PlatformStatsCardProps {
  stats: PlatformStats | null;
  loading: boolean;
}

export const PlatformStatsCard: React.FC<PlatformStatsCardProps> = memo(({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: '전체 기업',
      value: stats.totalCompanies,
      subtitle: `활성 기업: ${stats.activeCompanies}`,
      color: 'blue'
    },
    {
      title: '전체 직원',
      value: stats.totalEmployees.toLocaleString(),
      subtitle: '등록된 직원 수',
      color: 'green'
    },
    {
      title: '전체 상담사',
      value: stats.totalCounselors,
      subtitle: '등록된 상담사 수',
      color: 'purple'
    },
    {
      title: '월 매출',
      value: `₩${stats.monthlyRevenue.toLocaleString()}`,
      subtitle: `성장률: ${stats.growthRate > 0 ? '+' : ''}${stats.growthRate}%`,
      color: stats.growthRate > 0 ? 'green' : 'red'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{card.title}</h3>
          <p className={`text-2xl font-bold text-${card.color}-600`}>{card.value}</p>
          <p className="text-sm text-gray-600 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
});