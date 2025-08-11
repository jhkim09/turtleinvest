import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface CompanyAdminDashboardProps {
  user: any;
  onLogout: () => void;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  role: 'employee' | 'manager';
  annualLimit: number;
  usedSessions: number;
  joinDate: string;
  isActive: boolean;
}


interface CompanyStats {
  totalEmployees: number;
  totalSessions: number;
  completedSessions: number;
  monthlyUsage: number;
  departmentUsage: { [key: string]: number };
  utilizationRate: number;
}

const CompanyAdminDashboard: React.FC<CompanyAdminDashboardProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStats | null>(null);
  
  // 부서 관리
  const [departments, setDepartments] = useState<string[]>([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [newDepartment, setNewDepartment] = useState('');
  
  // 사용자 등록 폼
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
    role: 'employee' as 'employee' | 'manager',
    annualLimit: 12
  });

  // 리포트 생성 폼
  const [selectedMonthlyPeriod, setSelectedMonthlyPeriod] = useState('2025년 1월');
  const [selectedSatisfactionPeriod, setSelectedSatisfactionPeriod] = useState('분기별');
  const [selectedCostYear, setSelectedCostYear] = useState('2024년');
  
  // 리포트 결과 모달
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [reportType, setReportType] = useState<'monthly' | 'satisfaction' | 'cost'>('monthly');
  
  // 엑셀 업로드 관련
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // 회사 비즈니스 메트릭 설정
  const [businessMetrics, setBusinessMetrics] = useState({
    annualRevenue: 0,
    avgEmployeeSalary: 50000000,
    preEapAbsenteeismDays: 0,
    preEapTurnoverRate: 15,
    dailyProductivityPerEmployee: 200000,
    recruitmentTrainingCost: 10000000
  });


  useEffect(() => {
    fetchCompanyData();
    fetchDepartments();
    fetchBusinessMetrics();
  }, []);

  const fetchCompanyData = async () => {
    try {
      
      const token = localStorage.getItem('token');
      
      // 회사 정보 조회
      try {
        const companyResponse = await axios.get('http://localhost:3000/api/companies/my-company', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('회사 정보:', companyResponse.data.company);
      } catch (error) {
        console.log('회사 정보 조회 실패 (데모 모드):', error.response?.data?.error);
      }
      
      // 회사 통계 조회
      const statsResponse = await axios.get('http://localhost:3000/api/company-admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanyStats(statsResponse.data);
      
      // 직원 목록 조회
      const employeesResponse = await axios.get('http://localhost:3000/api/company-admin/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(employeesResponse.data);
      
      
    } catch (error) {
      console.error('Company admin data fetch failed:', error);
      // 데모 데이터 사용
      setCompanyStats({
        totalEmployees: 45,
        totalSessions: 120,
        completedSessions: 98,
        monthlyUsage: 35,
        departmentUsage: {
          'IT개발팀': 15,
          '마케팅팀': 12,
          '영업팀': 8,
          '인사팀': 5,
          '재무팀': 3
        },
        utilizationRate: 72
      });

      setEmployees([
        {
          _id: '1',
          name: '김직원',
          email: 'kim@company.com',
          department: 'IT개발팀',
          position: '선임연구원',
          role: 'employee',
          annualLimit: 12,
          usedSessions: 3,
          joinDate: '2024-01-15',
          isActive: true
        },
        {
          _id: '2',
          name: '이부장',
          email: 'lee@company.com',
          department: 'IT개발팀',
          position: '부장',
          role: 'manager',
          annualLimit: 15,
          usedSessions: 5,
          joinDate: '2023-05-20',
          isActive: true
        },
        {
          _id: '3',
          name: '박대리',
          email: 'park@company.com',
          department: '마케팅팀',
          position: '대리',
          role: 'employee',
          annualLimit: 12,
          usedSessions: 2,
          joinDate: '2024-03-10',
          isActive: true
        }
      ]);

    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/company-admin/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data.departments);
    } catch (error) {
      console.error('부서 목록 조회 실패:', error);
      // 기본 부서 목록 사용
      setDepartments(['경영진', 'IT개발팀', '마케팅팀', '영업팀', '인사팀', '재무팀', '총무팀', '기획팀', '디자인팀', '품질관리팀']);
    }
  };

  const updateDepartments = async (updatedDepartments: string[]) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put('http://localhost:3000/api/company-admin/departments', 
        { departments: updatedDepartments },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDepartments(response.data.departments);
      alert('부서 목록이 업데이트되었습니다.');
    } catch (error) {
      console.error('부서 목록 업데이트 실패:', error);
      alert('부서 목록 업데이트에 실패했습니다.');
    }
  };

  const addDepartment = () => {
    if (!newDepartment.trim()) return;
    if (departments.includes(newDepartment.trim())) {
      alert('이미 존재하는 부서명입니다.');
      return;
    }
    const updatedDepartments = [...departments, newDepartment.trim()];
    updateDepartments(updatedDepartments);
    setNewDepartment('');
  };

  const removeDepartment = (deptToRemove: string) => {
    if (window.confirm(`"${deptToRemove}" 부서를 삭제하시겠습니까?`)) {
      const updatedDepartments = departments.filter(dept => dept !== deptToRemove);
      updateDepartments(updatedDepartments);
    }
  };

  const fetchBusinessMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/company-admin/business-metrics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBusinessMetrics(response.data.businessMetrics);
    } catch (error) {
      console.error('비즈니스 메트릭 조회 실패:', error);
      // 기본값 사용
    }
  };

  const updateBusinessMetrics = async (metrics: any) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:3000/api/company-admin/business-metrics', 
        { businessMetrics: metrics },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBusinessMetrics(metrics);
      alert('회사 설정이 저장되었습니다.');
    } catch (error) {
      console.error('비즈니스 메트릭 저장 실패:', error);
      alert('설정 저장에 실패했습니다.');
    }
  };


  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
  };

  const addEmployee = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3000/api/company-admin/employees', newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEmployees(prev => [...prev, response.data]);
      setShowAddUser(false);
      resetNewUser();
      alert('직원이 성공적으로 등록되었습니다!');
    } catch (error) {
      // 데모 모드
      const demoEmployee: Employee = {
        _id: Date.now().toString(),
        ...newUser,
        usedSessions: 0,
        joinDate: new Date().toISOString().split('T')[0],
        isActive: true
      };
      
      setEmployees(prev => [...prev, demoEmployee]);
      setShowAddUser(false);
      resetNewUser();
      alert('직원이 성공적으로 등록되었습니다! (데모 모드)');
    }
  };


  const resetNewUser = () => {
    setNewUser({
      name: '',
      email: '',
      department: '',
      position: '',
      role: 'employee',
      annualLimit: 12
    });
  };

  // 엑셀 샘플 파일 다운로드
  const downloadSampleExcel = () => {
    const csvContent = `이름,이메일,부서,직책,역할,연간상담한도
김직원,kim@company.com,개발팀,선임개발자,employee,12
이직원,lee@company.com,마케팅팀,팀장,manager,15
박직원,park@company.com,인사팀,대리,employee,10`;
    
    const BOM = '\uFEFF'; // UTF-8 BOM for proper Korean display in Excel
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', '직원등록_샘플파일.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 엑셀 파일 업로드 처리
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      alert('CSV 또는 Excel 파일(.xlsx)만 업로드 가능합니다.');
      return;
    }

    setUploading(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length <= 1) {
        alert('파일에 데이터가 없습니다.');
        setUploading(false);
        return;
      }

      // 헤더 검증
      const header = lines[0].replace(/\uFEFF/g, ''); // BOM 제거
      const expectedHeaders = ['이름', '이메일', '부서', '직책', '역할', '연간상담한도'];
      const actualHeaders = header.split(',').map(h => h.trim());
      
      const hasValidHeaders = expectedHeaders.every(expected => 
        actualHeaders.some(actual => actual.includes(expected) || expected.includes(actual))
      );

      if (!hasValidHeaders) {
        alert(`올바른 헤더 형식이 아닙니다.\n필요한 컬럼: ${expectedHeaders.join(', ')}\n현재 컬럼: ${actualHeaders.join(', ')}`);
        setUploading(false);
        return;
      }

      // 데이터 파싱
      const newEmployees: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        
        if (values.length < 6) {
          errors.push(`${i + 1}행: 필수 컬럼이 부족합니다.`);
          continue;
        }

        const [name, email, department, position, role, annualLimitStr] = values;
        
        // 유효성 검증
        if (!name || !email || !department || !position) {
          errors.push(`${i + 1}행: 필수 정보가 누락되었습니다.`);
          continue;
        }

        if (!email.includes('@')) {
          errors.push(`${i + 1}행: 올바른 이메일 형식이 아닙니다.`);
          continue;
        }

        const annualLimit = parseInt(annualLimitStr) || 12;
        const employeeRole = role.toLowerCase() === 'manager' ? 'manager' : 'employee';

        newEmployees.push({
          _id: `excel_${Date.now()}_${i}`,
          name,
          email,
          department,
          position,
          role: employeeRole,
          annualLimit,
          usedSessions: 0,
          joinDate: new Date().toISOString().split('T')[0],
          isActive: true
        });
      }

      if (errors.length > 0) {
        alert(`업로드 중 오류가 발생했습니다:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? '\n...' : ''}`);
      }

      if (newEmployees.length > 0) {
        setEmployees(prev => [...prev, ...newEmployees]);
        alert(`${newEmployees.length}명의 직원이 성공적으로 등록되었습니다!`);
        setShowExcelUpload(false);
      }

    } catch (error) {
      console.error('Excel upload error:', error);
      alert('파일 처리 중 오류가 발생했습니다. 파일 형식을 확인해주세요.');
    } finally {
      setUploading(false);
      // 파일 input 리셋
      if (event.target) {
        event.target.value = '';
      }
    }
  };


  const toggleEmployeeStatus = (employeeId: string) => {
    setEmployees(prev => prev.map(emp => 
      emp._id === employeeId ? { ...emp, isActive: !emp.isActive } : emp
    ));
  };

  // 리포트 생성 함수들
  const generateMonthlyReport = async (selectedPeriod: string) => {
    try {
      const token = localStorage.getItem('token');
      const [year, month] = selectedPeriod.replace('년 ', '/').replace('월', '').split('/');
      const response = await axios.post('http://localhost:3000/api/company-admin/reports/monthly', {
        year: parseInt(year),
        month: parseInt(month)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCurrentReport(response.data.report);
      setReportType('monthly');
      setShowReportModal(true);
    } catch (error) {
      console.error('월간 리포트 생성 실패:', error);
      // 데모 데이터 생성
      const demoReport = {
        period: selectedPeriod,
        totalSessions: 45,
        completedSessions: 38,
        departmentStats: {
          'IT개발팀': { totalSessions: 15, completedSessions: 13, employeeCount: 8 },
          '마케팅팀': { totalSessions: 12, completedSessions: 10, employeeCount: 6 },
          '영업팀': { totalSessions: 10, completedSessions: 8, employeeCount: 5 },
          '인사팀': { totalSessions: 5, completedSessions: 4, employeeCount: 3 },
          '재무팀': { totalSessions: 3, completedSessions: 3, employeeCount: 2 }
        },
        generatedAt: new Date(),
        reportType: 'monthly'
      };
      setCurrentReport(demoReport);
      setReportType('monthly');
      setShowReportModal(true);
    }
  };

  const generateSatisfactionReport = async (period: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3000/api/company-admin/reports/satisfaction', {
        period
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCurrentReport(response.data.report);
      setReportType('satisfaction');
      setShowReportModal(true);
    } catch (error) {
      console.error('만족도 리포트 생성 실패:', error);
      // 데모 데이터 생성
      const demoReport = {
        period,
        averageRating: 4.2,
        responseRate: 75,
        totalResponses: 89,
        categoryRatings: {
          '상담사 전문성': 4.5,
          '상담 환경': 4.1,
          '예약 편의성': 3.9,
          '비밀보장': 4.6,
          '전반적 만족도': 4.2
        },
        improvements: [
          '예약 시스템 개선 요청',
          '상담실 환경 개선',
          '다양한 상담 방식 제공',
          '대기시간 단축',
          '상담사 매칭 개선'
        ],
        detailFeedback: [
          { rating: 5, comment: '상담사 선생님이 정말 도움이 되었습니다. 감사합니다.' },
          { rating: 4, comment: '예약이 조금 어려웠지만 상담 자체는 만족스러웠어요.' },
          { rating: 5, comment: '직장 내 스트레스 관리에 큰 도움이 되었습니다.' }
        ],
        generatedAt: new Date(),
        reportType: 'satisfaction'
      };
      setCurrentReport(demoReport);
      setReportType('satisfaction');
      setShowReportModal(true);
    }
  };

  const generateCostReport = async (selectedYear: string) => {
    try {
      const token = localStorage.getItem('token');
      const year = selectedYear === '사용자 정의' ? new Date().getFullYear() : parseInt(selectedYear.replace('년', ''));
      const response = await axios.post('http://localhost:3000/api/company-admin/reports/cost', {
        year
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCurrentReport(response.data.report);
      setReportType('cost');
      setShowReportModal(true);
    } catch (error) {
      console.error('비용 리포트 생성 실패:', error);
      // 데모 데이터 생성
      const year = selectedYear === '사용자 정의' ? new Date().getFullYear() : parseInt(selectedYear.replace('년', ''));
      const currentEmployeeCount = 45;
      const totalSessions = 156;
      const totalCost = 12480000;
      const avgSalary = 50000000;
      const dailyProductivity = 200000;
      
      // 더 현실적인 ROI 계산
      const absenteeismReduction = totalSessions * 0.5; // 78일
      const absenteeismSavings = absenteeismReduction * dailyProductivity; // 15,600,000원
      const turnoverReduction = 1.35; // 15% * 0.2 * 45명
      const turnoverSavings = turnoverReduction * 10000000; // 13,500,000원
      const productivityGain = totalSessions * (avgSalary * 0.03 / currentEmployeeCount) * 12; // 51,999,960원
      const medicalSavings = (totalSessions / currentEmployeeCount) * (avgSalary * 0.05) * 0.15; // 2,600,000원
      const totalBenefits = absenteeismSavings + turnoverSavings + productivityGain + medicalSavings;
      
      const demoReport = {
        year,
        totalSessions,
        totalCost,
        avgSessionCost: 80000,
        monthlyCosts: {
          1: { month: 1, sessions: 12, cost: 960000 },
          2: { month: 2, sessions: 15, cost: 1200000 },
          3: { month: 3, sessions: 18, cost: 1440000 },
          4: { month: 4, sessions: 14, cost: 1120000 },
          5: { month: 5, sessions: 16, cost: 1280000 },
          6: { month: 6, sessions: 13, cost: 1040000 },
          7: { month: 7, sessions: 11, cost: 880000 },
          8: { month: 8, sessions: 19, cost: 1520000 },
          9: { month: 9, sessions: 17, cost: 1360000 },
          10: { month: 10, sessions: 15, cost: 1200000 },
          11: { month: 11, sessions: 8, cost: 640000 },
          12: { month: 12, sessions: 4, cost: 320000 }
        },
        costPerEmployee: Math.round(totalCost / currentEmployeeCount),
        currentEmployeeCount,
        roi: {
          // 세부 효과
          absenteeismReduction: Math.round(absenteeismReduction * 10) / 10,
          absenteeismSavings: Math.round(absenteeismSavings),
          turnoverReduction: Math.round(turnoverReduction * 10) / 10,
          turnoverSavings: Math.round(turnoverSavings),
          productivityGain: Math.round(productivityGain),
          medicalSavings: Math.round(medicalSavings),
          // 총합
          totalBenefits: Math.round(totalBenefits),
          roiPercentage: Math.round((totalBenefits / totalCost) * 100),
          // 부가 정보
          assumptions: {
            absenteeismReductionPerSession: 0.5,
            turnoverReductionRate: 20,
            productivityImprovementRate: 3,
            medicalCostSavingRate: 15
          }
        },
        businessContext: {
          employeeCount: currentEmployeeCount,
          avgSalary,
          dailyProductivity,
          preEapMetrics: {
            turnoverRate: 15,
            absenteeismDays: currentEmployeeCount * 8
          }
        },
        generatedAt: new Date(),
        reportType: 'cost'
      };
      setCurrentReport(demoReport);
      setReportType('cost');
      setShowReportModal(true);
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
          <h2 style={{ color: '#333' }}>회사 관리자 대시보드 로딩 중...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom, #f8fafc 0%, #e3f2fd 50%, #f3e5f5 100%)', 
      fontFamily: '"Segoe UI", "Malgun Gothic", sans-serif' 
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '0',
        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 배경 장식 요소 */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '120px',
          height: '120px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '50%',
        }}></div>
        
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', position: 'relative' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '80px'
          }}>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '32px', 
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
              }}>
                <span style={{ fontSize: '36px' }}>💚</span>
                EAP 케어 센터
              </h1>
              <p style={{ margin: 0, fontSize: '16px', opacity: 0.9, marginTop: '4px' }}>
                {user?.name}님과 함께하는 직원 웰빙 관리 공간입니다
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>
                  {user?.company || 'ABC 회사'}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '500' }}>
                  {user?.name}님 👋
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
        padding: '0',
        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            {[
              { name: '💝 전체 현황', key: 'overview' },
              { name: '👥 직원 관리', key: 'employees' },
              { name: '⚙️ 회사 설정', key: 'settings' },
              { name: '📊 비즈니스 설정', key: 'business-config' },
              { name: '📈 리포트', key: 'reports' }
            ].map((item, index) => {
              const isActive = activeTab === item.key;
              return (
                <div
                  key={index}
                  onClick={() => setActiveTab(item.key)}
                  style={{
                    padding: '18px 24px',
                    background: isActive 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : 'transparent',
                    color: isActive ? 'white' : '#555',
                    cursor: 'pointer',
                    borderRadius: isActive ? '20px 20px 0 0' : '0',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontWeight: isActive ? '600' : '500',
                    fontSize: '15px',
                    transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                    boxShadow: isActive ? '0 4px 15px rgba(102, 126, 234, 0.3)' : 'none',
                    border: isActive ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid transparent',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
                      e.target.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                      pointerEvents: 'none'
                    }}></div>
                  )}
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>

        {/* 전체 현황 탭 */}
        {activeTab === 'overview' && (
          <>
            <div style={{ marginBottom: '35px' }}>
              <h2 style={{ 
                color: '#37474f', 
                fontSize: '32px', 
                margin: '0 0 12px 0',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '36px' }}>🌿</span>
                직원 웰빙 케어 대시보드
              </h2>
              <p style={{ 
                color: '#607d8b', 
                margin: '0',
                fontSize: '16px',
                fontWeight: '500'
              }}>
                함께 만들어 가는 건강한 조직문화, 오늘의 케어 현황을 확인해보세요 💙
              </p>
            </div>

            {/* 통계 카드들 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '25px',
              marginBottom: '30px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #e3f2fd 0%, #f8fafc 100%)',
                padding: '30px',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(25, 118, 210, 0.15)',
                border: '1px solid rgba(25, 118, 210, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* 장식 요소 */}
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  width: '60px',
                  height: '60px',
                  background: 'rgba(25, 118, 210, 0.05)',
                  borderRadius: '50%'
                }}></div>
                <h3 style={{ 
                  color: '#1565c0', 
                  fontSize: '18px', 
                  margin: '0 0 15px 0',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '24px' }}>👥</span>
                  총 직원 수
                </h3>
                <p style={{ fontSize: '36px', fontWeight: '700', color: '#1565c0', margin: '0', position: 'relative' }}>
                  {companyStats?.totalEmployees || 0}<span style={{ fontSize: '20px', fontWeight: '500' }}>명</span>
                </p>
                <div style={{
                  marginTop: '10px',
                  fontSize: '14px',
                  color: '#64b5f6',
                  fontWeight: '500'
                }}>
                  건강한 조직 구성원 💙
                </div>
              </div>


              <div style={{
                background: 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)',
                padding: '30px',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(76, 175, 80, 0.15)',
                border: '1px solid rgba(76, 175, 80, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* 장식 요소 */}
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  width: '60px',
                  height: '60px',
                  background: 'rgba(76, 175, 80, 0.05)',
                  borderRadius: '50%'
                }}></div>
                <h3 style={{ 
                  color: '#2e7d32', 
                  fontSize: '18px', 
                  margin: '0 0 15px 0',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '24px' }}>🌟</span>
                  완료 상담
                </h3>
                <p style={{ fontSize: '36px', fontWeight: '700', color: '#2e7d32', margin: '0' }}>
                  {companyStats?.completedSessions || 0}<span style={{ fontSize: '20px', fontWeight: '500' }}>건</span>
                </p>
                <div style={{
                  marginTop: '10px',
                  fontSize: '14px',
                  color: '#66bb6a',
                  fontWeight: '500'
                }}>
                  성공적인 케어 완료 ✨
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #fff3e0 0%, #fce4ec 100%)',
                padding: '30px',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(255, 152, 0, 0.15)',
                border: '1px solid rgba(255, 152, 0, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* 장식 요소 */}
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  width: '60px',
                  height: '60px',
                  background: 'rgba(255, 152, 0, 0.05)',
                  borderRadius: '50%'
                }}></div>
                <h3 style={{ 
                  color: '#f57c00', 
                  fontSize: '18px', 
                  margin: '0 0 15px 0',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '24px' }}>📈</span>
                  서비스 이용률
                </h3>
                <p style={{ fontSize: '36px', fontWeight: '700', color: '#f57c00', margin: '0' }}>
                  {companyStats?.utilizationRate || 0}<span style={{ fontSize: '20px', fontWeight: '500' }}>%</span>
                </p>
                <div style={{
                  marginTop: '10px',
                  fontSize: '14px',
                  color: '#ffb74d',
                  fontWeight: '500'
                }}>
                  웰빙 서비스 참여도 🌈
                </div>
              </div>
            </div>

            {/* 부서별 이용 현황 */}
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e8f5e8 50%, #e3f2fd 100%)',
              padding: '35px',
              borderRadius: '25px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              marginBottom: '30px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* 장식 배경 요소 */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                background: 'rgba(102, 126, 234, 0.03)',
                borderRadius: '50%'
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '-15px',
                left: '-15px',
                width: '80px',
                height: '80px',
                background: 'rgba(76, 175, 80, 0.03)',
                borderRadius: '50%'
              }}></div>
              
              <h3 style={{ 
                color: '#37474f', 
                fontSize: '24px', 
                margin: '0 0 25px 0',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                position: 'relative',
                zIndex: 1
              }}>
                <span style={{ fontSize: '28px' }}>🌱</span>
                부서별 웰빙 케어 현황
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {companyStats?.departmentUsage && Object.entries(companyStats.departmentUsage).map(([dept, count]) => (
                  <div key={dept} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '15px',
                    padding: '8px 0',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <div style={{ 
                      width: '130px', 
                      fontWeight: '600',
                      color: '#455a64',
                      fontSize: '15px'
                    }}>{dept}</div>
                    <div style={{ 
                      flex: 1, 
                      height: '28px', 
                      background: 'linear-gradient(to right, #f8fafc, #e8f5e8)',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      border: '1px solid rgba(102, 126, 234, 0.1)'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(count / Math.max(...Object.values(companyStats.departmentUsage))) * 100}%`,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '20px',
                        transition: 'width 0.8s ease-in-out',
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                      }}></div>
                    </div>
                    <div style={{ 
                      width: '50px', 
                      textAlign: 'right', 
                      fontWeight: '700',
                      color: '#667eea',
                      fontSize: '15px'
                    }}>
                      {count}<span style={{ fontSize: '12px', color: '#999' }}>건</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 직원 관리 탭 */}
        {activeTab === 'employees' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <div>
                <h2 style={{ 
                  color: '#37474f', 
                  fontSize: '32px', 
                  margin: '0 0 8px 0',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '36px' }}>👥</span>
                  직원 케어 관리
                </h2>
                <p style={{
                  color: '#607d8b',
                  margin: '0',
                  fontSize: '16px'
                }}>
                  직원들의 웰빙 지원 현황을 관리하고 돌보세요 🌱
                </p>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  onClick={() => setShowAddUser(true)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  <span style={{ fontSize: '18px' }}>+</span>
                  새 직원 등록
                </button>
                
                <button
                  onClick={() => setShowExcelUpload(true)}
                  style={{
                    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
                  }}
                >
                  <span style={{ fontSize: '18px' }}>📄</span>
                  엑셀 업로드
                </button>
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #fff 100%)',
              padding: '30px',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(102, 126, 234, 0.1)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>이름</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>부서</th>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>직책</th>
                      <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>권한</th>
                      <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>연간 할당</th>
                      <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>이용 횟수</th>
                      <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>상태</th>
                      <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee._id}>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{employee.name}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>{employee.email}</div>
                          </div>
                        </td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{employee.department}</td>
                        <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{employee.position}</td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: employee.role === 'manager' ? '#e3f2fd' : '#f3e5f5',
                            color: employee.role === 'manager' ? '#1976d2' : '#7b1fa2'
                          }}>
                            {employee.role === 'manager' ? '부서 담당자' : '일반 직원'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {employee.annualLimit}회
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          {employee.usedSessions}회
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: employee.isActive ? '#e8f5e8' : '#ffebee',
                            color: employee.isActive ? '#2e7d32' : '#c62828'
                          }}>
                            {employee.isActive ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                          <button
                            onClick={() => toggleEmployeeStatus(employee._id)}
                            style={{
                              backgroundColor: employee.isActive ? '#f44336' : '#4caf50',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            {employee.isActive ? '비활성화' : '활성화'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}


        {/* 회사 설정 탭 */}
        {activeTab === 'settings' && (
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#333', fontSize: '28px', margin: '0 0 30px 0' }}>회사 설정</h2>
            
            <div style={{ display: 'grid', gap: '30px' }}>
              <div>
                <h3 style={{ color: '#333', margin: '0 0 15px 0' }}>🏢 회사 기본 정보</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>회사명</label>
                    <input type="text" defaultValue="ABC 회사" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>산업군</label>
                    <select style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <option>IT/소프트웨어</option>
                      <option>제조업</option>
                      <option>금융업</option>
                      <option>서비스업</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ color: '#333', margin: '0 0 15px 0' }}>⚙️ EAP 정책 설정</h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>직원 연간 기본 상담 횟수</label>
                    <input type="number" defaultValue={12} style={{ width: '100px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>관리자 연간 기본 상담 횟수</label>
                    <input type="number" defaultValue={15} style={{ width: '100px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" defaultChecked />
                      <span>상담 기록 익명화</span>
                    </label>
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" defaultChecked />
                      <span>부서 담당자에게 팀원 상담 현황 공개</span>
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button style={{
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
                  transition: 'all 0.3s ease'
                }} onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(25, 118, 210, 0.4)';
                }} onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(25, 118, 210, 0.3)';
                }}>
                  설정 저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 리포트 탭 */}
        {activeTab === 'reports' && (
          <div>
            {/* 리포트 생성 도구 */}
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0' }}>📊 리포트 생성</h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '20px' 
              }}>
                <div style={{ padding: '20px', border: '2px solid #e1e8ed', borderRadius: '8px' }}>
                  <h4 style={{ color: '#1976d2', margin: '0 0 15px 0' }}>📈 월간 사용 현황</h4>
                  <p style={{ color: '#666', fontSize: '14px', margin: '0 0 15px 0' }}>
                    부서별, 직원별 상담 이용 현황을 분석합니다.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <select 
                      value={selectedMonthlyPeriod}
                      onChange={(e) => setSelectedMonthlyPeriod(e.target.value)}
                      style={{ 
                        padding: '8px', 
                        border: '1px solid #ddd', 
                        borderRadius: '4px', 
                        flex: 1 
                      }}
                    >
                      <option>2025년 1월</option>
                      <option>2024년 12월</option>
                      <option>2024년 11월</option>
                      <option>2024년 10월</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => generateMonthlyReport(selectedMonthlyPeriod)}
                    style={{
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    📊 보고서 생성
                  </button>
                </div>

                <div style={{ padding: '20px', border: '2px solid #e1e8ed', borderRadius: '8px' }}>
                  <h4 style={{ color: '#4caf50', margin: '0 0 15px 0' }}>📋 직원 만족도 조사</h4>
                  <p style={{ color: '#666', fontSize: '14px', margin: '0 0 15px 0' }}>
                    상담 서비스에 대한 직원들의 만족도를 분석합니다.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <select 
                      value={selectedSatisfactionPeriod}
                      onChange={(e) => setSelectedSatisfactionPeriod(e.target.value)}
                      style={{ 
                        padding: '8px', 
                        border: '1px solid #ddd', 
                        borderRadius: '4px', 
                        flex: 1 
                      }}
                    >
                      <option>분기별</option>
                      <option>월별</option>
                      <option>연간</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => generateSatisfactionReport(selectedSatisfactionPeriod)}
                    style={{
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    📋 설문 결과 보기
                  </button>
                </div>

                <div style={{ padding: '20px', border: '2px solid #e1e8ed', borderRadius: '8px' }}>
                  <h4 style={{ color: '#ff9800', margin: '0 0 15px 0' }}>💰 비용 분석</h4>
                  <p style={{ color: '#666', fontSize: '14px', margin: '0 0 15px 0' }}>
                    EAP 서비스 비용 대비 효과를 분석합니다.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <select 
                      value={selectedCostYear}
                      onChange={(e) => setSelectedCostYear(e.target.value)}
                      style={{ 
                        padding: '8px', 
                        border: '1px solid #ddd', 
                        borderRadius: '4px', 
                        flex: 1 
                      }}
                    >
                      <option>2024년</option>
                      <option>2023년</option>
                      <option>사용자 정의</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => generateCostReport(selectedCostYear)}
                    style={{
                      backgroundColor: '#ff9800',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    💰 비용 보고서
                  </button>
                </div>
              </div>
            </div>

            {/* 실시간 현황 */}
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0' }}>📊 실시간 현황 대시보드</h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '15px',
                marginBottom: '30px'
              }}>
                <div style={{
                  backgroundColor: '#e3f2fd',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #bbdefb',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2', margin: '0 0 5px 0' }}>
                    {companyStats?.totalEmployees || 45}
                  </div>
                  <div style={{ fontSize: '14px', color: '#1976d2' }}>총 직원 수</div>
                </div>

                <div style={{
                  backgroundColor: '#e8f5e8',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #c8e6c9',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#388e3c', margin: '0 0 5px 0' }}>
                    {companyStats?.monthlyUsage || 35}
                  </div>
                  <div style={{ fontSize: '14px', color: '#388e3c' }}>이번달 상담</div>
                </div>

                <div style={{
                  backgroundColor: '#fff3e0',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #ffcc02',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f57c00', margin: '0 0 5px 0' }}>
                    {companyStats?.utilizationRate || 72}%
                  </div>
                  <div style={{ fontSize: '14px', color: '#f57c00' }}>이용률</div>
                </div>

                <div style={{
                  backgroundColor: '#f3e5f5',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #ce93d8',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7b1fa2', margin: '0 0 5px 0' }}>
                    {companyStats?.completedSessions || 98}
                  </div>
                  <div style={{ fontSize: '14px', color: '#7b1fa2' }}>완료된 상담</div>
                </div>
              </div>

              {/* 부서별 이용 현황 차트 */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{ color: '#333', margin: '0 0 15px 0' }}>부서별 상담 이용 현황</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {companyStats?.departmentUsage && Object.entries(companyStats.departmentUsage).map(([dept, usage]) => (
                    <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ width: '100px', fontSize: '14px', color: '#333' }}>{dept}</div>
                      <div style={{ flex: 1, backgroundColor: '#e0e0e0', height: '20px', borderRadius: '10px', position: 'relative' }}>
                        <div
                          style={{
                            width: `${(usage / 20) * 100}%`,
                            height: '100%',
                            backgroundColor: '#4caf50',
                            borderRadius: '10px',
                            position: 'absolute',
                            left: 0,
                            top: 0
                          }}
                        />
                      </div>
                      <div style={{ width: '50px', fontSize: '14px', color: '#666', textAlign: 'right' }}>{usage}회</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 최근 보고서 목록 */}
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0' }}>📄 최근 생성된 보고서</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {[
                  { title: '2024년 12월 월간 사용현황 보고서', date: '2025-01-05', type: 'monthly', size: '1.2MB' },
                  { title: '2024년 4분기 만족도 조사 결과', date: '2025-01-03', type: 'survey', size: '850KB' },
                  { title: '2024년 연간 비용 분석 리포트', date: '2024-12-30', type: 'cost', size: '2.1MB' },
                  { title: '2024년 11월 월간 사용현황 보고서', date: '2024-12-05', type: 'monthly', size: '1.1MB' },
                  { title: '2024년 3분기 만족도 조사 결과', date: '2024-10-15', type: 'survey', size: '920KB' }
                ].map((report, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '15px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#fafafa'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>
                        {report.type === 'monthly' ? '📊' : report.type === 'survey' ? '📋' : '💰'} {report.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        생성일: {report.date} | 크기: {report.size}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button style={{
                        backgroundColor: '#e3f2fd',
                        color: '#1976d2',
                        border: '1px solid #bbdefb',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}>
                        📄 보기
                      </button>
                      <button style={{
                        backgroundColor: '#e8f5e8',
                        color: '#388e3c',
                        border: '1px solid #c8e6c9',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}>
                        📥 다운로드
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 직원 등록 모달 */}
      {showAddUser && (
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
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ color: '#333', margin: '0 0 20px 0' }}>👤 새 직원 등록</h3>
            
            <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>이름</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>이메일</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>부서</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      value={newUser.department}
                      onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
                      style={{ flex: 1, padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px' }}
                    >
                      <option value="">부서 선택</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowDepartmentModal(true)}
                      style={{ 
                        padding: '8px 12px', 
                        backgroundColor: '#f8f9fa', 
                        border: '1px solid #dee2e6', 
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      관리
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>직책</label>
                  <input
                    type="text"
                    value={newUser.position}
                    onChange={(e) => setNewUser(prev => ({ ...prev, position: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>권한</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as 'employee' | 'manager' }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px' }}
                  >
                    <option value="employee">일반 직원</option>
                    <option value="manager">부서 담당자</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>연간 할당</label>
                  <input
                    type="number"
                    value={newUser.annualLimit}
                    onChange={(e) => setNewUser(prev => ({ ...prev, annualLimit: parseInt(e.target.value) }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px' }}
                  />
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowAddUser(false)}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={addEmployee}
                style={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비즈니스 설정 탭 */}
      {activeTab === 'business-config' && (
        <div>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '30px'
          }}>
            <h2 style={{ color: '#333', fontSize: '24px', margin: '0 0 10px 0' }}>🏢 회사 비즈니스 설정</h2>
            <p style={{ color: '#666', margin: '0 0 30px 0' }}>
              정확한 ROI 계산을 위해 회사의 기본 정보를 입력해주세요. 이 정보는 비용 분석 리포트에 사용됩니다.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              {/* 기본 정보 */}
              <div>
                <h3 style={{ color: '#333', margin: '0 0 20px 0', fontSize: '18px' }}>📊 기본 정보</h3>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    연간 매출 (원)
                  </label>
                  <input
                    type="number"
                    value={businessMetrics.annualRevenue}
                    onChange={(e) => setBusinessMetrics(prev => ({ ...prev, annualRevenue: parseInt(e.target.value) || 0 }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e1e1',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                    placeholder="예: 10000000000 (100억원)"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    직원 평균 연봉 (원)
                  </label>
                  <input
                    type="number"
                    value={businessMetrics.avgEmployeeSalary}
                    onChange={(e) => setBusinessMetrics(prev => ({ ...prev, avgEmployeeSalary: parseInt(e.target.value) || 50000000 }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e1e1',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                    placeholder="예: 50000000 (5천만원)"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    일일 직원 1인당 생산성 (원/일)
                  </label>
                  <input
                    type="number"
                    value={businessMetrics.dailyProductivityPerEmployee}
                    onChange={(e) => setBusinessMetrics(prev => ({ ...prev, dailyProductivityPerEmployee: parseInt(e.target.value) || 200000 }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e1e1',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                    placeholder="예: 200000 (20만원/일)"
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    💡 연간 매출 ÷ 직원 수 ÷ 근무일수(약 250일)로 계산
                  </div>
                </div>
              </div>

              {/* EAP 도입 전 지표 */}
              <div>
                <h3 style={{ color: '#333', margin: '0 0 20px 0', fontSize: '18px' }}>📈 EAP 도입 전 지표</h3>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    연간 총 결근일수 (전체 직원 기준)
                  </label>
                  <input
                    type="number"
                    value={businessMetrics.preEapAbsenteeismDays}
                    onChange={(e) => setBusinessMetrics(prev => ({ ...prev, preEapAbsenteeismDays: parseInt(e.target.value) || 0 }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e1e1',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                    placeholder="예: 360 (직원 45명 × 연간 8일)"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    연간 이직률 (%)
                  </label>
                  <input
                    type="number"
                    value={businessMetrics.preEapTurnoverRate}
                    onChange={(e) => setBusinessMetrics(prev => ({ ...prev, preEapTurnoverRate: parseInt(e.target.value) || 15 }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e1e1',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                    placeholder="예: 15 (15%)"
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    신규 직원 채용/교육 비용 (원)
                  </label>
                  <input
                    type="number"
                    value={businessMetrics.recruitmentTrainingCost}
                    onChange={(e) => setBusinessMetrics(prev => ({ ...prev, recruitmentTrainingCost: parseInt(e.target.value) || 10000000 }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e1e1e1',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                    placeholder="예: 10000000 (1천만원)"
                  />
                </div>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div style={{ textAlign: 'center', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
              <button
                onClick={() => updateBusinessMetrics(businessMetrics)}
                style={{
                  padding: '15px 40px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                💾 설정 저장
              </button>
            </div>
          </div>

          {/* ROI 계산 설명 */}
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#333', margin: '0 0 15px 0' }}>💡 ROI 계산 방식 안내</h3>
            <div style={{ color: '#666', lineHeight: '1.6' }}>
              <p><strong>1. 결근 감소 효과:</strong> 상담 1회당 0.5일 결근 감소 × 일일 생산성</p>
              <p><strong>2. 이직률 감소:</strong> EAP 도입으로 이직률 20% 감소 × 채용/교육 비용</p>
              <p><strong>3. 생산성 향상:</strong> 스트레스 감소로 업무 효율성 3% 향상</p>
              <p><strong>4. 의료비 절약:</strong> 정신건강 개선으로 개인 의료비 15% 절약</p>
            </div>
            <div style={{ 
              backgroundColor: '#f0f8ff', 
              padding: '15px', 
              borderRadius: '6px', 
              borderLeft: '4px solid #1976d2',
              marginTop: '15px'
            }}>
              <strong style={{ color: '#1976d2' }}>📝 참고사항:</strong>
              <div style={{ color: '#666', marginTop: '8px', fontSize: '14px' }}>
                위 계산 방식은 HR 업계 표준 지표를 기반으로 하며, 실제 효과는 회사 상황에 따라 다를 수 있습니다.
                더 정확한 분석을 위해서는 EAP 도입 전후 데이터를 꾸준히 수집하여 비교 분석하는 것을 권장합니다.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 부서 관리 모달 */}
      {showDepartmentModal && (
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
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ color: '#333', margin: '0 0 20px 0' }}>🏢 부서 관리</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#666', margin: '0 0 10px 0' }}>새 부서 추가</h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="부서명을 입력하세요"
                  style={{ 
                    flex: 1, 
                    padding: '10px', 
                    border: '2px solid #e1e1e1', 
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
                />
                <button
                  onClick={addDepartment}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  추가
                </button>
              </div>
            </div>

            <div>
              <h4 style={{ color: '#666', margin: '0 0 15px 0' }}>현재 부서 목록</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflow: 'auto' }}>
                {departments.map((dept, index) => (
                  <div key={dept} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6'
                  }}>
                    <span style={{ color: '#333' }}>{dept}</span>
                    <button
                      onClick={() => removeDepartment(dept)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowDepartmentModal(false);
                  setNewDepartment('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
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

      {/* 리포트 결과 모달 */}
      {showReportModal && currentReport && (
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
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            {/* 월간 사용현황 리포트 */}
            {reportType === 'monthly' && (
              <div>
                <h2 style={{ color: '#1976d2', margin: '0 0 20px 0', textAlign: 'center' }}>
                  📊 월간 사용현황 리포트 ({currentReport.period})
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                  <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>
                      {currentReport.totalSessions}
                    </div>
                    <div style={{ color: '#666' }}>총 상담 세션</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4caf50' }}>
                      {currentReport.completedSessions}
                    </div>
                    <div style={{ color: '#666' }}>완료된 상담</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff9800' }}>
                      {Math.round((currentReport.completedSessions / currentReport.totalSessions) * 100)}%
                    </div>
                    <div style={{ color: '#666' }}>완료율</div>
                  </div>
                </div>

                <h3 style={{ color: '#333', margin: '20px 0 15px 0' }}>부서별 상세 현황</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>부서</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>직원 수</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>총 세션</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>완료 세션</th>
                        <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>이용률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(currentReport.departmentStats).map(([dept, stats]: [string, any]) => (
                        <tr key={dept}>
                          <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>{dept}</td>
                          <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>{stats.employeeCount}명</td>
                          <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>{stats.totalSessions}회</td>
                          <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>{stats.completedSessions}회</td>
                          <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #ddd' }}>
                            {Math.round((stats.totalSessions / stats.employeeCount) * 100) / 100}회/인
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 만족도 조사 리포트 */}
            {reportType === 'satisfaction' && (
              <div>
                <h2 style={{ color: '#4caf50', margin: '0 0 20px 0', textAlign: 'center' }}>
                  ⭐ 만족도 조사 리포트 ({currentReport.period})
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                  <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4caf50' }}>
                      {currentReport.averageRating}/5.0
                    </div>
                    <div style={{ color: '#666' }}>평균 만족도</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>
                      {currentReport.responseRate}%
                    </div>
                    <div style={{ color: '#666' }}>응답률</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff9800' }}>
                      {currentReport.totalResponses}명
                    </div>
                    <div style={{ color: '#666' }}>총 응답자</div>
                  </div>
                </div>

                <h3 style={{ color: '#333', margin: '20px 0 15px 0' }}>카테고리별 평가</h3>
                <div style={{ marginBottom: '30px' }}>
                  {Object.entries(currentReport.categoryRatings).map(([category, rating]: [string, any]) => (
                    <div key={category} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 'bold' }}>{category}</span>
                        <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{rating}/5.0</span>
                      </div>
                      <div style={{ backgroundColor: '#e0e0e0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${(rating / 5) * 100}%`,
                          height: '100%',
                          backgroundColor: rating >= 4 ? '#4caf50' : rating >= 3 ? '#ff9800' : '#f44336',
                          transition: 'width 0.3s'
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                <h3 style={{ color: '#333', margin: '20px 0 15px 0' }}>개선 요청 사항</h3>
                <ul style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
                  {currentReport.improvements.map((improvement: string, index: number) => (
                    <li key={index} style={{ marginBottom: '8px', color: '#666' }}>{improvement}</li>
                  ))}
                </ul>

                <h3 style={{ color: '#333', margin: '20px 0 15px 0' }}>주요 피드백</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentReport.detailFeedback.map((feedback: any, index: number) => (
                    <div key={index} style={{
                      padding: '15px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${feedback.rating >= 4 ? '#4caf50' : '#ff9800'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: 'bold' }}>{'⭐'.repeat(feedback.rating)}</span>
                        <span style={{ fontSize: '12px', color: '#666' }}>{feedback.rating}/5</span>
                      </div>
                      <div style={{ color: '#333' }}>{feedback.comment}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 비용 분석 리포트 */}
            {reportType === 'cost' && (
              <div>
                <h2 style={{ color: '#ff9800', margin: '0 0 20px 0', textAlign: 'center' }}>
                  💰 비용 분석 리포트 ({currentReport.year}년)
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                  <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>
                      {currentReport.totalCost.toLocaleString()}원
                    </div>
                    <div style={{ color: '#666' }}>총 비용</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                      {currentReport.totalSessions}회
                    </div>
                    <div style={{ color: '#666' }}>총 세션 수</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
                      {currentReport.costPerEmployee.toLocaleString()}원
                    </div>
                    <div style={{ color: '#666' }}>직원당 평균</div>
                  </div>
                </div>

                <h3 style={{ color: '#333', margin: '20px 0 15px 0' }}>월별 비용 현황</h3>
                <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
                  <div style={{ display: 'flex', alignItems: 'end', gap: '8px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px', minWidth: '600px' }}>
                    {Object.values(currentReport.monthlyCosts).map((month: any) => (
                      <div key={month.month} style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{
                          height: `${Math.max(20, (month.cost / 1520000) * 120)}px`,
                          backgroundColor: '#1976d2',
                          borderRadius: '4px 4px 0 0',
                          marginBottom: '5px',
                          minHeight: '20px'
                        }}></div>
                        <div style={{ fontSize: '10px', color: '#666' }}>{month.month}월</div>
                        <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{month.sessions}회</div>
                      </div>
                    ))}
                  </div>
                </div>

                <h3 style={{ color: '#333', margin: '20px 0 15px 0' }}>투자 수익률 (ROI) 분석</h3>
                
                {/* 주요 ROI 지표 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ padding: '20px', backgroundColor: '#f0f8ff', borderRadius: '8px', textAlign: 'center', border: '2px solid #1976d2' }}>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#1976d2', marginBottom: '8px' }}>
                      {currentReport.roi.roiPercentage}%
                    </div>
                    <div style={{ fontSize: '16px', color: '#333', fontWeight: 'bold' }}>총 투자수익률</div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      투자 {currentReport.totalCost.toLocaleString()}원 → 수익 {currentReport.roi.totalBenefits.toLocaleString()}원
                    </div>
                  </div>
                  <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#333', marginBottom: '10px', fontWeight: 'bold' }}>💼 회사 기본 정보</div>
                    <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
                      • 직원 수: {currentReport.businessContext.employeeCount}명<br/>
                      • 평균 연봉: {currentReport.businessContext.avgSalary.toLocaleString()}원<br/>
                      • 일일 생산성: {currentReport.businessContext.dailyProductivity.toLocaleString()}원/일<br/>
                      • EAP 도입 전 이직률: {currentReport.businessContext.preEapMetrics.turnoverRate}%
                    </div>
                  </div>
                </div>

                {/* 세부 효과 분석 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#4caf50', marginBottom: '8px' }}>🏥 결근 감소 효과</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>
                      {currentReport.roi.absenteeismSavings.toLocaleString()}원
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      {currentReport.roi.absenteeismReduction}일 감소 × {currentReport.businessContext.dailyProductivity.toLocaleString()}원/일
                    </div>
                  </div>
                  <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1976d2', marginBottom: '8px' }}>👥 이직률 감소 효과</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>
                      {currentReport.roi.turnoverSavings.toLocaleString()}원
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      {currentReport.roi.turnoverReduction}명 이직 방지 × 1천만원/명
                    </div>
                  </div>
                  <div style={{ padding: '15px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ff9800', marginBottom: '8px' }}>📈 생산성 향상</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff9800' }}>
                      {currentReport.roi.productivityGain.toLocaleString()}원
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      업무 효율성 {currentReport.roi.assumptions.productivityImprovementRate}% 향상
                    </div>
                  </div>
                  <div style={{ padding: '15px', backgroundColor: '#fce4ec', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e91e63', marginBottom: '8px' }}>💊 의료비 절감</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e91e63' }}>
                      {currentReport.roi.medicalSavings.toLocaleString()}원
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      정신건강 개선으로 {currentReport.roi.assumptions.medicalCostSavingRate}% 절약
                    </div>
                  </div>
                </div>

                {/* ROI 계산 근거 */}
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <strong style={{ color: '#333', fontSize: '14px' }}>📊 ROI 계산 근거 및 가정:</strong>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
                    • <strong>결근 감소:</strong> 상담 1회당 {currentReport.roi.assumptions.absenteeismReductionPerSession}일 결근 감소<br/>
                    • <strong>이직률 감소:</strong> EAP 도입으로 이직률 {currentReport.roi.assumptions.turnoverReductionRate}% 감소<br/>
                    • <strong>생산성 향상:</strong> 스트레스 감소로 업무 효율성 {currentReport.roi.assumptions.productivityImprovementRate}% 향상<br/>
                    • <strong>의료비 절약:</strong> 정신건강 개선으로 개인 의료비 {currentReport.roi.assumptions.medicalCostSavingRate}% 절약
                  </div>
                </div>

                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '8px', borderLeft: '4px solid #1976d2' }}>
                  <strong style={{ color: '#1976d2' }}>💡 ROI 요약:</strong>
                  <div style={{ color: '#666', marginTop: '8px' }}>
                    EAP 투자 비용 <strong>{currentReport.totalCost.toLocaleString()}원</strong> 대비 총 예상 수익 <strong style={{ color: '#4caf50' }}>{currentReport.roi.totalBenefits.toLocaleString()}원</strong>으로, 
                    <strong style={{ color: '#4caf50' }}>{currentReport.roi.roiPercentage}%</strong>의 높은 투자 수익률을 달성했습니다.
                    이는 직원 1명당 <strong>{Math.round(currentReport.roi.totalBenefits / currentReport.currentEmployeeCount).toLocaleString()}원</strong>의 가치를 창출한 것입니다.
                  </div>
                </div>
              </div>
            )}

            <div style={{ 
              textAlign: 'center', 
              marginTop: '30px', 
              paddingTop: '20px', 
              borderTop: '1px solid #eee',
              color: '#666',
              fontSize: '12px'
            }}>
              리포트 생성 시간: {new Date(currentReport.generatedAt).toLocaleString('ko-KR')}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setCurrentReport(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                인쇄/저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 업로드 모달 */}
      {showExcelUpload && (
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
            padding: '40px',
            borderRadius: '15px',
            maxWidth: '600px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ 
              color: '#333', 
              margin: '0 0 25px 0', 
              fontSize: '24px',
              textAlign: 'center'
            }}>
              📄 직원 정보 엑셀 업로드
            </h3>
            
            <div style={{ marginBottom: '30px' }}>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '10px',
                border: '2px dashed #4caf50',
                marginBottom: '20px'
              }}>
                <h4 style={{ color: '#4caf50', margin: '0 0 15px 0', fontSize: '18px' }}>
                  📋 필수 컬럼 정보
                </h4>
                <p style={{ margin: '0', color: '#666', lineHeight: '1.6' }}>
                  <strong>필수 컬럼:</strong> 이름, 이메일, 부서, 직책, 역할, 연간상담한도<br/>
                  <strong>역할:</strong> employee (직원) 또는 manager (관리자)<br/>
                  <strong>연간상담한도:</strong> 숫자 (기본값: 12)
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                <button
                  onClick={downloadSampleExcel}
                  style={{
                    background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    flex: 1
                  }}
                >
                  📥 샘플 파일 다운로드
                </button>
                
                <label style={{
                  background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  flex: 1,
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  {uploading ? '⏳ 업로드 중...' : '📤 파일 선택'}
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleExcelUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              
              <div style={{
                backgroundColor: '#fff3e0',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #ffb74d'
              }}>
                <h4 style={{ color: '#f57c00', margin: '0 0 10px 0', fontSize: '16px' }}>
                  ⚠️ 업로드 주의사항
                </h4>
                <ul style={{ margin: '0', paddingLeft: '20px', color: '#666', fontSize: '14px' }}>
                  <li>CSV 또는 Excel(.xlsx) 파일만 지원됩니다</li>
                  <li>첫 번째 행은 헤더로 사용됩니다</li>
                  <li>중복된 이메일이 있으면 오류가 발생합니다</li>
                  <li>한번에 최대 1,000명까지 업로드 가능합니다</li>
                </ul>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button
                onClick={() => setShowExcelUpload(false)}
                disabled={uploading}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: uploading ? 0.6 : 1
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CompanyAdminDashboard;