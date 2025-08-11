import React, { lazy, Suspense } from 'react';

// Lazy load tab components for code splitting
const CompaniesManagement = lazy(() => import('./CompaniesManagement'));
const CounselorsManagement = lazy(() => import('./CounselorsManagement'));
const AssignmentManagement = lazy(() => import('./AssignmentManagement'));
const PaymentManagement = lazy(() => import('./PaymentManagement'));
const SystemSettings = lazy(() => import('./SystemSettings'));

// Loading component for suspense fallback
const TabLoadingSkeleton = () => (
  <div className="px-4 py-6 sm:px-0">
    <div className="bg-white rounded-lg shadow p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-300 rounded w-1/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 bg-gray-300 rounded"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    </div>
  </div>
);

interface LazyTabProps {
  tabId: string;
  [key: string]: any;
}

export const LazyTab: React.FC<LazyTabProps> = ({ tabId, ...props }) => {
  const renderTabContent = () => {
    switch (tabId) {
      case 'companies':
        return <CompaniesManagement {...props} />;
      case 'counselors':
        return <CounselorsManagement {...props} />;
      case 'assignments':
        return <AssignmentManagement {...props} />;
      case 'payments':
        return <PaymentManagement {...props} />;
      case 'settings':
        return <SystemSettings {...props} />;
      default:
        return null;
    }
  };

  return (
    <Suspense fallback={<TabLoadingSkeleton />}>
      {renderTabContent()}
    </Suspense>
  );
};