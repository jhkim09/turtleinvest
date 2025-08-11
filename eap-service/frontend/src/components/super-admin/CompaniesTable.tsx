import React, { memo, useState, useCallback } from 'react';

interface Company {
  _id: string;
  name: string;
  domain: string;
  industry: string;
  employeeCount: number;
  activeCounselors: number;
  monthlyUsage: number;
  plan: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'trial';
  createdAt: string;
  lastActivity: string;
  settings: {
    maxEmployees: number;
    maxCounselors: number;
    features: string[];
  };
}

interface CompaniesTableProps {
  companies: Company[];
  loading: boolean;
  onRefresh: () => void;
}

export const CompaniesTable: React.FC<CompaniesTableProps> = memo(({ 
  companies, 
  loading, 
  onRefresh 
}) => {
  const [sortField, setSortField] = useState<keyof Company>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = useCallback((field: keyof Company) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  const sortedCompanies = React.useMemo(() => {
    if (!companies.length) return [];

    return [...companies].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });
  }, [companies, sortField, sortDirection]);

  const getPlanColor = useCallback((plan: string) => {
    switch (plan) {
      case 'basic': return 'bg-gray-100 text-gray-800';
      case 'premium': return 'bg-blue-100 text-blue-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'trial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-300 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4">
              <div className="flex items-center space-x-4">
                <div className="h-4 bg-gray-300 rounded w-1/4 animate-pulse"></div>
                <div className="h-4 bg-gray-300 rounded w-1/6 animate-pulse"></div>
                <div className="h-4 bg-gray-300 rounded w-1/8 animate-pulse"></div>
                <div className="h-4 bg-gray-300 rounded w-1/6 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">기업 관리</h3>
        <button
          onClick={onRefresh}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
        >
          새로고침
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                회사명 {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('industry')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                업종 {sortField === 'industry' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('plan')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                요금제 {sortField === 'plan' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('employeeCount')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                직원 수 {sortField === 'employeeCount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                상태 {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedCompanies.map((company) => (
              <tr key={company._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{company.name}</div>
                    <div className="text-sm text-gray-500">{company.domain}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {company.industry}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanColor(company.plan)}`}>
                    {company.plan}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {company.employeeCount} / {company.settings.maxEmployees}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(company.status)}`}>
                    {company.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-2">편집</button>
                  <button className="text-red-600 hover:text-red-900">비활성화</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedCompanies.length === 0 && !loading && (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-500">등록된 기업이 없습니다.</p>
        </div>
      )}
    </div>
  );
});