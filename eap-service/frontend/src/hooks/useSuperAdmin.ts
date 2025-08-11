import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { apiCache, CACHE_KEYS, CACHE_TTL } from '../utils/apiCache';

interface PlatformStats {
  totalCompanies: number;
  totalEmployees: number;
  totalCounselors: number;
  totalSessions: number;
  activeCompanies: number;
  monthlyRevenue: number;
  growthRate: number;
}

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

interface Counselor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  licenseNumber: string;
  experience: number;
  rates: {
    faceToFace: number;
    phoneVideo: number;
    chat: number;
  };
  maxDailyAppointments: number;
  isActive: boolean;
  totalSessions: number;
  rating: number;
  createdAt: string;
}

interface PendingAssignment {
  _id: string;
  employee: {
    name: string;
    email: string;
    company: string;
    department: string;
  };
  topic: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  counselingMethod: 'faceToFace' | 'phoneVideo' | 'chat';
  sessionType: string;
  requestedDate: string;
  assignmentStatus: 'pending' | 'assigned' | 'confirmed';
  createdAt: string;
}

interface CounselorPayment {
  _id: string;
  counselor: {
    _id: string;
    name: string;
  };
  year: number;
  month: number;
  summary: {
    totalSessions: number;
    faceToFaceSessions: number;
    phoneVideoSessions: number;
    chatSessions: number;
    totalAmount: number;
    taxAmount: number;
    netAmount: number;
  };
  status: 'pending' | 'approved' | 'paid' | 'dispute';
  approvedAt?: string;
  paidAt?: string;
}

interface SuperAdminData {
  platformStats: PlatformStats | null;
  companies: Company[];
  counselors: Counselor[];
  pendingAssignments: PendingAssignment[];
  counselorPayments: CounselorPayment[];
  loading: boolean;
  error: string | null;
}

