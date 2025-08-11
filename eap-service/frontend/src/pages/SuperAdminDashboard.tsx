import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NotificationBell from '../components/Notifications/NotificationBell.tsx';
// import CounselorsManagement from '../components/SuperAdmin/CounselorsManagement';
// import CentersManagement from '../components/SuperAdmin/CentersManagement';

interface SuperAdminDashboardProps {
  user: any;
  onLogout: () => void;
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

interface PlatformStats {
  totalCompanies: number;
  totalEmployees: number;
  totalCounselors: number;
  totalSessions: number;
  activeCompanies: number;
  monthlyRevenue: number;
  growthRate: number;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [counselingCenters, setCounselingCenters] = useState<any[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [counselorPayments, setCounselorPayments] = useState<CounselorPayment[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [apiStatus, setApiStatus] = useState('testing');
  const [testResult, setTestResult] = useState('');
  
  // 회사 생성 폼
  const [showAddCompany, setShowAddCompany] = useState(false);
  // 상담사 생성 폼
  const [showAddCounselor, setShowAddCounselor] = useState(false);
  
  // 단가 설정 모달
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedCounselorId, setSelectedCounselorId] = useState('');
  const [rateSettings, setRateSettings] = useState({
    useSystemRate: true,
    customRate: 50000
  });
  const [newCounselor, setNewCounselor] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    specialties: [''],
    licenseNumber: '',
    experience: 0,
    rates: {
      faceToFace: 80000,
      phoneVideo: 60000,
      chat: 40000
    },
    maxDailyAppointments: 8
  });
  // 상담사 배정 모달
  const [selectedAssignment, setSelectedAssignment] = useState<PendingAssignment | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  
  // 상담센터 관리 모달
  const [editingCenter, setEditingCenter] = useState<any>(null);
  const [viewingCenterDetail, setViewingCenterDetail] = useState<any>(null);
  const [centerForm, setCenterForm] = useState<any>({});
  const [showAddCenterModal, setShowAddCenterModal] = useState(false);
  const [newCenterForm, setNewCenterForm] = useState<any>({
    name: '',
    description: '',
    address: '',
    contact: '',
    businessLicense: '',
    isActive: true
  });

