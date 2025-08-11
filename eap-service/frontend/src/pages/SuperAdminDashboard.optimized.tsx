import React, { useState, useMemo, useCallback, memo } from 'react';
import { useSuperAdmin } from '../hooks/useSuperAdmin';
import { PlatformStatsCard } from '../components/super-admin/PlatformStatsCard';
import { CompaniesTable } from '../components/super-admin/CompaniesTable';
import { PendingAssignments } from '../components/super-admin/PendingAssignments';
import CounselorsManagement from '../components/super-admin/CounselorsManagement';

interface SuperAdminDashboardProps {
  user: any;
  onLogout: () => void;
}

interface TabConfig {
  id: string;
  label: string;
  component: React.ComponentType<any>;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { 
    platformStats, 
    companies, 
    counselors, 
    pendingAssignments, 
    counselorPayments,
    loading,
    error,
    refetch,
    refreshStats,
    refreshCompanies,
    refreshCounselors
  } = useSuperAdmin();

  const tabs: TabConfig[] = useMemo(() => [
    { id: 'overview', label: '대시보드 개요', component: OverviewTab },
    { id: 'companies', label: '기업 관리', component: CompaniesTab },
    { id: 'counselors', label: '상담사 관리', component: CounselorsTab },
    { id: 'assignments', label: '배정 관리', component: AssignmentsTab },
    { id: 'payments', label: '정산 관리', component: PaymentsTab },
    { id: 'settings', label: '시스템 설정', component: SettingsTab }
  ], []);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  const activeTabConfig = useMemo(() => 
    tabs.find(tab => tab.id === activeTab) || tabs[0], 
    [tabs, activeTab]
  );

  const tabProps = useMemo(() => ({
    platformStats,
    companies,
    counselors,
    pendingAssignments,
    counselorPayments,
    loading,
    error,
    refreshStats,
    refreshCompanies,
    refreshCounselors,
    refetch
  }), [
    platformStats,
    companies,
    counselors,
    pendingAssignments,
    counselorPayments,
    loading,
    error,
    refreshStats,
    refreshCompanies,
    refreshCounselors,
    refetch
  ]);

  if (error && !platformStats) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">오류 발생</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">수퍼 어드민 대시보드</h1>
              <p className="text-gray-600">전체 플랫폼 관리</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">안녕하세요, {user.name}님</span>
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <activeTabConfig.component {...tabProps} />
      </main>
    </div>
  );
};

// Memoized Tab Components
const OverviewTab = memo<any>(({ platformStats, pendingAssignments, loading, refreshStats }) => {
  const handleAssign = useCallback((assignment: any) => {
    console.log('Assign:', assignment);
    // TODO: 배정 로직 구현
  }, []);

  const recentActivity = useMemo(() => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">최근 활동</h3>
      <div className="text-gray-500">최근 활동 데이터를 로드 중...</div>
    </div>
  ), []);

  return (
    <div className="px-4 py-6 sm:px-0">
      <PlatformStatsCard stats={platformStats} loading={loading} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingAssignments 
          assignments={pendingAssignments} 
          loading={loading}
          onAssign={handleAssign}
        />
        {recentActivity}
      </div>
    </div>
  );
});

const CompaniesTab = memo<any>(({ companies, loading, refreshCompanies }) => (
  <div className="px-4 py-6 sm:px-0">
    <CompaniesTable 
      companies={companies} 
      loading={loading}
      onRefresh={refreshCompanies}
    />
  </div>
));

const CounselorsTab = memo<any>(({ counselors, loading, refreshCounselors }) => (
  <CounselorsManagement 
    counselors={counselors} 
    loading={loading} 
    refreshCounselors={refreshCounselors} 
  />
));

const AssignmentsTab = memo<any>(({ pendingAssignments, loading }) => {
  const handleAssign = useCallback((assignment: any) => {
    console.log('배정 처리:', assignment);
    // TODO: 배정 로직 구현
  }, []);

  return (
    <div className="px-4 py-6 sm:px-0">
      <PendingAssignments 
        assignments={pendingAssignments} 
        loading={loading}
        onAssign={handleAssign}
      />
    </div>
  );
});

const PaymentsTab = memo<any>(({ counselorPayments, loading }) => {
  const paymentList = useMemo(() => {
    if (loading) {
      return (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      );
    }

    if (counselorPayments.length === 0) {
      return <p className="text-gray-500 text-center py-8">정산 대기 내역이 없습니다.</p>;
    }

    return (
      <div className="space-y-4">
        {counselorPayments.map((payment: any) => (
          <div key={payment._id} className="border rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">{payment.counselor.name}</h4>
                <p className="text-sm text-gray-600">
                  {payment.year}년 {payment.month}월
                </p>
                <p className="text-sm text-gray-500">
                  총 상담: {payment.summary.totalSessions}회 | 
                  총 금액: ₩{payment.summary.totalAmount.toLocaleString()}
                </p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                payment.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {payment.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }, [counselorPayments, loading]);

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">정산 관리</h3>
        {paymentList}
      </div>
    </div>
  );
});

const SettingsTab = memo(() => (
  <div className="px-4 py-6 sm:px-0">
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">시스템 설정</h3>
      <p className="text-gray-500">시스템 설정 기능이 준비 중입니다.</p>
    </div>
  </div>
));

export default SuperAdminDashboard;