export const useSuperAdmin = () => {
  const [data, setData] = useState<SuperAdminData>({
    platformStats: null,
    companies: [],
    counselors: [],
    pendingAssignments: [],
    counselorPayments: [],
    loading: true,
    error: null,
  });

  const fetchAllData = useCallback(async (skipCache: boolean = false) => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // 캐시에서 데이터 확인 (skipCache가 false인 경우)
      if (!skipCache) {
        const cachedStats = apiCache.get(CACHE_KEYS.PLATFORM_STATS);
        const cachedCompanies = apiCache.get(CACHE_KEYS.COMPANIES);
        const cachedCounselors = apiCache.get(CACHE_KEYS.COUNSELORS);
        const cachedAssignments = apiCache.get(CACHE_KEYS.PENDING_ASSIGNMENTS);
        const cachedPayments = apiCache.get(CACHE_KEYS.COUNSELOR_PAYMENTS);

        if (cachedStats && cachedCompanies && cachedCounselors && cachedAssignments && cachedPayments) {
          setData(prev => ({
            ...prev,
            platformStats: cachedStats,
            companies: cachedCompanies.companies || cachedCompanies,
            counselors: cachedCounselors.counselors || cachedCounselors,
            pendingAssignments: cachedAssignments,
            counselorPayments: cachedPayments.payments || cachedPayments,
            loading: false
          }));
          return;
        }
      }

      // API 호출 준비
      const apiCalls: Promise<any>[] = [];
      const cacheKeys: string[] = [];
      const cacheTTLs: number[] = [];

      // 통계 데이터
      if (skipCache || !apiCache.has(CACHE_KEYS.PLATFORM_STATS)) {
        apiCalls.push(axios.get('http://localhost:3000/api/super-admin/stats', { headers }));
        cacheKeys.push(CACHE_KEYS.PLATFORM_STATS);
        cacheTTLs.push(CACHE_TTL.PLATFORM_STATS);
      }

      // 회사 데이터
      if (skipCache || !apiCache.has(CACHE_KEYS.COMPANIES)) {
        apiCalls.push(axios.get('http://localhost:3000/api/super-admin/companies?limit=50&fields=name,domain,industry,plan,status,createdAt', { headers }));
        cacheKeys.push(CACHE_KEYS.COMPANIES);
        cacheTTLs.push(CACHE_TTL.COMPANIES);
      }

      // 상담사 데이터
      if (skipCache || !apiCache.has(CACHE_KEYS.COUNSELORS)) {
        apiCalls.push(axios.get('http://localhost:3000/api/counselors', { headers }));
        cacheKeys.push(CACHE_KEYS.COUNSELORS);
        cacheTTLs.push(CACHE_TTL.COUNSELORS);
      }

      // 대기 배정 데이터
      if (skipCache || !apiCache.has(CACHE_KEYS.PENDING_ASSIGNMENTS)) {
        apiCalls.push(axios.get('http://localhost:3000/api/counseling-sessions/pending-assignments', { headers }));
        cacheKeys.push(CACHE_KEYS.PENDING_ASSIGNMENTS);
        cacheTTLs.push(CACHE_TTL.PENDING_ASSIGNMENTS);
      }

      // 정산 데이터
      if (skipCache || !apiCache.has(CACHE_KEYS.COUNSELOR_PAYMENTS)) {
        apiCalls.push(axios.get('http://localhost:3000/api/counselor-payments', { headers }));
        cacheKeys.push(CACHE_KEYS.COUNSELOR_PAYMENTS);
        cacheTTLs.push(CACHE_TTL.COUNSELOR_PAYMENTS);
      }

      if (apiCalls.length > 0) {
        // 병렬로 API 호출 실행
        const responses = await Promise.all(apiCalls);

        // 응답 데이터를 캐시에 저장
        responses.forEach((response, index) => {
          apiCache.set(cacheKeys[index], response.data, cacheTTLs[index]);
        });
      }

      // 최신 데이터 설정 (캐시에서 가져오기)
      setData(prev => ({
        ...prev,
        platformStats: apiCache.get(CACHE_KEYS.PLATFORM_STATS),
        companies: (() => {
          const cached = apiCache.get(CACHE_KEYS.COMPANIES);
          return cached?.companies || cached || [];
        })(),
        counselors: (() => {
          const cached = apiCache.get(CACHE_KEYS.COUNSELORS);
          return cached?.counselors || cached || [];
        })(),
        pendingAssignments: apiCache.get(CACHE_KEYS.PENDING_ASSIGNMENTS) || [],
        counselorPayments: (() => {
          const cached = apiCache.get(CACHE_KEYS.COUNSELOR_PAYMENTS);
          return cached?.payments || cached || [];
        })(),
        loading: false
      }));

    } catch (error) {
      console.error('Super admin data fetch failed:', error);
      
      // 데모 데이터로 폴백
      setData(prev => ({
        ...prev,
        platformStats: {
          totalCompanies: 15,
          totalEmployees: 2450,
          totalCounselors: 45,
          totalSessions: 3280,
          activeCompanies: 13,
          monthlyRevenue: 125000,
          growthRate: 15.6
        },
        companies: [],
        counselors: [],
        pendingAssignments: [],
        counselorPayments: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/super-admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setData(prev => ({
        ...prev,
        platformStats: response.data
      }));
    } catch (error) {
      console.error('Stats refresh failed:', error);
    }
  }, []);

  const refreshCompanies = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/super-admin/companies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setData(prev => ({
        ...prev,
        companies: response.data.companies
      }));
    } catch (error) {
      console.error('Companies refresh failed:', error);
    }
  }, []);

  const refreshCounselors = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/counselors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setData(prev => ({
        ...prev,
        counselors: response.data.counselors
      }));
    } catch (error) {
      console.error('Counselors refresh failed:', error);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    ...data,
    refetch: fetchAllData,
    refreshStats,
    refreshCompanies,
    refreshCounselors
  };
};