  // 정산관리 관련 상태
  const [selectedCounselorForSessions, setSelectedCounselorForSessions] = useState<string | null>(null);
  const [counselorSessions, setCounselorSessions] = useState<any[]>([]);
  const [showSessionsList, setShowSessionsList] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedSessionForDispute, setSelectedSessionForDispute] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState('');

  const [newCompany, setNewCompany] = useState({
    name: '',
    domain: '',
    industry: '',
    plan: 'basic' as 'basic' | 'premium' | 'enterprise',
    maxEmployees: 100,
    maxCounselors: 5,
    annualCounselingLimit: 12,
    adminEmail: '',
    adminName: ''
  });

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  const fetchSuperAdminData = async () => {
    try {
      await testApiConnection();
      
      const token = localStorage.getItem('token');
      
      // 플랫폼 통계 조회
      const statsResponse = await axios.get('http://localhost:3000/api/super-admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlatformStats(statsResponse.data);
      
      // 회사 목록 조회
      const companiesResponse = await axios.get('http://localhost:3000/api/super-admin/companies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanies(companiesResponse.data.companies);

      // 상담사 목록 조회
      const counselorsResponse = await axios.get('http://localhost:3000/api/counselors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const counselorsData = counselorsResponse.data?.counselors || counselorsResponse.data || [];
      setCounselors(Array.isArray(counselorsData) ? counselorsData : []);

      // 상담센터 목록 조회
      const centersResponse = await axios.get('http://localhost:3000/api/counseling-centers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const centersData = centersResponse.data?.centers || centersResponse.data || [];
      setCounselingCenters(Array.isArray(centersData) ? centersData : []);

      // 배정 대기 목록 조회
      const assignmentsResponse = await axios.get('http://localhost:3000/api/counseling-sessions/pending-assignments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingAssignments(assignmentsResponse.data);

      // 정산 목록 조회
      const paymentsResponse = await axios.get('http://localhost:3000/api/counselor-payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCounselorPayments(paymentsResponse.data.payments);
      
    } catch (error) {
      console.error('Super admin data fetch failed:', error);
      // 데모 데이터 사용
      setPlatformStats({
        totalCompanies: 15,
        totalEmployees: 2450,
        totalCounselors: 45,
        totalSessions: 3280,
        activeCompanies: 13,
        monthlyRevenue: 125000,
        growthRate: 15.6
      });

      // 상담사 데모 데이터
      setCounselors([
        {
          _id: '1',
          name: '김상담',
          email: 'counselor1@example.com',
          phone: '010-1234-5678',
          specialties: ['우울증', '불안장애', '스트레스 관리'],
          licenseNumber: 'CL-2024-001',
          experience: 5,
          rates: { faceToFace: 80000, phoneVideo: 60000, chat: 40000 },
          maxDailyAppointments: 8,
          isActive: true,
          totalSessions: 245,
          rating: 4.8,
          createdAt: new Date().toISOString()
        },
        {
          _id: '2',
          name: '이상담',
          email: 'counselor2@example.com',
          phone: '010-5678-9012',
          specialties: ['가족상담', '인간관계', '직장스트레스'],
          licenseNumber: 'CL-2024-002',
          experience: 8,
          rates: { faceToFace: 100000, phoneVideo: 80000, chat: 50000 },
          maxDailyAppointments: 6,
          isActive: true,
          totalSessions: 412,
          rating: 4.9,
          createdAt: new Date().toISOString()
        },
        {
          _id: '3',
          name: '박상담',
          email: 'counselor3@example.com',
          phone: '010-9012-3456',
          specialties: ['청소년상담', '학습상담', '진로상담'],
          licenseNumber: 'CL-2024-003',
          experience: 3,
          rates: { faceToFace: 70000, phoneVideo: 50000, chat: 35000 },
          maxDailyAppointments: 10,
          isActive: false,
          totalSessions: 128,
          rating: 4.6,
          createdAt: new Date().toISOString()
        }
      ]);

      // 상담 배정 대기 데모 데이터
      setPendingAssignments([
        {
          _id: '1',
          employee: {
            name: '박직원',
            email: 'employee1@abc.com',
            company: 'ABC 테크놀로지',
            department: 'IT부'
          },
          topic: '재무상담',
          urgencyLevel: 'high',
          counselingMethod: 'faceToFace',
          sessionType: 'individual',
          requestedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          assignmentStatus: 'pending',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '2',
          employee: {
            name: '김직원',
            email: 'employee2@xyz.com',
            company: 'XYZ 컴퍼니',
            department: '마케팅부'
          },
          topic: '법률상담',
          urgencyLevel: 'medium',
          counselingMethod: 'phoneVideo',
          sessionType: 'individual',
          requestedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          assignmentStatus: 'pending',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '3',
          employee: {
            name: '이직원',
            email: 'employee3@def.com',
            company: 'DEF 기업',
            department: '인사부'
          },
          topic: '직장 내 갈등',
          urgencyLevel: 'critical',
          counselingMethod: 'faceToFace',
          sessionType: 'individual',
          requestedDate: new Date().toISOString(),
          assignmentStatus: 'pending',
          createdAt: new Date().toISOString()
        },
        {
          _id: '4',
          employee: {
            name: '최직원',
            email: 'employee4@ghi.com',
            company: 'GHI 솔루션',
            department: '개발팀'
          },
          topic: '스트레스 관리',
          urgencyLevel: 'medium',
          counselingMethod: 'chat',
          sessionType: 'individual',
          requestedDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          assignmentStatus: 'pending',
          createdAt: new Date().toISOString()
        },
        {
          _id: '5',
          employee: {
            name: '정직원',
            email: 'employee5@jkl.com',
            company: 'JKL 그룹',
            department: '영업부'
          },
          topic: '진로 상담',
          urgencyLevel: 'low',
          counselingMethod: 'phoneVideo',
          sessionType: 'individual',
          requestedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          assignmentStatus: 'pending',
          createdAt: new Date().toISOString()
        }
      ]);

      // 상담사 정산 데모 데이터
      setCounselorPayments([
        {
          _id: '1',
          counselor: {
            _id: '1',
            name: '김상담'
          },
          year: 2024,
          month: 12,
          summary: {
            totalSessions: 45,
            faceToFaceSessions: 20,
            phoneVideoSessions: 15,
            chatSessions: 10,
            totalAmount: 3200000,
            taxAmount: 320000,
            netAmount: 2880000
          },
          status: 'pending',
          approvedAt: undefined,
          paidAt: undefined
        },
        {
          _id: '2',
          counselor: {
            _id: '2',
            name: '이상담'
          },
          year: 2024,
          month: 12,
          summary: {
            totalSessions: 38,
            faceToFaceSessions: 25,
            phoneVideoSessions: 10,
            chatSessions: 3,
            totalAmount: 3650000,
            taxAmount: 365000,
            netAmount: 3285000
          },
          status: 'approved',
          approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          paidAt: undefined
        },
        {
          _id: '3',
          counselor: {
            _id: '1',
            name: '김상담'
          },
          year: 2024,
          month: 11,
          summary: {
            totalSessions: 52,
            faceToFaceSessions: 28,
            phoneVideoSessions: 18,
            chatSessions: 6,
            totalAmount: 3920000,
            taxAmount: 392000,
            netAmount: 3528000
          },
          status: 'paid',
          approvedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          paidAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '4',
          counselor: {
            _id: '2',
            name: '이상담'
          },
          year: 2024,
          month: 11,
          summary: {
            totalSessions: 41,
            faceToFaceSessions: 30,
            phoneVideoSessions: 8,
            chatSessions: 3,
            totalAmount: 4100000,
            taxAmount: 410000,
            netAmount: 3690000
          },
          status: 'paid',
          approvedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          paidAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: '5',
          counselor: {
            _id: '3',
            name: '박상담'
          },
          year: 2024,
          month: 11,
          summary: {
            totalSessions: 22,
            faceToFaceSessions: 12,
            phoneVideoSessions: 7,
            chatSessions: 3,
            totalAmount: 1485000,
            taxAmount: 148500,
            netAmount: 1336500
          },
          status: 'dispute',
          approvedAt: undefined,
          paidAt: undefined
        }
      ]);

      setCompanies([
        {
          _id: '1',
          name: 'ABC 테크놀로지',
          domain: 'abc-tech',
          industry: 'IT/소프트웨어',
          employeeCount: 320,
          activeCounselors: 8,
          monthlyUsage: 45,
          plan: 'premium',
          status: 'active',
          createdAt: '2024-01-15',
          lastActivity: '2025-08-10',
          settings: {
            maxEmployees: 500,
            maxCounselors: 10,
            features: ['기본상담', '그룹상담', '리포팅', 'API연동']
          }
        },
        {
          _id: '2',
          name: '글로벌 제조',
          domain: 'global-mfg',
          industry: '제조업',
          employeeCount: 850,
          activeCounselors: 15,
          monthlyUsage: 120,
          plan: 'enterprise',
          status: 'active',
          createdAt: '2023-08-20',
          lastActivity: '2025-08-09',
          settings: {
            maxEmployees: 1000,
            maxCounselors: 20,
            features: ['기본상담', '그룹상담', '리포팅', 'API연동', '커스텀브랜딩', '전담관리자']
          }
        },
        {
          _id: '3',
          name: '스타트업 X',
          domain: 'startup-x',
          industry: '스타트업',
          employeeCount: 25,
          activeCounselors: 2,
          monthlyUsage: 8,
          plan: 'basic',
          status: 'trial',
          createdAt: '2025-07-01',
          lastActivity: '2025-08-08',
          settings: {
            maxEmployees: 50,
            maxCounselors: 3,
            features: ['기본상담']
          }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const testApiConnection = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/health');
      if (response.ok) {
        setApiStatus('connected');
        setTestResult('✅ 백엔드 API 연결 성공');
      }
    } catch (error) {
      setApiStatus('disconnected');
      setTestResult('❌ 백엔드 연결 실패 - 데모 모드로 실행');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
  };

  const createCompany = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3000/api/super-admin/companies', newCompany, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCompanies(prev => [...prev, response.data.company]);
      setShowAddCompany(false);
      resetNewCompany();
      alert(`회사가 성공적으로 생성되었습니다!\n\n회사어드민 계정:\n이메일: ${response.data.admin.email}\n임시 비밀번호: ${response.data.admin.tempPassword}`);
    } catch (error) {
      // 데모 모드
      const demoCompany: Company = {
        _id: Date.now().toString(),
        name: newCompany.name,
        domain: newCompany.domain,
        industry: newCompany.industry,
        employeeCount: 0,
        activeCounselors: 0,
        monthlyUsage: 0,
        plan: newCompany.plan,
        status: 'trial' as const,
        createdAt: new Date().toISOString().split('T')[0],
        lastActivity: new Date().toISOString().split('T')[0],
        settings: {
          maxEmployees: newCompany.maxEmployees,
          maxCounselors: newCompany.maxCounselors,
          features: newCompany.plan === 'basic' ? ['기본상담'] : 
                   newCompany.plan === 'premium' ? ['기본상담', '그룹상담', '리포팅', 'API연동'] :
                   ['기본상담', '그룹상담', '리포팅', 'API연동', '커스텀브랜딩', '전담관리자']
        }
      };
      
      setCompanies(prev => [...prev, demoCompany]);
      setShowAddCompany(false);
      resetNewCompany();
      alert('회사가 성공적으로 생성되었습니다! (데모 모드)');
    }
  };

  const resetNewCompany = () => {
    setNewCompany({
      name: '',
      domain: '',
      industry: '',
      plan: 'basic',
      maxEmployees: 100,
      maxCounselors: 5,
      annualCounselingLimit: 12,
      adminEmail: '',
      adminName: ''
    });
  };

  // 상담사 관리 함수들
  const handleCreateCounselor = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3000/api/counselors', 
        newCounselor,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setCounselors(prev => [...prev, response.data.counselor]);
      setShowAddCounselor(false);
      resetNewCounselor();
      alert('상담사가 성공적으로 등록되었습니다!');
    } catch (error) {
      console.error('상담사 생성 오류:', error);
      alert('상담사 등록 중 오류가 발생했습니다: ' + (error.response?.data?.message || error.message));
    }
  };

  const resetNewCounselor = () => {
    setNewCounselor({
      name: '',
      email: '',
      phone: '',
      password: '',
      specialties: [''],
      licenseNumber: '',
      experience: 0,
      rates: {
        faceToFace: 80000,
        phoneVideo: 60000,
        chat: 40000
      },
      maxDailyAppointments: 8
    });
  };

  const toggleCounselorStatus = async (counselorId: string) => {
    try {
      const token = localStorage.getItem('token');
      const counselor = counselors.find(c => c._id === counselorId);
      if (!counselor) return;

      const response = await axios.patch(`http://localhost:3000/api/counselors/${counselorId}/status`, 
        { isActive: !counselor.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCounselors(prev => prev.map(c => 
        c._id === counselorId 
          ? { ...c, isActive: response.data.counselor.isActive }
          : c
      ));
      
      alert(response.data.message);
    } catch (error) {
      console.error('상담사 상태 변경 오류:', error);
      alert('상담사 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 단가 설정 모달 열기
  const openRateModal = async (counselorId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/counselor-rates/rate/${counselorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSelectedCounselorId(counselorId);
      setRateSettings({
        useSystemRate: response.data.useSystemRate,
        customRate: response.data.customRate || 50000
      });
      setShowRateModal(true);
    } catch (error) {
      console.error('단가 정보 조회 오류:', error);
      // 기본값으로 모달 열기
      setSelectedCounselorId(counselorId);
      setRateSettings({
        useSystemRate: true,
        customRate: 50000
      });
      setShowRateModal(true);
    }
  };

  // 단가 설정 저장
  const saveRateSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:3000/api/counselor-rates/rates/${selectedCounselorId}`, 
        rateSettings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('단가 설정이 저장되었습니다.');
      setShowRateModal(false);
    } catch (error) {
      console.error('단가 설정 저장 오류:', error);
      alert('단가 설정 저장 중 오류가 발생했습니다.');
    }
  };

  // 상담사 배정 처리
  const handleAssignCounselor = async (assignmentId: string, counselorId: string, notes?: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3000/api/counseling-sessions/${assignmentId}/assign`, {
        counselorId,
        assignmentNotes: notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 배정 목록에서 제거
      setPendingAssignments(prev => prev.filter(assignment => assignment._id !== assignmentId));
      setShowAssignmentModal(false);
      setSelectedAssignment(null);
      alert('상담사 배정이 완료되었습니다!');
    } catch (error) {
      console.error('상담사 배정 오류:', error);
      alert('상담사 배정 중 오류가 발생했습니다: ' + (error.response?.data?.message || error.message));
    }
  };

  // 정산 상태 변경
  const handlePaymentStatusChange = async (paymentId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:3000/api/counselor-payments/${paymentId}/status`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCounselorPayments(prev => prev.map(payment =>
        payment._id === paymentId
          ? { ...payment, status: newStatus as const, updatedAt: new Date().toISOString() }
          : payment
      ));
      
      const statusName = getPaymentStatusName(newStatus);
      alert(`정산 상태가 "${statusName}"로 변경되었습니다.`);
    } catch (error) {
      console.error('정산 상태 변경 오류:', error);
      // 데모 모드에서도 작동
      setCounselorPayments(prev => prev.map(payment =>
        payment._id === paymentId
          ? { ...payment, status: newStatus as const, updatedAt: new Date().toISOString() }
          : payment
      ));
      
      const statusName = getPaymentStatusName(newStatus);
      alert(`정산 상태가 "${statusName}"로 변경되었습니다! (데모 모드)`);
    }
  };

  // 상담사별 세션 목록 조회
  const fetchCounselorSessions = async (counselorId: string, counselorName: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/counseling-sessions/counselor/${counselorId}/sessions?period=2024-08`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setCounselorSessions(response.data.sessions || []);
        setSelectedCounselorForSessions(counselorName);
        setShowSessionsList(true);
      }
    } catch (error: any) {
      console.error('상담사 세션 조회 오류:', error);
      // 데모 데이터 사용
      const demoSessions = [
        {
          id: 'session_1',
          date: '2024-08-01',
          time: '09:00',
          client: '직원A',
          company: '테크컴퍼니',
          topic: '업무 스트레스',
          status: 'completed',
          fee: 80000,
          notes: '상담 완료',
          sessionType: 'individual',
          counselingMethod: 'faceToFace',
          disputeStatus: null
        },
        {
          id: 'session_2', 
          date: '2024-08-03',
          time: '14:00',
          client: '직원B',
          company: '마케팅코퍼레이션',
          topic: '인간관계 갈등',
          status: 'completed',
          fee: 80000,
          notes: '상담 완료',
          sessionType: 'individual',
          counselingMethod: 'phoneVideo',
          disputeStatus: null
        },
        {
          id: 'session_3',
          date: '2024-08-05',
          time: '16:00', 
          client: '직원C',
          company: '테크컴퍼니',
          topic: '진로 상담',
          status: 'completed',
          fee: 80000,
          notes: '상담 완료',
          sessionType: 'individual',
          counselingMethod: 'faceToFace',
          disputeStatus: 'pending'
        }
      ];
      setCounselorSessions(demoSessions);
      setSelectedCounselorForSessions(counselorName);
      setShowSessionsList(true);
    }
  };

  // 이의제기 모달 열기
  const handleOpenDispute = (session: any) => {
    setSelectedSessionForDispute(session);
    setShowDisputeModal(true);
  };

  // 이의제기 제출
  const handleSubmitDispute = async () => {
    if (!selectedSessionForDispute || !disputeReason.trim()) {
      alert('이의제기 사유를 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:3000/api/counseling-sessions/${selectedSessionForDispute.id}/dispute`, {
        reason: disputeReason,
        disputeType: 'payment',
        description: `정산 이의제기: ${disputeReason}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('이의제기가 성공적으로 제출되었습니다.');
      setShowDisputeModal(false);
      setSelectedSessionForDispute(null);
      setDisputeReason('');
      
      // 세션 목록 새로고침
      if (selectedCounselorForSessions) {
        fetchCounselorSessions(selectedSessionForDispute.counselor?.id, selectedCounselorForSessions);
      }
    } catch (error: any) {
      console.error('이의제기 제출 오류:', error);
      // 데모 모드에서 로컬 상태 업데이트
      setCounselorSessions(prev => prev.map(session =>
        session.id === selectedSessionForDispute.id
          ? { ...session, disputeStatus: 'pending', disputeReason: disputeReason }
          : session
      ));
      
      alert('이의제기가 제출되었습니다. (데모 모드)');
      setShowDisputeModal(false);
      setSelectedSessionForDispute(null);
      setDisputeReason('');
    }
  };

  const handleEditCenter = (center: any) => {
    setEditingCenter(center);
    setCenterForm({
      name: center.name,
      description: center.description || '',
      address: formatAddress(center.address),
      contact: center.contact || '',
      businessLicense: center.businessLicense || '',
      isActive: center.isActive !== false
    });
  };

  const handleViewCenterDetail = async (center: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/counseling-centers/${center._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewingCenterDetail(response.data.center);
    } catch (error) {
      console.error('상담센터 상세 조회 오류:', error);
      setViewingCenterDetail(center);
    }
  };

  const formatAddress = (address: any) => {
    if (!address || typeof address === 'string') {
      return address || '주소 미등록';
    }
    
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zipCode) parts.push(address.zipCode);
    
    return parts.length > 0 ? parts.join(' ') : '주소 미등록';
  };

  const handleSaveCenterEdit = async () => {
    if (!editingCenter) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:3000/api/counseling-centers/${editingCenter._id}`, centerForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCounselingCenters(prev => prev.map(center =>
        center._id === editingCenter._id ? { ...center, ...centerForm } : center
      ));
      
      setEditingCenter(null);
      setCenterForm({});
      alert('상담센터가 성공적으로 수정되었습니다.');
    } catch (error) {
      console.error('상담센터 수정 오류:', error);
      alert('상담센터 수정 중 오류가 발생했습니다.');
    }
  };

  const handleAddNewCenter = async () => {
    if (!newCenterForm.name.trim()) {
      alert('센터명을 입력해주세요.');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3000/api/counseling-centers', newCenterForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCounselingCenters(prev => [...prev, response.data.center]);
      setShowAddCenterModal(false);
      setNewCenterForm({
        name: '',
        description: '',
        address: '',
        contact: '',
        businessLicense: '',
        isActive: true
      });
      alert('새 상담센터가 성공적으로 등록되었습니다.');
    } catch (error) {
      console.error('상담센터 등록 오류:', error);
      alert('상담센터 등록 중 오류가 발생했습니다: ' + (error.response?.data?.message || error.message));
    }
  };

  const getPaymentStatusName = (status: string) => {
    const names: { [key: string]: string } = {
      pending: '정산 대기',
      completed: '정산완료',
      dispute: '이의 제기'
    };
    return names[status] || status;
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: { [key: string]: { bg: string, text: string } } = {
      pending: { bg: '#fff3e0', text: '#ef6c00' },
      completed: { bg: '#e8f5e8', text: '#2e7d32' },
      dispute: { bg: '#ffebee', text: '#c62828' }
    };
    return colors[status] || { bg: '#f5f5f5', text: '#666' };
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#2196f3';
      case 'low': return '#4caf50';
      default: return '#999';
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'faceToFace': return '대면';
      case 'phoneVideo': return '전화/화상';
      case 'chat': return '채팅';
      default: return method;
    }
  };

  const handleCrisisAction = async (crisisId: string, crisisLevel: string, employeeName: string) => {
    const actions = {
      emergency: {
        title: '긴급 위기 상황 조치',
        message: `${employeeName} 직원의 긴급 상황에 대한 조치가 필요합니다.\n\n권장 조치사항:\n• 즉시 전문 의료진 상담 연결\n• 가족/응급연락처 통보\n• 24시간 위기상담 핫라인 안내\n• 관리자/HR 팀 즉시 통보\n\n조치를 완료하셨습니까?`
      },
      urgent: {
        title: '긴급 상담 필요',
        message: `${employeeName} 직원의 심각한 상황에 대한 조치가 필요합니다.\n\n권장 조치사항:\n• 추가 전문 상담사 배정\n• 정기적 상담 스케줄 수립\n• 회사 지원 프로그램 안내\n• 상급자/HR 팀 통보\n\n조치를 완료하셨습니까?`
      },
      concern: {
        title: '상황 모니터링 필요',
        message: `${employeeName} 직원의 상황에 대한 지속적인 모니터링이 필요합니다.\n\n권장 조치사항:\n• 정기적 상담 모니터링\n• 회사 환경 개선 검토\n• 추가 상담 필요시 즉시 연결\n• 관련 부서 개선 조치 검토\n\n조치를 완료하셨습니까?`
      }
    };

    const action = actions[crisisLevel as keyof typeof actions];
    
    if (window.confirm(action.message)) {
      try {
        alert(`${employeeName} 직원의 위기상황 조치가 완료 처리되었습니다.\n\n후속 조치:\n• 상담사와의 정기적 소통 유지\n• 상황 모니터링 지속\n• 필요시 추가 지원 제공`);
      } catch (error) {
        console.error('위기상황 처리 오류:', error);
        alert('위기상황 처리 중 오류가 발생했습니다.');
      }
    }
  };

  const toggleCompanyStatus = (companyId: string) => {
    setCompanies(prev => prev.map(company => 
      company._id === companyId 
        ? { ...company, status: company.status === 'active' ? 'inactive' : 'active' as const }
        : company
    ));
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic': return '#4caf50';
      case 'premium': return '#1976d2';
      case 'enterprise': return '#9c27b0';
      default: return '#999';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'trial': return '#ff9800';
      case 'inactive': return '#f44336';
      default: return '#999';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#333' }}>플랫폼 관리자 대시보드 로딩 중...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e1e1e1',
        padding: '16px 0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#333', fontSize: '24px', margin: '0' }}>
              🚀 EAP 플랫폼 관리자
            </h1>
            <p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '14px' }}>
              멀티 회사 EAP 플랫폼 통합 관리 시스템
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <NotificationBell userRole={user?.role || 'super-admin'} />
            <span style={{ color: '#666', fontSize: '14px' }}>
              {user?.name}님 (슈퍼 관리자)
            </span>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e1e1e1',
        padding: '0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            {[
              { name: '플랫폼 현황', key: 'overview', active: activeTab === 'overview' },
              { name: '회사 관리', key: 'companies', active: activeTab === 'companies' },
              { name: '상담사 관리', key: 'counselors', active: activeTab === 'counselors' },
              { name: '상담센터 관리', key: 'centers', active: activeTab === 'centers' },
              { name: '상담 배정', key: 'assignments', active: activeTab === 'assignments' },
              { name: '위기 상황', key: 'crisis', active: activeTab === 'crisis' },
              { name: '정산 관리', key: 'payments', active: activeTab === 'payments' },
              { name: '시스템 설정', key: 'system', active: activeTab === 'system' }
            ].map((item, index) => (
              <div
                key={index}
                onClick={() => setActiveTab(item.key)}
                style={{
                  padding: '12px 20px',
                  cursor: 'pointer',
                  borderBottom: item.active ? '3px solid #1976d2' : '3px solid transparent',
                  color: item.active ? '#1976d2' : '#666',
                  fontWeight: item.active ? 'bold' : 'normal',
                  fontSize: '14px'
                }}
              >
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '30px 20px' }}>

        {/* 플랫폼 현황 탭 */}
        {activeTab === 'overview' && (
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ color: '#333', fontSize: '28px', margin: '0 0 10px 0' }}>
                EAP 플랫폼 전체 현황
              </h2>
              <p style={{ color: '#666', margin: '0' }}>
                모든 회사의 EAP 서비스 이용 현황을 모니터링하세요
              </p>
            </div>

            {/* 플랫폼 통계 카드들 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ color: '#1976d2', fontSize: '16px', margin: '0 0 10px 0' }}>
                  🏢 총 등록 회사
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0 0 5px 0' }}>
                  {platformStats?.totalCompanies || 0}
                </p>
                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                  활성: {platformStats?.activeCompanies || 0}개
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ color: '#4caf50', fontSize: '16px', margin: '0 0 10px 0' }}>
                  👥 총 이용자
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0 0 5px 0' }}>
                  {platformStats?.totalEmployees || 0}
                </p>
                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                  직원 수
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ color: '#9c27b0', fontSize: '16px', margin: '0 0 10px 0' }}>
                  🧠 총 상담사
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0 0 5px 0' }}>
                  {platformStats?.totalCounselors || 0}
                </p>
                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                  전체 플랫폼
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ color: '#ff9800', fontSize: '16px', margin: '0 0 10px 0' }}>
                  📈 월 성장률
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0 0 5px 0' }}>
                  +{platformStats?.growthRate || 0}%
                </p>
                <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
                  전월 대비
                </p>
              </div>
            </div>

            {/* 수익 정보 */}
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0' }}>
                💰 월별 매출 현황
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div>
                  <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#4caf50', margin: '0' }}>
                    ₩{platformStats?.monthlyRevenue?.toLocaleString() || '0'}
                  </p>
                  <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 0 0' }}>
                    이번 달 총 매출
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#e8f5e8',
                  padding: '10px 15px',
                  borderRadius: '20px',
                  color: '#2e7d32'
                }}>
                  ↗ +{platformStats?.growthRate || 0}% 성장
                </div>
              </div>
            </div>

            {/* 최근 활동 */}
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0' }}>
                🕒 최근 회사별 활동
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {companies.slice(0, 5).map((company) => (
                  <div key={company._id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    <div>
                      <strong style={{ color: '#333' }}>{company.name}</strong>
                      <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                        {company.employeeCount}명 • 이번 달 {company.monthlyUsage}건 상담
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        backgroundColor: `${getPlanColor(company.plan)}20`,
                        color: getPlanColor(company.plan)
                      }}>
                        {company.plan.toUpperCase()}
                      </span>
                      <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '12px' }}>
                        마지막 활동: {company.lastActivity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* API 상태 - 하단으로 이동 */}
            {testResult && (
              <div style={{
                backgroundColor: apiStatus === 'connected' ? '#e8f5e8' : '#ffebee',
                padding: '15px',
                borderRadius: '8px',
                marginTop: '30px',
                border: `1px solid ${apiStatus === 'connected' ? '#4caf50' : '#f44336'}`
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>🔗 플랫폼 상태</h4>
                <p style={{ margin: '0', fontSize: '14px' }}>{testResult}</p>
              </div>
            )}
          </div>
        )}

        {/* 회사 관리 탭 */}
        {activeTab === 'companies' && (
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#333', fontSize: '28px', margin: '0' }}>회사 관리</h2>
              <button
                onClick={() => setShowAddCompany(true)}
                style={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                + 새 회사 생성
              </button>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>회사명</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>도메인</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>업종</th>
                      <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>직원 수</th>
                      <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>플랜</th>
                      <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>월 이용</th>
                      <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>상태</th>
                      <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company._id}>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{company.name}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              생성: {company.createdAt}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                            {company.domain}
                          </code>
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{company.industry}</td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {company.employeeCount}/{company.settings.maxEmployees}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: `${getPlanColor(company.plan)}20`,
                            color: getPlanColor(company.plan),
                            fontWeight: 'bold'
                          }}>
                            {company.plan.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {company.monthlyUsage}건
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: `${getStatusColor(company.status)}20`,
                            color: getStatusColor(company.status)
                          }}>
                            {company.status === 'active' ? '운영중' : 
                             company.status === 'trial' ? '체험중' : '중단'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            <button
                              onClick={() => toggleCompanyStatus(company._id)}
                              style={{
                                backgroundColor: company.status === 'active' ? '#f44336' : '#4caf50',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              {company.status === 'active' ? '중단' : '활성'}
                            </button>
                            <button
                              style={{
                                backgroundColor: '#1976d2',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px'
                              }}
                            >
                              관리
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* API 상태 - 하단으로 이동 */}
            {testResult && (
              <div style={{
                backgroundColor: apiStatus === 'connected' ? '#e8f5e8' : '#ffebee',
                padding: '15px',
                borderRadius: '8px',
                marginTop: '30px',
                border: `1px solid ${apiStatus === 'connected' ? '#4caf50' : '#f44336'}`
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>🔗 플랫폼 상태</h4>
                <p style={{ margin: '0', fontSize: '14px' }}>{testResult}</p>
              </div>
            )}
          </div>
        )}

        {/* 사이트 생성 탭 */}
        {activeTab === 'sites' && (
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#333', fontSize: '28px', margin: '0 0 30px 0' }}>회사별 사이트 생성</h2>
            
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '30px',
              border: '1px solid #bbdefb'
            }}>
              <h3 style={{ color: '#1976d2', margin: '0 0 15px 0' }}>🌐 자동 사이트 생성 시스템</h3>
              <p style={{ color: '#666', margin: '0 0 15px 0' }}>
                새 회사 등록 시 자동으로 독립적인 EAP 사이트가 생성됩니다.
              </p>
              <ul style={{ color: '#555', margin: '0', paddingLeft: '20px' }}>
                <li>회사별 독립 도메인 (예: abc-tech.eap.com)</li>
                <li>커스텀 브랜딩 (로고, 색상, 메시지)</li>
                <li>회사 정책에 맞는 설정</li>
                <li>SSO 연동 지원</li>
                <li>자동 직원 계정 동기화</li>
              </ul>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {companies.map((company) => (
                <div key={company._id} style={{
                  backgroundColor: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ color: '#333', margin: '0' }}>{company.name}</h4>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: `${getStatusColor(company.status)}20`,
                      color: getStatusColor(company.status)
                    }}>
                      {company.status === 'active' ? '운영중' : 
                       company.status === 'trial' ? '체험중' : '중단'}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <strong>사이트 URL:</strong>
                    <div style={{
                      backgroundColor: 'white',
                      padding: '8px',
                      borderRadius: '4px',
                      marginTop: '5px',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      border: '1px solid #ddd'
                    }}>
                      https://{company.domain}.eap-platform.com
                    </div>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <strong>활성 기능:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                      {company.settings.features.map((feature, idx) => (
                        <span key={idx} style={{
                          padding: '3px 8px',
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          borderRadius: '12px',
                          fontSize: '11px'
                        }}>
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      flex: 1
                    }}>
                      사이트 방문
                    </button>
                    <button style={{
                      backgroundColor: '#ff9800',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      flex: 1
                    }}>
                      설정 관리
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 회사 생성 모달 */}
      {showAddCompany && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ color: '#333', margin: '0 0 20px 0' }}>🏢 새 회사 생성</h3>
            
            <div style={{ display: 'grid', gap: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>회사명</label>
                  <input
                    type="text"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="예: ABC 테크놀로지"
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>도메인</label>
                  <input
                    type="text"
                    value={newCompany.domain}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, domain: e.target.value }))}
                    placeholder="예: abc-tech"
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    {newCompany.domain}.eap-platform.com 으로 생성됩니다
                  </small>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>업종</label>
                <select
                  value={newCompany.industry}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, industry: e.target.value }))}
                  style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px' }}
                >
                  <option value="">업종을 선택하세요</option>
                  <option value="IT/소프트웨어">IT/소프트웨어</option>
                  <option value="제조업">제조업</option>
                  <option value="금융업">금융업</option>
                  <option value="서비스업">서비스업</option>
                  <option value="유통업">유통업</option>
                  <option value="건설업">건설업</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>서비스 플랜</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { key: 'basic', name: 'Basic', price: '₩99,000/월', desc: '소규모 (50명 이하)' },
                    { key: 'premium', name: 'Premium', price: '₩299,000/월', desc: '중간규모 (500명 이하)' },
                    { key: 'enterprise', name: 'Enterprise', price: '맞춤형', desc: '대규모 (무제한)' }
                  ].map((plan) => (
                    <div
                      key={plan.key}
                      onClick={() => setNewCompany(prev => ({ ...prev, plan: plan.key as any }))}
                      style={{
                        padding: '15px',
                        border: `2px solid ${newCompany.plan === plan.key ? '#1976d2' : '#e1e1e1'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: newCompany.plan === plan.key ? '#e3f2fd' : 'white',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', color: '#333' }}>{plan.name}</div>
                      <div style={{ color: '#1976d2', fontSize: '14px', margin: '5px 0' }}>{plan.price}</div>
                      <div style={{ color: '#666', fontSize: '12px' }}>{plan.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>최대 직원 수</label>
                  <input
                    type="number"
                    value={newCompany.maxEmployees}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, maxEmployees: parseInt(e.target.value) }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>최대 상담사 수</label>
                  <input
                    type="number"
                    value={newCompany.maxCounselors}
                    onChange={(e) => setNewCompany(prev => ({ ...prev, maxCounselors: parseInt(e.target.value) }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>직원별 연간 상담 한도</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newCompany.annualCounselingLimit}
                  onChange={(e) => setNewCompany(prev => ({ ...prev, annualCounselingLimit: parseInt(e.target.value) || 1 }))}
                  style={{ width: '200px', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px' }}
                />
                <span style={{ marginLeft: '10px', color: '#666', fontSize: '14px' }}>회/년</span>
                <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
                  각 직원이 연간 이용할 수 있는 상담 횟수입니다.
                </div>
              </div>

              <div>
                <h4 style={{ color: '#333', margin: '0 0 10px 0' }}>👤 회사 관리자 정보</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>관리자 이름</label>
                    <input
                      type="text"
                      value={newCompany.adminName}
                      onChange={(e) => setNewCompany(prev => ({ ...prev, adminName: e.target.value }))}
                      style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>관리자 이메일</label>
                    <input
                      type="email"
                      value={newCompany.adminEmail}
                      onChange={(e) => setNewCompany(prev => ({ ...prev, adminEmail: e.target.value }))}
                      style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowAddCompany(false)}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={createCompany}
                disabled={!newCompany.name || !newCompany.domain || !newCompany.industry}
                style={{
                  backgroundColor: !newCompany.name || !newCompany.domain || !newCompany.industry ? '#ccc' : '#1976d2',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  cursor: !newCompany.name || !newCompany.domain || !newCompany.industry ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🚀 회사 생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상담사 관리 탭 - 분리된 컴포넌트 (현재 비활성화) */}
      {/* <CounselorsManagement /> */}

      {/* 기존 상담사 관리 탭 (임시 복구) */}
      {activeTab === 'counselors' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#333', fontSize: '28px', margin: '0' }}>상담사 관리</h2>
            <button
              onClick={() => setShowAddCounselor(true)}
              style={{
                backgroundColor: '#9c27b0',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              + 새 상담사 등록
            </button>
          </div>

          {/* 상담사 목록 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '15px 20px',
              borderBottom: '1px solid #e1e1e1',
              fontWeight: 'bold',
              display: 'grid',
              gridTemplateColumns: '180px 160px 100px 180px 100px 100px 100px 80px 120px',
              gap: '15px',
              alignItems: 'center'
            }}>
              <div>상담사명</div>
              <div>연락처</div>
              <div>경력</div>
              <div>전문분야</div>
              <div>세션수</div>
              <div>평점</div>
              <div>단가설정</div>
              <div>상태</div>
              <div>관리</div>
            </div>
            
            {(() => {
              const counselorsList = counselors.length > 0 ? counselors : [
                {
                  _id: '1',
                  name: '김상담',
                  email: 'counselor1@example.com',
                  phone: '010-1234-5678',
                  specialties: ['우울증', '불안장애', '스트레스 관리'],
                  licenseNumber: 'CL-2024-001',
                  experience: 5,
                  rates: { faceToFace: 80000, phoneVideo: 60000, chat: 40000 },
                  maxDailyAppointments: 8,
                  isActive: true,
                  totalSessions: 245,
                  rating: 4.8,
                  createdAt: new Date().toISOString()
                },
                {
                  _id: '2',
                  name: '이상담',
                  email: 'counselor2@example.com',
                  phone: '010-5678-9012',
                  specialties: ['가족상담', '인간관계', '직장스트레스'],
                  licenseNumber: 'CL-2024-002',
                  experience: 8,
                  rates: { faceToFace: 100000, phoneVideo: 80000, chat: 50000 },
                  maxDailyAppointments: 6,
                  isActive: true,
                  totalSessions: 412,
                  rating: 4.9,
                  createdAt: new Date().toISOString()
                }
              ];
              return counselorsList.map((counselor, index) => (
              <div key={counselor._id} style={{
                padding: '20px',
                borderBottom: index < counselorsList.length - 1 ? '1px solid #f0f0f0' : 'none',
                display: 'grid',
                gridTemplateColumns: '180px 160px 100px 180px 100px 100px 100px 80px 120px',
                gap: '15px',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{counselor.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{counselor.email}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{counselor.licenseNumber}</div>
                </div>
                <div style={{ fontSize: '14px' }}>{counselor.phone}</div>
                <div style={{ fontSize: '14px' }}>{counselor.experience}년</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {(counselor.specialties || []).slice(0, 2).join(', ')}
                  {(counselor.specialties || []).length > 2 && ' 외'}
                </div>
                <div style={{ fontSize: '14px' }}>{counselor.totalSessions || 0}회</div>
                <div style={{ fontSize: '14px' }}>
                  ⭐ {(counselor.rating || 0).toFixed(1)}
                </div>
                <div>
                  <button
                    onClick={() => openRateModal(counselor._id)}
                    style={{
                      backgroundColor: '#2196f3',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    단가설정
                  </button>
                </div>
                <div>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    backgroundColor: counselor.isActive ? '#e8f5e8' : '#ffebee',
                    color: counselor.isActive ? '#2e7d32' : '#c62828'
                  }}>
                    {counselor.isActive ? '활성' : '비활성'}
                  </span>
                </div>
                <div>
                  <button
                    onClick={() => toggleCounselorStatus(counselor._id)}
                    style={{
                      backgroundColor: counselor.isActive ? '#f44336' : '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {counselor.isActive ? '비활성화' : '활성화'}
                  </button>
                </div>
              </div>
              ));
            })()}
          </div>
        </>
      )}

      {/* 상담사 등록 모달 */}
      {showAddCounselor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ color: '#333', margin: '0 0 20px 0' }}>🧠 새 상담사 등록</h3>
            
            <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>이름</label>
                  <input
                    type="text"
                    value={newCounselor.name}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, name: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>면허번호</label>
                  <input
                    type="text"
                    value={newCounselor.licenseNumber}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, licenseNumber: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>이메일</label>
                  <input
                    type="email"
                    value={newCounselor.email}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, email: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>전화번호</label>
                  <input
                    type="tel"
                    value={newCounselor.phone}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, phone: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>초기 비밀번호</label>
                  <input
                    type="password"
                    value={newCounselor.password}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, password: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>경력 (년)</label>
                  <input
                    type="number"
                    value={newCounselor.experience}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, experience: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>전문 분야</label>
                <input
                  type="text"
                  value={newCounselor.specialties.join(', ')}
                  onChange={(e) => setNewCounselor(prev => ({ ...prev, specialties: e.target.value.split(',').map(s => s.trim()) }))}
                  placeholder="우울증, 불안장애, 스트레스 관리 (쉽표로 구분)"
                  style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>상담 단가 설정</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666' }}>대면 상담</label>
                    <input
                      type="number"
                      value={newCounselor.rates.faceToFace}
                      onChange={(e) => setNewCounselor(prev => ({ 
                        ...prev, 
                        rates: { ...prev.rates, faceToFace: parseInt(e.target.value) || 0 }
                      }))}
                      style={{ width: '100%', padding: '8px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666' }}>전화/화상</label>
                    <input
                      type="number"
                      value={newCounselor.rates.phoneVideo}
                      onChange={(e) => setNewCounselor(prev => ({ 
                        ...prev, 
                        rates: { ...prev.rates, phoneVideo: parseInt(e.target.value) || 0 }
                      }))}
                      style={{ width: '100%', padding: '8px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666' }}>채팅 상담</label>
                    <input
                      type="number"
                      value={newCounselor.rates.chat}
                      onChange={(e) => setNewCounselor(prev => ({ 
                        ...prev, 
                        rates: { ...prev.rates, chat: parseInt(e.target.value) || 0 }
                      }))}
                      style={{ width: '100%', padding: '8px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>일일 최대 상담 수</label>
                <input
                  type="number"
                  value={newCounselor.maxDailyAppointments}
                  onChange={(e) => setNewCounselor(prev => ({ ...prev, maxDailyAppointments: parseInt(e.target.value) || 8 }))}
                  style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowAddCounselor(false)}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleCreateCounselor}
                disabled={!newCounselor.name || !newCounselor.email || !newCounselor.licenseNumber}
                style={{
                  backgroundColor: !newCounselor.name || !newCounselor.email || !newCounselor.licenseNumber ? '#ccc' : '#9c27b0',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  cursor: !newCounselor.name || !newCounselor.email || !newCounselor.licenseNumber ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🧠 상담사 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 단가 설정 모달 */}
      {showRateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ color: '#333', margin: '0 0 20px 0' }}>💰 상담사 단가 설정</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="radio"
                    checked={rateSettings.useSystemRate}
                    onChange={() => setRateSettings(prev => ({ ...prev, useSystemRate: true }))}
                    style={{ marginRight: '8px' }}
                  />
                  시스템 기본 단가 사용 (50,000원)
                </label>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="radio"
                    checked={!rateSettings.useSystemRate}
                    onChange={() => setRateSettings(prev => ({ ...prev, useSystemRate: false }))}
                    style={{ marginRight: '8px' }}
                  />
                  개별 단가 설정
                </label>
                
                {!rateSettings.useSystemRate && (
                  <div style={{ marginLeft: '26px' }}>
                    <input
                      type="number"
                      value={rateSettings.customRate}
                      onChange={(e) => setRateSettings(prev => ({ 
                        ...prev, 
                        customRate: parseInt(e.target.value) || 0 
                      }))}
                      placeholder="상담 단가 (원)"
                      style={{ 
                        width: '200px', 
                        padding: '10px', 
                        border: '2px solid #e1e1e1', 
                        borderRadius: '4px'
                      }}
                    />
                    <span style={{ marginLeft: '8px', color: '#666' }}>원</span>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowRateModal(false)}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={saveRateSettings}
                style={{
                  backgroundColor: '#2196f3',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                💰 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상담 배정 탭 */}
      {activeTab === 'assignments' && (
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#333', marginBottom: '20px' }}>🎯 상담 배정 관리</h3>
          
          {/* 배정 대기 목록 */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ color: '#333', marginBottom: '15px' }}>⏳ 배정 대기 중인 상담 요청</h4>
            <div style={{ display: 'grid', gap: '15px' }}>
              {pendingAssignments.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  현재 배정 대기 중인 상담 요청이 없습니다.
                </div>
              ) : (
                pendingAssignments.map((assignment) => (
                  <div key={assignment._id} style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h5 style={{ margin: '0 0 8px 0', color: '#333' }}>
                        {assignment.employee?.name || '직원'} - {assignment.topic || '상담 요청'}
                      </h5>
                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                        <span style={{ marginRight: '15px' }}>📅 {new Date(assignment.requestedDate).toLocaleDateString('ko-KR')}</span>
                        <span style={{ marginRight: '15px' }}>🏢 {assignment.employee?.department || '부서정보없음'}</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: assignment.urgencyLevel === 'high' || assignment.urgencyLevel === 'critical' ? '#ffebee' : '#fff3e0',
                          color: assignment.urgencyLevel === 'high' || assignment.urgencyLevel === 'critical' ? '#d32f2f' : '#f57c00'
                        }}>
                          {assignment.urgencyLevel === 'critical' ? '🚨 긴급' : 
                           assignment.urgencyLevel === 'high' ? '⚠️ 높음' : 
                           assignment.urgencyLevel === 'medium' ? '⚠️ 보통' : '📝 낮음'}
                        </span>
                      </div>
                      <p style={{ margin: '0', fontSize: '13px', color: '#888' }}>
                        요청일: {new Date(assignment.createdAt).toLocaleDateString('ko-KR')} | {assignment.counselingMethod === 'faceToFace' ? '대면상담' : assignment.counselingMethod === 'phoneVideo' ? '화상상담' : '채팅상담'} 희망
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <select 
                        id={`counselor-select-${assignment._id}`}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">상담사 선택</option>
                        {counselors.map(counselor => (
                          <option key={counselor._id} value={counselor._id}>
                            {counselor.name}
                          </option>
                        ))}
                      </select>
                      <button 
                        onClick={() => {
                          const selectElement = document.getElementById(`counselor-select-${assignment._id}`) as HTMLSelectElement;
                          const selectedCounselorId = selectElement?.value;
                          if (!selectedCounselorId) {
                            alert('상담사를 선택해주세요.');
                            return;
                          }
                          handleAssignCounselor(assignment._id, selectedCounselorId);
                        }}
                        style={{
                          backgroundColor: '#1976d2',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        배정
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 배정 통계 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ color: '#1976d2', margin: '0 0 10px 0' }}>⏳ 대기 중</h4>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '0', color: '#333' }}>5건</p>
            </div>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ color: '#4caf50', margin: '0 0 10px 0' }}>✅ 오늘 배정</h4>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '0', color: '#333' }}>12건</p>
            </div>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ color: '#ff9800', margin: '0 0 10px 0' }}>🚨 긴급</h4>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '0', color: '#333' }}>2건</p>
            </div>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ color: '#9c27b0', margin: '0 0 10px 0' }}>📊 평균 대기시간</h4>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '0', color: '#333' }}>2.3시간</p>
            </div>
          </div>
        </div>
      )}

      {/* 정산 관리 탭 */}
      {activeTab === 'payments' && (
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#333', marginBottom: '20px' }}>💰 정산 관리</h3>
          
          {/* 정산 현황 카드 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '30px'
          }}>
            <div style={{
              backgroundColor: '#fff3e0',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #ffcc02'
            }}>
              <h5 style={{ color: '#f57c00', margin: '0 0 8px 0', fontSize: '14px' }}>⏳ 정산 대기</h5>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', color: '#f57c00' }}>₩680,000</p>
            </div>
            <div style={{
              backgroundColor: '#e8f5e8',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #c8e6c9'
            }}>
              <h5 style={{ color: '#388e3c', margin: '0 0 8px 0', fontSize: '14px' }}>✅ 정산완료</h5>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', color: '#388e3c' }}>₩1,000,000</p>
            </div>
            <div style={{
              backgroundColor: '#ffebee',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #ffcdd2'
            }}>
              <h5 style={{ color: '#c62828', margin: '0 0 8px 0', fontSize: '14px' }}>⚠️ 이의제기</h5>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', color: '#c62828' }}>₩80,000</p>
            </div>
          </div>

          {/* 상담사별 정산 목록 */}
          <div>
            <h4 style={{ color: '#333', marginBottom: '15px' }}>👥 상담사별 정산 내역 (8월)</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>상담사</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>세션 수</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>총 금액</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>세금</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>실수령액</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>상태</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {['김상담사', '이상담사', '박상담사', '최상담사', '정상담사'].map((name, i) => {
                    const sessions = Math.floor(Math.random() * 20) + 10;
                    const totalAmount = sessions * 80000;
                    const tax = totalAmount * (i % 2 === 0 ? 0.033 : 0.1); // 상담사별 다른 세율
                    const netAmount = totalAmount - tax;
                    const statusOptions = ['pending', 'completed', 'dispute'];
                    const status = statusOptions[i % statusOptions.length];
                    const statusColor = getPaymentStatusColor(status);
                    
                    return (
                      <tr key={i}>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          <strong>{name}</strong>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            세율: {i % 2 === 0 ? '3.3%' : '10%'}
                          </div>
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          <button
                            onClick={() => fetchCounselorSessions(`counselor_${i}`, name)}
                            style={{
                              backgroundColor: 'transparent',
                              border: '1px solid #1976d2',
                              color: '#1976d2',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            {sessions}건 보기
                          </button>
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          ₩{totalAmount.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          ₩{Math.floor(tax).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          <strong>₩{Math.floor(netAmount).toLocaleString()}</strong>
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: statusColor.bg,
                            color: statusColor.text
                          }}>
                            {getPaymentStatusName(status)}
                          </span>
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {status === 'pending' && (
                              <button 
                                onClick={() => handlePaymentStatusChange(`payment_${i}`, 'completed')}
                                style={{
                                  backgroundColor: '#2e7d32',
                                  color: 'white',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '3px',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}>
                                정산완료
                              </button>
                            )}
                            {status === 'completed' && (
                              <span style={{ color: '#666', fontSize: '11px' }}>처리완료</span>
                            )}
                            {status !== 'completed' && status !== 'dispute' && (
                              <button 
                                onClick={() => handlePaymentStatusChange(`payment_${i}`, 'dispute')}
                                style={{
                                  backgroundColor: '#c62828',
                                  color: 'white',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '3px',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}>
                                이의제기
                              </button>
                            )}
                            {status === 'dispute' && (
                              <button 
                                onClick={() => handlePaymentStatusChange(`payment_${i}`, 'pending')}
                                style={{
                                  backgroundColor: '#ef6c00',
                                  color: 'white',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '3px',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}>
                                대기로 복원
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 상담센터 관리 탭 - 분리된 컴포넌트 (현재 비활성화) */}
      {/* <CentersManagement /> */}

      {/* 기존 상담센터 관리 탭 (임시 복구) */}
      {activeTab === 'centers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#333', fontSize: '28px', margin: '0' }}>상담센터 관리</h2>
            <button
              onClick={() => setShowAddCenterModal(true)}
              style={{
                backgroundColor: '#2e7d32',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              + 새 상담센터 등록
            </button>
          </div>

          {/* 상담센터 목록 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '15px 20px',
              borderBottom: '1px solid #e1e1e1',
              fontWeight: 'bold',
              display: 'grid',
              gridTemplateColumns: '200px 150px 200px 100px 100px 80px 150px',
              gap: '15px',
              alignItems: 'center'
            }}>
              <div>센터명</div>
              <div>위치</div>
              <div>연락처</div>
              <div>상담사수</div>
              <div>활성상담사</div>
              <div>상태</div>
              <div>관리</div>
            </div>
            
            {!Array.isArray(counselingCenters) ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#f44336' }}>
                <p>상담센터 데이터 로딩 중 오류가 발생했습니다.</p>
                <p>counselingCenters: {JSON.stringify(counselingCenters)}</p>
              </div>
            ) : counselingCenters.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                <p>상담센터가 없습니다.</p>
                <button
                  style={{
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '10px'
                  }}
                >
                  테스트 데이터 생성
                </button>
              </div>
            ) : (
              counselingCenters.map((center, index) => (
                <div key={center._id} style={{
                  padding: '20px',
                  borderBottom: index < counselingCenters.length - 1 ? '1px solid #f0f0f0' : 'none',
                  display: 'grid',
                  gridTemplateColumns: '200px 150px 200px 100px 100px 80px 150px',
                  gap: '15px',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{center.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{center.businessLicense}</div>
                  </div>
                  <div style={{ fontSize: '14px' }}>{formatAddress(center.address)}</div>
                  <div style={{ fontSize: '14px' }}>
                    <div>{center.contact?.phone || '연락처 미등록'}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{center.contact?.email || ''}</div>
                  </div>
                  <div style={{ fontSize: '14px', textAlign: 'center' }}>{center.totalCounselors || 0}명</div>
                  <div style={{ fontSize: '14px', textAlign: 'center' }}>{center.activeCounselor || 0}명</div>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: center.isActive !== false ? '#e8f5e8' : '#ffebee',
                      color: center.isActive !== false ? '#4caf50' : '#f44336'
                    }}>
                      {center.isActive !== false ? '활성' : '비활성'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleViewCenterDetail(center)}
                      style={{
                        backgroundColor: '#1976d2',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      상세
                    </button>
                    <button
                      onClick={() => handleEditCenter(center)}
                      style={{
                        backgroundColor: '#9c27b0',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      편집
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 상담사 세션 리스트 모달 */}
      {showSessionsList && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '90%',
            width: '800px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ color: '#333', margin: '0 0 20px 0' }}>
              📋 {selectedCounselorForSessions} - 상담 세션 목록 (8월)
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>날짜</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>시간</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>고객</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>주제</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>방식</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>수수료</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>상태</th>
                    <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #dee2e6' }}>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {counselorSessions.map((session, index) => (
                    <tr key={session.id}>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{session.date}</td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{session.time}</td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                        {session.client}
                        <div style={{ fontSize: '11px', color: '#666' }}>{session.company}</div>
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{session.topic}</td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                        <span style={{ 
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          backgroundColor: session.counselingMethod === 'faceToFace' ? '#e8f5e8' : '#e3f2fd',
                          color: session.counselingMethod === 'faceToFace' ? '#2e7d32' : '#1976d2'
                        }}>
                          {session.counselingMethod === 'faceToFace' ? '대면' : 
                           session.counselingMethod === 'phoneVideo' ? '화상' : '채팅'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                        ₩{session.fee.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                        {session.disputeStatus ? (
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: '#ffebee',
                            color: '#c62828'
                          }}>
                            이의제기중
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: '#e8f5e8',
                            color: '#2e7d32'
                          }}>
                            정상
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                        {!session.disputeStatus && (
                          <button
                            onClick={() => handleOpenDispute(session)}
                            style={{
                              backgroundColor: '#f57c00',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '3px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            이의제기
                          </button>
                        )}
                        {session.disputeStatus && (
                          <span style={{ fontSize: '11px', color: '#666' }}>진행중</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => {
                  setShowSessionsList(false);
                  setSelectedCounselorForSessions(null);
                  setCounselorSessions([]);
                }}
                style={{
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이의제기 모달 */}
      {showDisputeModal && selectedSessionForDispute && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            width: '500px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ color: '#333', margin: '0 0 20px 0' }}>⚠️ 정산 이의제기</h3>
            
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>상담 정보</h4>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>날짜:</strong> {selectedSessionForDispute.date} {selectedSessionForDispute.time}
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>고객:</strong> {selectedSessionForDispute.client} ({selectedSessionForDispute.company})
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>주제:</strong> {selectedSessionForDispute.topic}
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>수수료:</strong> ₩{selectedSessionForDispute.fee.toLocaleString()}
              </p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                이의제기 사유
              </label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="이의제기 사유를 상세히 입력해주세요..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '10px',
                  border: '2px solid #e1e1e1',
                  borderRadius: '4px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowDisputeModal(false);
                  setSelectedSessionForDispute(null);
                  setDisputeReason('');
                }}
                style={{
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleSubmitDispute}
                style={{
                  backgroundColor: '#f57c00',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                이의제기 제출
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 시스템 설정 탭 */}
      {activeTab === 'system' && (
        <div>
          {/* 플랫폼 설정 */}
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#333', marginBottom: '20px' }}>⚙️ 플랫폼 설정</h3>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>자동 상담사 배정</h4>
                  <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>새로운 상담 요청에 자동으로 상담사를 배정합니다</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ marginRight: '8px' }} />
                  <span style={{ color: '#4caf50', fontSize: '14px' }}>활성화</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>이메일 알림</h4>
                  <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>예약, 취소 등의 이벤트 발생시 이메일 알림을 발송합니다</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ marginRight: '8px' }} />
                  <span style={{ color: '#4caf50', fontSize: '14px' }}>활성화</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>데이터 백업</h4>
                  <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>매일 자동으로 데이터베이스를 백업합니다</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ marginRight: '8px' }} />
                  <span style={{ color: '#4caf50', fontSize: '14px' }}>활성화</span>
                </label>
              </div>
            </div>
          </div>

          {/* 요금 설정 */}
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#333', marginBottom: '20px' }}>💰 상담 요금 설정</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={{ padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>대면 상담</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="number" defaultValue="80000" style={{ 
                    padding: '8px 12px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    width: '120px'
                  }} />
                  <span>원 / 60분</span>
                </div>
              </div>

              <div style={{ padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>화상 상담</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="number" defaultValue="60000" style={{ 
                    padding: '8px 12px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    width: '120px'
                  }} />
                  <span>원 / 60분</span>
                </div>
              </div>

              <div style={{ padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>채팅 상담</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="number" defaultValue="40000" style={{ 
                    padding: '8px 12px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    width: '120px'
                  }} />
                  <span>원 / 60분</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button style={{
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                요금 설정 저장
              </button>
            </div>
          </div>

          {/* 시스템 정보 */}
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#333', marginBottom: '20px' }}>📊 시스템 정보</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>서버 버전</h4>
                <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#333' }}>v1.2.3</p>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>데이터베이스</h4>
                <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#333' }}>MongoDB 6.0</p>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>마지막 백업</h4>
                <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#333' }}>2025-08-10</p>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>시스템 상태</h4>
                <p style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>정상</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 위기 상황 모니터링 탭 */}
      {activeTab === 'crisis' && (
        <div>
          {/* 위기 상황 요약 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{
              backgroundColor: '#ffebee',
              padding: '20px',
              borderRadius: '8px',
              border: '2px solid #f44336'
            }}>
              <h3 style={{ color: '#d32f2f', margin: '0 0 10px 0', fontSize: '18px' }}>🚨 긴급 상황</h3>
              <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: '#d32f2f' }}>2</p>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>즉시 조치 필요</p>
            </div>
            
            <div style={{
              backgroundColor: '#fff3e0',
              padding: '20px',
              borderRadius: '8px',
              border: '2px solid #ff9800'
            }}>
              <h3 style={{ color: '#f57c00', margin: '0 0 10px 0', fontSize: '18px' }}>⚠️ 주의 관찰</h3>
              <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: '#f57c00' }}>7</p>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>지속 모니터링</p>
            </div>
            
            <div style={{
              backgroundColor: '#e8f5e8',
              padding: '20px',
              borderRadius: '8px',
              border: '2px solid #4caf50'
            }}>
              <h3 style={{ color: '#388e3c', margin: '0 0 10px 0', fontSize: '18px' }}>✅ 후속 조치</h3>
              <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '0', color: '#388e3c' }}>12</p>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>완료된 케이스</p>
            </div>
          </div>

          {/* 위기 상황 목록 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '15px 20px',
              borderBottom: '1px solid #e1e1e1',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ color: '#333', fontSize: '20px', margin: '0' }}>🚨 위기 상황 모니터링</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option>모든 위기 수준</option>
                  <option>긴급 (Emergency)</option>
                  <option>매우 심각 (Urgent)</option>
                  <option>심각 (Concern)</option>
                  <option>관찰 (Watch)</option>
                </select>
                <button style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}>
                  새로고침
                </button>
              </div>
            </div>
            
            <div style={{ padding: '0' }}>
              {/* 데모 위기 상황 데이터 */}
              {[
                {
                  id: '1',
                  employee: '김○○',
                  counselor: '이상담사',
                  crisisLevel: 'emergency',
                  crisisNotes: '자해 위험성 언급. 즉시 전문 의료진 상담 필요',
                  lastSession: '2025-08-10 14:30',
                  followUpRequired: true,
                  adminNotified: false
                },
                {
                  id: '2', 
                  employee: '박○○',
                  counselor: '김상담사',
                  crisisLevel: 'urgent',
                  crisisNotes: '심각한 우울 증상, 일상생활 어려움. 추가 상담 권장',
                  lastSession: '2025-08-10 11:15',
                  followUpRequired: true,
                  adminNotified: true
                },
                {
                  id: '3',
                  employee: '최○○',
                  counselor: '이상담사',
                  crisisLevel: 'concern',
                  crisisNotes: '직장 내 괴롭힘으로 인한 스트레스, 회사 차원 개입 검토 필요',
                  lastSession: '2025-08-09 16:45',
                  followUpRequired: false,
                  adminNotified: true
                }
              ].map((crisis, index) => (
                <div key={crisis.id} style={{
                  padding: '20px',
                  borderBottom: index < 2 ? '1px solid #f0f0f0' : 'none',
                  display: 'grid',
                  gridTemplateColumns: '120px 150px 150px 1fr 120px 100px',
                  gap: '15px',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: crisis.crisisLevel === 'emergency' ? '#ffebee' : 
                                      crisis.crisisLevel === 'urgent' ? '#fff3e0' : '#e3f2fd',
                      color: crisis.crisisLevel === 'emergency' ? '#d32f2f' : 
                             crisis.crisisLevel === 'urgent' ? '#f57c00' : '#1976d2'
                    }}>
                      {crisis.crisisLevel === 'emergency' ? '🚨 긴급' : 
                       crisis.crisisLevel === 'urgent' ? '⚠️ 심각' : '⚡ 주의'}
                    </span>
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{crisis.employee}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>직원</div>
                  </div>
                  
                  <div>
                    <div>{crisis.counselor}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>담당 상담사</div>
                  </div>
                  
                  <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                    {crisis.crisisNotes}
                  </div>
                  
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {crisis.lastSession}
                  </div>
                  
                  <div>
                    <button 
                      onClick={() => crisis.followUpRequired && handleCrisisAction(crisis.id, crisis.crisisLevel, crisis.employee)}
                      disabled={!crisis.followUpRequired}
                      style={{
                        backgroundColor: crisis.followUpRequired 
                          ? (crisis.crisisLevel === 'emergency' ? '#d32f2f' : '#1976d2')
                          : '#4caf50',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: crisis.followUpRequired ? 'pointer' : 'default',
                        fontSize: '12px',
                        opacity: crisis.followUpRequired ? 1 : 0.7
                      }}
                    >
                      {crisis.followUpRequired ? '조치하기' : '완료됨'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 위기 상황 조치 가이드 */}
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginTop: '20px'
          }}>
            <h3 style={{ color: '#333', marginBottom: '20px' }}>📋 위기 상황 대응 가이드</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div style={{ padding: '15px', backgroundColor: '#ffebee', borderRadius: '6px', border: '1px solid #f44336' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#d32f2f' }}>🚨 긴급 (Emergency)</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                  즉시 조치 필요 - 자해, 타해 위험성 / 전문 의료기관 연계 / 24시간 이내 추적관찰
                </p>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderRadius: '6px', border: '1px solid #ff9800' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#f57c00' }}>⚠️ 매우 심각 (Urgent)</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                  48시간 내 조치 - 심각한 정신건강 문제 / 추가 전문상담 권장 / 가족 또는 회사 통보 검토
                </p>
              </div>
              <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '6px', border: '1px solid #2196f3' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>⚡ 심각 (Concern)</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                  1주일 내 후속조치 - 지속적 모니터링 / 근무환경 개선 검토 / 정기 상담 스케줄링
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 상담센터 편집 모달 */}
      {editingCenter && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>상담센터 편집</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>센터명</label>
              <input
                type="text"
                value={centerForm.name || ''}
                onChange={(e) => setCenterForm(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>설명</label>
              <textarea
                value={centerForm.description || ''}
                onChange={(e) => setCenterForm(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minHeight: '80px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>주소</label>
              <input
                type="text"
                value={centerForm.address || ''}
                onChange={(e) => setCenterForm(prev => ({ ...prev, address: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>연락처</label>
              <input
                type="text"
                value={centerForm.contact || ''}
                onChange={(e) => setCenterForm(prev => ({ ...prev, contact: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={centerForm.isActive}
                  onChange={(e) => setCenterForm(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                센터 활성화
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setEditingCenter(null);
                  setCenterForm({});
                }}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleSaveCenterEdit}
                style={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상담센터 상세 모달 */}
      {viewingCenterDetail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '600px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>{viewingCenterDetail.name} - 상세 정보</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h4 style={{ marginBottom: '10px', color: '#333' }}>기본 정보</h4>
                <div style={{ marginBottom: '10px' }}>
                  <strong>센터명:</strong> {viewingCenterDetail.name}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>사업자등록번호:</strong> {viewingCenterDetail.businessLicense || '미등록'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>주소:</strong> {formatAddress(viewingCenterDetail.address)}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>연락처:</strong> {viewingCenterDetail.contact?.phone || '연락처 미등록'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>이메일:</strong> {viewingCenterDetail.contact?.email || '이메일 미등록'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>상태:</strong> 
                  <span style={{
                    marginLeft: '8px',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    backgroundColor: viewingCenterDetail.isActive !== false ? '#e8f5e8' : '#ffebee',
                    color: viewingCenterDetail.isActive !== false ? '#4caf50' : '#f44336'
                  }}>
                    {viewingCenterDetail.isActive !== false ? '활성' : '비활성'}
                  </span>
                </div>
              </div>
              
              <div>
                <h4 style={{ marginBottom: '10px', color: '#333' }}>운영 정보</h4>
                <div style={{ marginBottom: '10px' }}>
                  <strong>전체 상담사:</strong> {viewingCenterDetail.totalCounselors || 0}명
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>활성 상담사:</strong> {viewingCenterDetail.activeCounselor || 0}명
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>관리자:</strong> {viewingCenterDetail.adminUser?.name || '미지정'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>관리자 이메일:</strong> {viewingCenterDetail.adminUser?.email || '미지정'}
                </div>
              </div>
            </div>

            {viewingCenterDetail.description && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '10px', color: '#333' }}>센터 설명</h4>
                <p style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', margin: '0' }}>
                  {viewingCenterDetail.description}
                </p>
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setViewingCenterDetail(null)}
                style={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 새 상담센터 등록 모달 */}
      {showAddCenterModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>새 상담센터 등록</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>센터명 *</label>
              <input
                type="text"
                value={newCenterForm.name || ''}
                onChange={(e) => setNewCenterForm(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="상담센터 이름을 입력하세요"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>설명</label>
              <textarea
                value={newCenterForm.description || ''}
                onChange={(e) => setNewCenterForm(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minHeight: '80px'
                }}
                placeholder="상담센터 설명을 입력하세요"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>주소</label>
              <input
                type="text"
                value={newCenterForm.address || ''}
                onChange={(e) => setNewCenterForm(prev => ({ ...prev, address: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="주소를 입력하세요"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>연락처</label>
              <input
                type="text"
                value={newCenterForm.contact || ''}
                onChange={(e) => setNewCenterForm(prev => ({ ...prev, contact: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="연락처를 입력하세요"
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>사업자등록번호</label>
              <input
                type="text"
                value={newCenterForm.businessLicense || ''}
                onChange={(e) => setNewCenterForm(prev => ({ ...prev, businessLicense: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="사업자등록번호를 입력하세요"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={newCenterForm.isActive}
                  onChange={(e) => setNewCenterForm(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                센터 활성화
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddCenterModal(false);
                  setNewCenterForm({
                    name: '',
                    description: '',
                    address: '',
                    contact: '',
                    businessLicense: '',
                    isActive: true
                  });
                }}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleAddNewCenter}
                style={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;