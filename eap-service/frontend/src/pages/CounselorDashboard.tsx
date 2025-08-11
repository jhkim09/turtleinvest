import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NotificationBell from '../components/Notifications/NotificationBell.tsx';

interface CounselorDashboardProps {
  user: any;
  onLogout: () => void;
}

interface Appointment {
  _id: string;
  date: string;
  time: string;
  type: 'individual' | 'group';
  topic: string;
  urgency: 'low' | 'normal' | 'high';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  notes: string;
  client: {
    _id: string;
    name: string;
    email: string;
    department: string;
    position: string;
  };
  counselingRecord?: {
    summary: string;
    recommendations: string;
    followUpNeeded: boolean;
    nextSessionDate?: string;
  };
}

interface DailyStats {
  totalAppointments: number;
  completedToday: number;
  upcomingToday: number;
  highPriorityCount: number;
}

const CounselorDashboard: React.FC<CounselorDashboardProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showClientHistory, setShowClientHistory] = useState(false);
  const [recordForm, setRecordForm] = useState({
    summary: '',
    recommendations: '',
    followUpNeeded: false,
    nextSessionDate: ''
  });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [counselorProfile, setCounselorProfile] = useState({
    taxRate: 3.3,
    customRate: 50000,
    useSystemRate: true
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchCounselorData();
    loadCounselorProfile();
  }, []);

  const fetchCounselorData = async () => {
    try {
      
      const token = localStorage.getItem('token');
      
      // 상담사 예약 목록 조회 (counseling-sessions 사용)
      const sessionsResponse = await axios.get('http://localhost:3000/api/counseling-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 상담 세션 데이터를 예약 형식으로 변환
      const sessions = sessionsResponse.data.sessions || sessionsResponse.data;
      const formattedAppointments = sessions.map((session: any) => ({
        _id: session._id,
        date: new Date(session.appointmentDate).toISOString().split('T')[0],
        time: new Date(session.appointmentDate).toTimeString().substr(0, 5),
        type: session.sessionType || 'individual',
        topic: session.topic,
        urgency: session.urgencyLevel === 'high' ? 'high' : 
                session.urgencyLevel === 'medium' ? 'normal' : 'low',
        status: session.status,
        notes: session.sessionNotes || '',
        client: {
          _id: session.employee?._id || '',
          name: session.employee?.name || 'Unknown',
          email: session.employee?.email || '',
          department: session.employee?.department || '',
          position: session.employee?.position || ''
        },
        counselingRecord: session.recommendations ? {
          summary: session.sessionNotes || '',
          recommendations: session.recommendations || '',
          followUpNeeded: session.followUpRequired || false,
          nextSessionDate: ''
        } : undefined
      }));
      setAppointments(formattedAppointments);
      
      // 간단한 통계 계산
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = formattedAppointments.filter((apt: any) => apt.date === today);
      const stats = {
        totalAppointments: formattedAppointments.length,
        completedToday: todayAppointments.filter((apt: any) => apt.status === 'completed').length,
        upcomingToday: todayAppointments.filter((apt: any) => apt.status === 'scheduled').length,
        highPriorityCount: formattedAppointments.filter((apt: any) => apt.urgency === 'high').length
      };
      setDailyStats(stats);
      
    } catch (error) {
      console.error('Counselor data fetch failed:', error);
      // 데모 데이터 사용
      const demoAppointments: Appointment[] = [
        {
          _id: '1',
          date: '2025-08-10',
          time: '09:00',
          type: 'individual',
          topic: '스트레스 관리',
          urgency: 'high',
          status: 'scheduled',
          notes: '업무 스트레스로 인한 불안감 호소',
          client: {
            _id: 'c1',
            name: '김직원',
            email: 'kim@company.com',
            department: 'IT개발팀',
            position: '선임연구원'
          }
        },
        {
          _id: '2',
          date: '2025-08-10',
          time: '10:30',
          type: 'individual',
          topic: '인간관계',
          urgency: 'normal',
          status: 'completed',
          notes: '동료와의 갈등 상황 상담',
          client: {
            _id: 'c2',
            name: '이사원',
            email: 'lee@company.com',
            department: 'IT개발팀',
            position: '주임연구원'
          },
          counselingRecord: {
            summary: '동료와의 의사소통 문제로 인한 갈등 상황. 상호 이해 부족이 주요 원인.',
            recommendations: '1. 적극적 경청 연습\n2. 감정 표현 방법 개선\n3. 정기적 팀 미팅 참여',
            followUpNeeded: true,
            nextSessionDate: '2025-08-24'
          }
        },
        {
          _id: '3',
          date: '2025-08-10',
          time: '14:00',
          type: 'group',
          topic: '워라밸',
          urgency: 'normal',
          status: 'scheduled',
          notes: '팀 전체 워라밸 개선 방안 논의',
          client: {
            _id: 'c3',
            name: '박대리',
            email: 'park@company.com',
            department: 'IT개발팀',
            position: '책임연구원'
          }
        },
        {
          _id: '4',
          date: '2025-08-10',
          time: '15:30',
          type: 'individual',
          topic: '진로 상담',
          urgency: 'low',
          status: 'scheduled',
          notes: '승진 관련 고민 상담',
          client: {
            _id: 'c4',
            name: '최과장',
            email: 'choi@company.com',
            department: '마케팅팀',
            position: '과장'
          }
        }
      ];
      
      setAppointments(demoAppointments);
      setDailyStats({
        totalAppointments: 4,
        completedToday: 1,
        upcomingToday: 3,
        highPriorityCount: 1
      });
    } finally {
      setLoading(false);
    }
  };


  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
  };

  const openRecordModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    if (appointment.counselingRecord) {
      setRecordForm({
        summary: appointment.counselingRecord.summary,
        recommendations: appointment.counselingRecord.recommendations,
        followUpNeeded: appointment.counselingRecord.followUpNeeded,
        nextSessionDate: appointment.counselingRecord.nextSessionDate || ''
      });
    } else {
      setRecordForm({
        summary: '',
        recommendations: '',
        followUpNeeded: false,
        nextSessionDate: ''
      });
    }
    setShowRecordModal(true);
  };

  const closeRecordModal = () => {
    setShowRecordModal(false);
    setSelectedAppointment(null);
    setRecordForm({
      summary: '',
      recommendations: '',
      followUpNeeded: false,
      nextSessionDate: ''
    });
  };

  const saveRecord = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // 올바른 상담 기록 작성 API 사용
      const recordData = {
        appointmentId: selectedAppointment?._id,
        sessionDate: new Date().toISOString(),
        sessionType: 'individual',
        mainIssues: ['stress'],
        sessionNotes: recordForm.summary,
        recommendations: recordForm.recommendations,
        followUpRequired: recordForm.followUpNeeded,
        nextAppointmentDate: recordForm.nextSessionDate ? new Date(recordForm.nextSessionDate).toISOString() : null,
        riskLevel: 'low'
      };
      
      await axios.post('http://localhost:3000/api/counseling/records', recordData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 로컬 상태 업데이트
      setAppointments(prev => prev.map(apt => 
        apt._id === selectedAppointment?._id 
          ? { ...apt, counselingRecord: recordForm, status: 'completed' as const }
          : apt
      ));
      
      closeRecordModal();
      alert('상담 기록이 저장되었습니다!');
    } catch (error) {
      // 데모 모드에서도 동작
      setAppointments(prev => prev.map(apt => 
        apt._id === selectedAppointment?._id 
          ? { ...apt, counselingRecord: recordForm, status: 'completed' as const }
          : apt
      ));
      closeRecordModal();
      alert('상담 기록이 저장되었습니다! (데모 모드)');
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3000/api/counselor/appointments/${appointmentId}/status`, 
        { status: newStatus }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.log('Status update failed, using demo mode');
    }
    
    setAppointments(prev => prev.map(apt => 
      apt._id === appointmentId ? { ...apt, status: newStatus as any } : apt
    ));
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return '#f44336';
      case 'normal': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#999';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4caf50';
      case 'in-progress': return '#2196f3';
      case 'scheduled': return '#ff9800';
      case 'cancelled': return '#f44336';
      default: return '#999';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'in-progress': return '진행중';
      case 'scheduled': return '예정';
      case 'cancelled': return '취소';
      default: return status;
    }
  };

  const loadCounselorProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.role === 'counselor') {
        setCounselorProfile({
          taxRate: response.data.taxRate || 3.3,
          customRate: response.data.customRate || 50000,
          useSystemRate: response.data.useSystemRate !== false
        });
      }
    } catch (error) {
      console.log('프로필 로딩 실패, 기본값 사용');
    }
  };

  const updateCounselorProfile = async (profileData: any) => {
    setProfileLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:3000/api/users/profile', profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCounselorProfile(prev => ({ ...prev, ...profileData }));
      alert('프로필이 업데이트되었습니다!');
    } catch (error) {
      // 데모 모드
      setCounselorProfile(prev => ({ ...prev, ...profileData }));
      alert('프로필이 업데이트되었습니다! (데모 모드)');
    } finally {
      setProfileLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const statusMatch = filterStatus === 'all' || apt.status === filterStatus;
    const urgencyMatch = filterUrgency === 'all' || apt.urgency === filterUrgency;
    return statusMatch && urgencyMatch;
  });

  const todayAppointments = appointments.filter(apt => apt.date === '2025-08-10');

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
          <h2 style={{ color: '#333' }}>상담사 대시보드 로딩 중...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom, #f8fafc 0%, #f3e5f5 50%, #e8eaf6 100%)', 
      fontFamily: '"Segoe UI", "Malgun Gothic", sans-serif' 
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)',
        color: 'white',
        padding: '0',
        boxShadow: '0 4px 20px rgba(156, 39, 176, 0.25)',
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
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '24px 20px', 
          position: 'relative', 
          zIndex: 1 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ 
                color: 'white', 
                fontSize: '32px', 
                fontWeight: '700', 
                margin: '0', 
                textShadow: '0 2px 4px rgba(0,0,0,0.1)' 
              }}>
                🧠 상담사 대시보드
              </h1>
              <p style={{ 
                color: 'rgba(255, 255, 255, 0.9)', 
                margin: '8px 0 0 0', 
                fontSize: '16px', 
                fontWeight: '300' 
              }}>
                상담 관리 및 기록 시스템
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <NotificationBell userRole={user?.role || 'counselor'} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  color: 'white', 
                  fontSize: '16px', 
                  fontWeight: '600' 
                }}>
                  {user?.name}님
                </div>
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: '14px' 
                }}>
                  전문 상담사
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
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
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
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(156, 39, 176, 0.1)',
        padding: '0',
        boxShadow: '0 2px 10px rgba(156, 39, 176, 0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            {[
              { name: '오늘 일정', key: 'schedule' },
              { name: '전체 예약', key: 'appointments' },
              { name: '상담 기록', key: 'records' },
              { name: '고객 관리', key: 'clients' },
              { name: '통계', key: 'stats' },
              { name: '프로필 설정', key: 'profile' }
            ].map((item, index) => (
              <div
                key={index}
                onClick={() => setActiveTab(item.key)}
                style={{
                  padding: '12px 20px',
                  cursor: 'pointer',
                  borderBottom: activeTab === item.key ? '3px solid #9c27b0' : '3px solid transparent',
                  color: activeTab === item.key ? '#9c27b0' : '#666',
                  fontWeight: activeTab === item.key ? '600' : 'normal',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== item.key) {
                    e.currentTarget.style.color = '#9c27b0';
                    e.currentTarget.style.backgroundColor = 'rgba(156, 39, 176, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== item.key) {
                    e.currentTarget.style.color = '#666';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#333', fontSize: '28px', margin: '0 0 10px 0' }}>
            {activeTab === 'schedule' && '오늘 일정'}
            {activeTab === 'appointments' && '전체 예약'}
            {activeTab === 'records' && '상담 기록'}
            {activeTab === 'clients' && '고객 관리'}
            {activeTab === 'stats' && '통계'}
            {activeTab === 'profile' && '프로필 설정'}
          </h2>
          <p style={{ color: '#666', margin: '0' }}>
            {activeTab === 'schedule' && '오늘의 상담 일정과 업무 현황을 관리하세요'}
            {activeTab === 'appointments' && '모든 상담 예약을 확인하고 관리하세요'}
            {activeTab === 'records' && '작성한 상담 기록을 관리하세요'}
            {activeTab === 'clients' && '고객 정보와 상담 이력을 관리하세요'}
            {activeTab === 'stats' && '상담 성과와 통계를 확인하세요'}
            {activeTab === 'profile' && '프로필과 세금 설정을 관리하세요'}
          </p>
        </div>

        {/* 오늘 일정 탭 */}
        {activeTab === 'schedule' && (
          <>

        {/* 오늘의 통계 카드들 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '30px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(156, 39, 176, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{ color: '#9c27b0', fontSize: '16px', margin: '0 0 10px 0', fontWeight: '600' }}>
              📅 오늘 총 예약
            </h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
              {dailyStats?.totalAppointments || 0}건
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '30px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(76, 175, 80, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{ color: '#4caf50', fontSize: '16px', margin: '0 0 10px 0', fontWeight: '600' }}>
              ✅ 완료
            </h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
              {dailyStats?.completedToday || 0}건
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '30px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(255, 152, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{ color: '#ff9800', fontSize: '16px', margin: '0 0 10px 0', fontWeight: '600' }}>
              ⏰ 예정
            </h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
              {dailyStats?.upcomingToday || 0}건
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '30px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{ color: '#f44336', fontSize: '16px', margin: '0 0 10px 0', fontWeight: '600' }}>
              🚨 긴급
            </h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
              {dailyStats?.highPriorityCount || 0}건
            </p>
          </div>
        </div>

        {/* 오늘의 상담 일정 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '30px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(156, 39, 176, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0' }}>
            📋 오늘의 상담 일정 ({new Date().toLocaleDateString('ko-KR')})
          </h3>
          
          {todayAppointments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {todayAppointments.map((appointment) => (
                <div key={appointment._id} style={{
                  backgroundColor: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  borderLeft: `5px solid ${getUrgencyColor(appointment.urgency)}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <strong style={{ color: '#333', fontSize: '18px' }}>
                          🕐 {appointment.time}
                        </strong>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: `${getStatusColor(appointment.status)}20`,
                          color: getStatusColor(appointment.status)
                        }}>
                          {getStatusLabel(appointment.status)}
                        </span>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: `${getUrgencyColor(appointment.urgency)}20`,
                          color: getUrgencyColor(appointment.urgency)
                        }}>
                          {appointment.urgency === 'high' ? '🚨 높음' : appointment.urgency === 'normal' ? '🟡 보통' : '🟢 낮음'}
                        </span>
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <strong>👤 고객:</strong> {appointment.client.name} ({appointment.client.position})
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <strong>💬 주제:</strong> {appointment.topic} ({appointment.type === 'individual' ? '개인상담' : '그룹상담'})
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <strong>🏢 부서:</strong> {appointment.client.department}
                      </div>
                      {appointment.notes && (
                        <div style={{ color: '#666', fontSize: '14px' }}>
                          <strong>📝 메모:</strong> {appointment.notes}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {appointment.status === 'scheduled' && (
                        <button
                          onClick={() => updateAppointmentStatus(appointment._id, 'in-progress')}
                          style={{
                            backgroundColor: '#2196f3',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          시작
                        </button>
                      )}
                      
                      {appointment.status !== 'cancelled' && (
                        <button
                          onClick={() => openRecordModal(appointment)}
                          style={{
                            backgroundColor: appointment.counselingRecord ? '#4caf50' : '#1976d2',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {appointment.counselingRecord ? '기록 수정' : '기록 작성'}
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowClientHistory(true);
                        }}
                        style={{
                          backgroundColor: '#ff9800',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        고객 이력
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
              오늘 예정된 상담이 없습니다.
            </p>
          )}
        </div>

        {/* 전체 예약 관리 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '30px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(156, 39, 176, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#333', fontSize: '20px', margin: '0' }}>
              📊 전체 예약 관리
            </h3>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="all">전체 상태</option>
                <option value="scheduled">예정</option>
                <option value="in-progress">진행중</option>
                <option value="completed">완료</option>
                <option value="cancelled">취소</option>
              </select>
              
              <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="all">전체 긴급도</option>
                <option value="high">높음</option>
                <option value="normal">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>날짜/시간</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>고객</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>주제</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>긴급도</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>상태</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>기록</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                      <div>{appointment.date}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{appointment.time}</div>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                      <div style={{ fontWeight: 'bold' }}>{appointment.client.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{appointment.client.department}</div>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                      <div>{appointment.topic}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {appointment.type === 'individual' ? '개인상담' : '그룹상담'}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        backgroundColor: `${getUrgencyColor(appointment.urgency)}20`,
                        color: getUrgencyColor(appointment.urgency)
                      }}>
                        {appointment.urgency === 'high' ? '높음' : appointment.urgency === 'normal' ? '보통' : '낮음'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        backgroundColor: `${getStatusColor(appointment.status)}20`,
                        color: getStatusColor(appointment.status)
                      }}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                      {appointment.counselingRecord ? '✅' : '⭕'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <button
                        onClick={() => openRecordModal(appointment)}
                        style={{
                          backgroundColor: '#1976d2',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          marginRight: '4px'
                        }}
                      >
                        기록
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

        {/* 전체 예약 탭 */}
        {activeTab === 'appointments' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '30px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(156, 39, 176, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#333', margin: '0' }}>📅 모든 상담 예약</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">전체 상태</option>
                  <option value="scheduled">예정</option>
                  <option value="completed">완료</option>
                  <option value="cancelled">취소</option>
                </select>
                <select
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="all">전체 긴급도</option>
                  <option value="high">높음</option>
                  <option value="normal">보통</option>
                  <option value="low">낮음</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>날짜/시간</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>고객</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>상담 주제</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>상태</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>긴급도</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments
                    .filter(apt => filterStatus === 'all' || apt.status === filterStatus)
                    .filter(apt => filterUrgency === 'all' || apt.urgency === filterUrgency)
                    .map((appointment) => (
                    <tr key={appointment._id}>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <div>
                          <strong>{appointment.date}</strong><br />
                          <span style={{ color: '#666', fontSize: '14px' }}>{appointment.time}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <div>
                          <strong>{appointment.client.name}</strong><br />
                          <span style={{ color: '#666', fontSize: '12px' }}>{appointment.client.department}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <span>{appointment.topic}</span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: appointment.status === 'completed' ? '#e8f5e8' : 
                                         appointment.status === 'scheduled' ? '#e3f2fd' : '#ffebee',
                          color: appointment.status === 'completed' ? '#2e7d32' : 
                                 appointment.status === 'scheduled' ? '#1565c0' : '#d32f2f'
                        }}>
                          {appointment.status === 'completed' ? '완료' : 
                           appointment.status === 'scheduled' ? '예정' : '취소'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          backgroundColor: getUrgencyColor(appointment.urgency).bg,
                          color: getUrgencyColor(appointment.urgency).text
                        }}>
                          {appointment.urgency === 'high' ? '높음' : 
                           appointment.urgency === 'normal' ? '보통' : '낮음'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {appointment.status === 'scheduled' && (
                            <>
                              <button
                                onClick={() => updateAppointmentStatus(appointment._id, 'in-progress')}
                                style={{
                                  backgroundColor: '#1976d2',
                                  color: 'white',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                시작
                              </button>
                              <button
                                onClick={() => openRecordModal(appointment)}
                                style={{
                                  backgroundColor: '#4caf50',
                                  color: 'white',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                기록
                              </button>
                            </>
                          )}
                          {appointment.status === 'in-progress' && (
                            <button
                              onClick={() => openRecordModal(appointment)}
                              style={{
                                backgroundColor: '#4caf50',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              완료
                            </button>
                          )}
                          {appointment.counselingRecord && (
                            <button
                              onClick={() => openRecordModal(appointment)}
                              style={{
                                backgroundColor: '#ff9800',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              수정
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 상담 기록 탭 */}
        {activeTab === 'records' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '30px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(156, 39, 176, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h3 style={{ color: '#333', marginBottom: '20px' }}>📝 작성한 상담 기록</h3>
            <div style={{ display: 'grid', gap: '20px' }}>
              {appointments
                .filter(apt => apt.counselingRecord)
                .map(appointment => (
                <div key={appointment._id} style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>
                        {appointment.client.name} - {appointment.topic}
                      </h4>
                      <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                        {appointment.date} {appointment.time} | {appointment.client.department}
                      </p>
                    </div>
                    <button
                      onClick={() => openRecordModal(appointment)}
                      style={{
                        backgroundColor: '#1976d2',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      수정
                    </button>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <h5 style={{ margin: '0 0 8px 0', color: '#333' }}>상담 요약</h5>
                    <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
                      {appointment.counselingRecord?.summary || '작성된 요약이 없습니다.'}
                    </p>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <h5 style={{ margin: '0 0 8px 0', color: '#333' }}>권고사항</h5>
                    <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
                      {appointment.counselingRecord?.recommendations || '작성된 권고사항이 없습니다.'}
                    </p>
                  </div>
                  {appointment.counselingRecord?.followUpNeeded && (
                    <div style={{
                      backgroundColor: '#fff3e0',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #ffcc02'
                    }}>
                      <small style={{ color: '#e65100' }}>🔄 후속 상담 필요</small>
                    </div>
                  )}
                </div>
              ))}
              {appointments.filter(apt => apt.counselingRecord).length === 0 && (
                <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                  작성된 상담 기록이 없습니다.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 고객 관리 탭 */}
        {activeTab === 'clients' && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '30px',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(156, 39, 176, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h3 style={{ color: '#333', marginBottom: '20px' }}>👥 고객 관리</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              {Array.from(new Map(appointments.map(apt => [apt.client._id, apt.client])).values()).map(client => {
                const clientAppointments = appointments.filter(apt => apt.client._id === client._id);
                const completedCount = clientAppointments.filter(apt => apt.status === 'completed').length;
                const upcomingCount = clientAppointments.filter(apt => apt.status === 'scheduled').length;
                
                return (
                  <div key={client._id} style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>{client.name}</h4>
                      <p style={{ margin: '0 0 4px 0', color: '#666', fontSize: '14px' }}>
                        {client.department} | {client.email}
                      </p>
                      <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#888' }}>
                        <span>완료: {completedCount}건</span>
                        <span>예정: {upcomingCount}건</span>
                        <span>총 상담: {clientAppointments.length}건</span>
                      </div>
                    </div>
                    <button
                      style={{
                        backgroundColor: '#1976d2',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      상담 이력
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 통계 탭 */}
        {activeTab === 'stats' && (
          <div>
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
                  📊 총 상담 세션
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {appointments.length}건
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ color: '#4caf50', fontSize: '16px', margin: '0 0 10px 0' }}>
                  ✅ 완료율
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {appointments.length > 0 ? Math.round((appointments.filter(apt => apt.status === 'completed').length / appointments.length) * 100) : 0}%
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ color: '#ff9800', fontSize: '16px', margin: '0 0 10px 0' }}>
                  👥 총 고객 수
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {new Set(appointments.map(apt => apt.client._id)).size}명
                </p>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ color: '#f44336', fontSize: '16px', margin: '0 0 10px 0' }}>
                  🚨 긴급 상담
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {appointments.filter(apt => apt.urgency === 'high').length}건
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#333', marginBottom: '20px' }}>📈 월별 상담 현황</h3>
              <div style={{ 
                height: '200px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                color: '#666'
              }}>
                차트 기능은 개발 예정입니다
              </div>
            </div>
          </div>
        )}

        {/* 프로필 설정 탭 */}
        {activeTab === 'profile' && (
          <div style={{
            display: 'grid',
            gap: '30px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))'
          }}>
            {/* 세금 설정 카드 */}
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0' }}>
                💰 세금 설정
              </h3>
              
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
                  적용 세율
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="radio"
                      name="taxRate"
                      checked={counselorProfile.taxRate === 3.3}
                      onChange={() => updateCounselorProfile({ taxRate: 3.3 })}
                      disabled={profileLoading}
                    />
                    <span style={{ color: '#333' }}>3.3% (사업소득세)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="radio"
                      name="taxRate"
                      checked={counselorProfile.taxRate === 10}
                      onChange={() => updateCounselorProfile({ taxRate: 10 })}
                      disabled={profileLoading}
                    />
                    <span style={{ color: '#333' }}>10% (부가세)</span>
                  </label>
                </div>
              </div>

              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '6px',
                marginTop: '20px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>현재 설정</h4>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <div>적용 세율: <strong>{counselorProfile.taxRate}%</strong></div>
                  <div style={{ marginTop: '5px' }}>
                    예상 수수료 (50,000원 기준): <strong>{Math.round(50000 * (counselorProfile.taxRate / 100))}원</strong>
                  </div>
                  <div style={{ marginTop: '5px' }}>
                    실수령액: <strong>{50000 - Math.round(50000 * (counselorProfile.taxRate / 100))}원</strong>
                  </div>
                </div>
              </div>

              {profileLoading && (
                <div style={{
                  backgroundColor: '#e3f2fd',
                  padding: '10px',
                  borderRadius: '4px',
                  marginTop: '15px',
                  textAlign: 'center',
                  color: '#1976d2'
                }}>
                  설정을 저장하는 중...
                </div>
              )}
            </div>

            {/* 요율 설정 카드 */}
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0' }}>
                📋 상담 요율 설정
              </h3>
              
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                  <input
                    type="checkbox"
                    checked={counselorProfile.useSystemRate}
                    onChange={(e) => updateCounselorProfile({ useSystemRate: e.target.checked })}
                    disabled={profileLoading}
                  />
                  <span style={{ fontWeight: 'bold', color: '#333' }}>시스템 기본 요율 사용</span>
                </label>
                
                {!counselorProfile.useSystemRate && (
                  <div style={{ marginTop: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                      개인 설정 요율 (원)
                    </label>
                    <input
                      type="number"
                      value={counselorProfile.customRate}
                      onChange={(e) => setCounselorProfile(prev => ({ ...prev, customRate: Number(e.target.value) }))}
                      onBlur={() => updateCounselorProfile({ customRate: counselorProfile.customRate })}
                      min="10000"
                      max="200000"
                      step="1000"
                      disabled={profileLoading}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '2px solid #e1e1e1',
                        borderRadius: '6px',
                        fontSize: '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{
                backgroundColor: '#fff3e0',
                padding: '15px',
                borderRadius: '6px',
                marginTop: '20px',
                border: '1px solid #ffb74d'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#f57c00' }}>💡 안내사항</h4>
                <ul style={{ margin: '0', paddingLeft: '18px', fontSize: '14px', color: '#e65100' }}>
                  <li>개인 설정 요율은 시스템 기본 요율보다 우선 적용됩니다.</li>
                  <li>요율 변경은 다음 상담부터 적용됩니다.</li>
                  <li>세금 설정은 정산 시 자동으로 계산됩니다.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 상담 기록 작성 모달 */}
      {showRecordModal && selectedAppointment && (
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
            maxWidth: '700px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ color: '#333', margin: '0 0 20px 0' }}>
              📝 상담 기록 작성 - {selectedAppointment.client.name}님
            </h3>
            
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              <div><strong>📅 날짜:</strong> {selectedAppointment.date} {selectedAppointment.time}</div>
              <div><strong>💬 주제:</strong> {selectedAppointment.topic}</div>
              <div><strong>🏢 부서:</strong> {selectedAppointment.client.department}</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                상담 요약
              </label>
              <textarea
                value={recordForm.summary}
                onChange={(e) => setRecordForm(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="상담 내용을 요약해서 작성해주세요"
                style={{
                  width: '100%',
                  height: '120px',
                  padding: '12px',
                  border: '2px solid #e1e1e1',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                권장사항 및 계획
              </label>
              <textarea
                value={recordForm.recommendations}
                onChange={(e) => setRecordForm(prev => ({ ...prev, recommendations: e.target.value }))}
                placeholder="고객에게 권장할 사항이나 향후 계획을 작성해주세요"
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '12px',
                  border: '2px solid #e1e1e1',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={recordForm.followUpNeeded}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, followUpNeeded: e.target.checked }))}
                />
                <span style={{ fontWeight: 'bold', color: '#333' }}>후속 상담 필요</span>
              </label>
            </div>

            {recordForm.followUpNeeded && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  다음 상담 예정일
                </label>
                <input
                  type="date"
                  value={recordForm.nextSessionDate}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, nextSessionDate: e.target.value }))}
                  style={{
                    padding: '10px',
                    border: '2px solid #e1e1e1',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={closeRecordModal}
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
                onClick={saveRecord}
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
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 고객 이력 모달 */}
      {showClientHistory && selectedAppointment && (
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
            <h3 style={{ color: '#333', margin: '0 0 20px 0' }}>
              👤 {selectedAppointment.client.name}님 상담 이력
            </h3>
            
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <div><strong>📧 이메일:</strong> {selectedAppointment.client.email}</div>
              <div><strong>💼 직책:</strong> {selectedAppointment.client.position}</div>
              <div><strong>🏢 부서:</strong> {selectedAppointment.client.department}</div>
            </div>

            <h4 style={{ color: '#333', margin: '20px 0 15px 0' }}>📋 상담 이력</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {appointments.filter(apt => apt.client._id === selectedAppointment.client._id).map((apt) => (
                <div key={apt._id} style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: '#333' }}>
                      📅 {apt.date} {apt.time}
                    </strong>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      backgroundColor: `${getStatusColor(apt.status)}20`,
                      color: getStatusColor(apt.status)
                    }}>
                      {getStatusLabel(apt.status)}
                    </span>
                  </div>
                  <div style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>
                    💬 {apt.topic} ({apt.type === 'individual' ? '개인상담' : '그룹상담'})
                  </div>
                  {apt.counselingRecord && (
                    <div style={{ fontSize: '13px', color: '#555', marginTop: '10px' }}>
                      <div style={{ marginBottom: '5px' }}>
                        <strong>요약:</strong> {apt.counselingRecord.summary}
                      </div>
                      {apt.counselingRecord.followUpNeeded && (
                        <div>
                          <strong>후속상담:</strong> {apt.counselingRecord.nextSessionDate || '일정 미정'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setShowClientHistory(false)}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer'
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

export default CounselorDashboard;