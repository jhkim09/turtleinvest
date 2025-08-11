import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [appointmentStep, setAppointmentStep] = useState(1);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointmentForm, setAppointmentForm] = useState({
    date: '',
    time: '',
    type: '',
    topic: '',
    notes: '',
    urgency: 'normal'
  });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [counselingRecords, setCounselingRecords] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    fetchCounselingRecords();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      
      // 대시보드 데이터 불러오기
      const response = await axios.get('http://localhost:3000/api/reports/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
      
      // 사용자 예약 목록 불러오기 (counseling-sessions 우선 시도)
      try {
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
          status: session.status,
          topic: session.topic,
          counselor: session.counselor?.name,
          assignmentStatus: session.assignmentStatus
        }));
        setAppointments(formattedAppointments);
      } catch (sessionError) {
        // 상담 세션 API 실패시 기존 appointments API 시도
        const appointmentsResponse = await axios.get('http://localhost:3000/api/appointments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAppointments(appointmentsResponse.data);
      }
      
    } catch (error) {
      console.error('Dashboard data fetch failed:', error);
      // 백엔드 연결 실패시 데모 데이터 사용
      setStats({
        summary: {
          totalAppointments: 12,
          completedAppointments: 8,
          cancelledAppointments: 2,
          completionRate: 75
        }
      });
      setAppointments([
        { _id: '1', date: '2025-08-15', time: '14:00', type: 'individual', status: 'scheduled' },
        { _id: '2', date: '2025-08-20', time: '10:00', type: 'group', status: 'completed' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounselingRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/counseling/records', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCounselingRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch counseling records:', error);
      // 데모 데이터를 사용하지 않고 빈 배열로 설정
      setCounselingRecords([]);
    }
  };

  const openAppointmentModal = () => {
    setShowNewAppointment(true);
    setAppointmentStep(1);
    setAppointmentForm({
      date: '',
      time: '',
      type: '',
      topic: '',
      notes: '',
      urgency: 'normal'
    });
  };

  const closeAppointmentModal = () => {
    setShowNewAppointment(false);
    setAppointmentStep(1);
  };

  const confirmCancelAppointment = () => {
    // 예약 취소 로직
    setAppointments(prev => prev.filter(apt => apt._id !== appointmentToCancel));
    setShowCancelConfirm(false);
    setAppointmentToCancel(null);
    alert('예약이 취소되었습니다.');
  };

  const closeCancelConfirm = () => {
    setShowCancelConfirm(false);
    setAppointmentToCancel(null);
  };

  const nextStep = () => {
    if (appointmentStep < 3) {
      setAppointmentStep(appointmentStep + 1);
    }
  };

  const prevStep = () => {
    if (appointmentStep > 1) {
      setAppointmentStep(appointmentStep - 1);
    }
  };

  const updateAppointmentForm = (field: string, value: string) => {
    setAppointmentForm(prev => ({ ...prev, [field]: value }));
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 17) slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      if (date.getDay() !== 0 && date.getDay() !== 6) { // 주말 제외
        dates.push({
          value: date.toISOString().split('T')[0],
          display: `${date.getMonth() + 1}/${date.getDate()} (${['일','월','화','수','목','금','토'][date.getDay()]})`
        });
      }
    }
    return dates;
  };

  const createNewAppointment = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // 날짜와 시간을 합쳐서 appointmentDate 생성
      const appointmentDateTime = new Date(`${appointmentForm.date}T${appointmentForm.time}:00`);
      
      const sessionData = {
        topic: appointmentForm.topic,
        counselingMethod: 'faceToFace', // 기본값
        sessionType: appointmentForm.type,
        appointmentDate: appointmentDateTime.toISOString(),
        urgencyLevel: appointmentForm.urgency === 'urgent' ? 'high' : 
                     appointmentForm.urgency === 'normal' ? 'medium' : 'low',
        notes: appointmentForm.notes
      };

      const response = await axios.post('http://localhost:3000/api/counseling-sessions', sessionData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 로컬 상태 업데이트 (UI 표시용)
      const newAppointment = {
        _id: response.data.session._id,
        date: appointmentForm.date,
        time: appointmentForm.time,
        status: 'scheduled',
        topic: appointmentForm.topic,
        urgency: appointmentForm.urgency
      };
      
      setAppointments(prev => [...prev, newAppointment]);
      closeAppointmentModal();
      alert('상담 요청이 접수되었습니다! 상담사 배정까지 잠시만 기다려주세요.');
      
    } catch (error) {
      console.error('상담 요청 실패:', error);
      alert('상담 요청 중 오류가 발생했습니다: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
  };

  const navigation = [
    { name: '대시보드', key: 'dashboard', active: activeTab === 'dashboard' },
    { name: '예약 관리', key: 'appointments', active: activeTab === 'appointments' },
    { name: '상담 기록', key: 'records', active: activeTab === 'records', roles: ['counselor', 'admin'] },
    { name: '팀 관리', key: 'team', active: false, roles: ['manager', 'admin'], href: '/manager' },
    { name: '사용자 관리', key: 'users', active: false, roles: ['admin'] },
    { name: '리포트', key: 'reports', active: false, roles: ['admin', 'counselor'] },
    { name: '갈등 해결 가이드', key: 'conflict-guide', active: activeTab === 'conflict-guide' }
  ].filter(item => !item.roles || item.roles.includes(user?.role || 'employee'));

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom, #f8fafc 0%, #e8f5e8 50%, #e3f2fd 100%)', 
      fontFamily: '"Segoe UI", "Malgun Gothic", sans-serif' 
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #4caf50 0%, #2196f3 100%)',
        color: 'white',
        padding: '0',
        boxShadow: '0 4px 20px rgba(76, 175, 80, 0.25)',
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
                🏢 EAP Service
              </h1>
              <p style={{ 
                color: 'rgba(255, 255, 255, 0.9)', 
                margin: '8px 0 0 0', 
                fontSize: '16px', 
                fontWeight: '300' 
              }}>
                직원 전용 상담 서비스
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
                  직원 계정
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
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '0',
        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            {navigation.map((item, index) => (
              <div
                key={index}
                onClick={() => item.href ? (window.location.href = item.href) : setActiveTab(item.key)}
                style={{
                  padding: '16px 24px',
                  cursor: 'pointer',
                  borderBottom: item.active ? '3px solid #4caf50' : '3px solid transparent',
                  color: item.active ? '#4caf50' : '#666',
                  fontWeight: item.active ? '600' : '500',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  if (!item.active) {
                    e.currentTarget.style.color = '#4caf50';
                    e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.05)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!item.active) {
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
            {activeTab === 'dashboard' && '대시보드'}
            {activeTab === 'appointments' && '예약 관리'}
            {activeTab === 'records' && '상담 기록'}
            {activeTab === 'conflict-guide' && '갈등 해결 가이드'}
          </h2>
          <p style={{ color: '#666', margin: '0' }}>
            {activeTab === 'dashboard' && 'EAP 서비스 현황을 확인하세요'}
            {activeTab === 'appointments' && '상담 예약을 신청하고 관리하세요'}
            {activeTab === 'records' && '완료된 상담의 기록과 피드백을 확인하세요'}
            {activeTab === 'conflict-guide' && '직장 내 갈등 상황을 효과적으로 해결하는 방법을 안내합니다'}
          </p>
        </div>

        {/* 예약 관리 탭 */}
        {activeTab === 'appointments' && (
          <div>
            {/* 새 예약 신청 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '30px',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              marginBottom: '25px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ color: '#2196f3', fontSize: '22px', margin: '0', fontWeight: '600' }}>
                  📅 상담 예약 신청
                </h3>
                <button
                  onClick={() => setShowNewAppointment(true)}
                  style={{
                    background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)'
                  }}
                >
                  + 새 예약 신청
                </button>
              </div>
              <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.5', margin: '0' }}>
                전문 상담사와의 1:1 개인상담 또는 그룹상담을 신청하실 수 있습니다. 
                원하시는 날짜와 시간을 선택하여 예약해보세요.
              </p>
            </div>

            {/* 예약 현황 통계 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: '25px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(76, 175, 80, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                textAlign: 'center'
              }}>
                <h4 style={{ color: '#4caf50', fontSize: '16px', margin: '0 0 10px 0' }}>✅ 완료된 상담</h4>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {appointments.filter(apt => apt.status === 'completed').length}회
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: '25px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(255, 152, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                textAlign: 'center'
              }}>
                <h4 style={{ color: '#ff9800', fontSize: '16px', margin: '0 0 10px 0' }}>⏰ 예정된 상담</h4>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {appointments.filter(apt => apt.status === 'scheduled').length}회
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: '25px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(156, 39, 176, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                textAlign: 'center'
              }}>
                <h4 style={{ color: '#9c27b0', fontSize: '16px', margin: '0 0 10px 0' }}>📊 총 상담 횟수</h4>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {appointments.length}회
                </p>
              </div>
            </div>

            {/* 예약 목록 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '30px',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0', fontWeight: '600' }}>
                📋 나의 상담 예약 목록
              </h3>

              {appointments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {appointments.map((appointment) => (
                    <div key={appointment._id} style={{
                      backgroundColor: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '12px',
                      border: '1px solid #e9ecef',
                      borderLeft: `4px solid ${
                        appointment.status === 'completed' ? '#4caf50' :
                        appointment.status === 'scheduled' ? '#2196f3' :
                        appointment.status === 'cancelled' ? '#f44336' : '#ff9800'
                      }`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <strong style={{ color: '#333', fontSize: '16px' }}>
                              📅 {appointment.date} {appointment.time}
                            </strong>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: 
                                appointment.status === 'completed' ? '#e8f5e8' :
                                appointment.status === 'scheduled' ? '#e3f2fd' :
                                appointment.status === 'cancelled' ? '#ffebee' : '#fff3e0',
                              color: 
                                appointment.status === 'completed' ? '#2e7d32' :
                                appointment.status === 'scheduled' ? '#1565c0' :
                                appointment.status === 'cancelled' ? '#c62828' : '#ef6c00'
                            }}>
                              {appointment.status === 'completed' ? '완료' :
                               appointment.status === 'scheduled' ? '예정' :
                               appointment.status === 'cancelled' ? '취소' : '대기'}
                            </span>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <span style={{ color: '#666' }}>유형: </span>
                            <strong>{appointment.type === 'individual' ? '개인상담' : '그룹상담'}</strong>
                          </div>
                          
                          {appointment.counselor && (
                            <div style={{ marginBottom: '8px' }}>
                              <span style={{ color: '#666' }}>상담사: </span>
                              <strong>{appointment.counselor}</strong>
                            </div>
                          )}
                          
                          <div style={{ color: '#666', fontSize: '14px' }}>
                            상담 주제: {appointment.topic || '일반 상담'}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {appointment.status === 'scheduled' && (
                            <>
                              <button
                                style={{
                                  backgroundColor: '#f44336',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                                onClick={() => {
                                  setAppointmentToCancel(appointment._id);
                                  setShowCancelConfirm(true);
                                }}
                              >
                                예약 취소
                              </button>
                              <button
                                style={{
                                  backgroundColor: '#2196f3',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                                onClick={() => alert('예약 변경 기능은 준비 중입니다.')}
                              >
                                예약 변경
                              </button>
                            </>
                          )}
                          
                          {appointment.status === 'completed' && (
                            <button
                              style={{
                                backgroundColor: '#4caf50',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                              onClick={() => setActiveTab('records')}
                            >
                              상담 기록 보기
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>📅</div>
                  <h4 style={{ color: '#666', margin: '0 0 10px 0' }}>아직 예약된 상담이 없습니다</h4>
                  <p style={{ color: '#999', margin: '0 0 20px 0', fontSize: '14px' }}>
                    전문 상담사와의 상담을 통해 도움을 받아보세요
                  </p>
                  <button
                    onClick={() => setShowNewAppointment(true)}
                    style={{
                      background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    첫 상담 예약하기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 상담 기록 탭 */}
        {activeTab === 'records' && (
          <div>
            {/* 상담 기록 개요 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '30px',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(156, 39, 176, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              marginBottom: '25px'
            }}>
              <h3 style={{ color: '#9c27b0', fontSize: '22px', margin: '0 0 15px 0', fontWeight: '600' }}>
                📋 나의 상담 기록
              </h3>
              <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.5', margin: '0' }}>
                완료된 상담의 내용과 상담사의 피드백을 확인하실 수 있습니다. 
                개인정보 보호를 위해 본인만 열람 가능합니다.
              </p>
            </div>

            {/* 상담 기록 통계 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: '25px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(76, 175, 80, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                textAlign: 'center'
              }}>
                <h4 style={{ color: '#4caf50', fontSize: '16px', margin: '0 0 10px 0' }}>✅ 총 상담 횟수</h4>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {appointments.filter(apt => apt.status === 'completed').length}회
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: '25px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                textAlign: 'center'
              }}>
                <h4 style={{ color: '#2196f3', fontSize: '16px', margin: '0 0 10px 0' }}>👤 개인상담</h4>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {appointments.filter(apt => apt.status === 'completed' && apt.type === 'individual').length}회
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: '25px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(255, 152, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                textAlign: 'center'
              }}>
                <h4 style={{ color: '#ff9800', fontSize: '16px', margin: '0 0 10px 0' }}>👥 그룹상담</h4>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {appointments.filter(apt => apt.status === 'completed' && apt.type === 'group').length}회
                </p>
              </div>
            </div>

            {/* 상담 기록 목록 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '30px',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(156, 39, 176, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0', fontWeight: '600' }}>
                📝 상담 기록 상세 내용
              </h3>

              {counselingRecords.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {counselingRecords.map((record) => (
                    <div key={record._id} style={{
                      backgroundColor: '#f8f9fa',
                      padding: '25px',
                      borderRadius: '12px',
                      border: '1px solid #e9ecef',
                      borderLeft: '4px solid #4caf50'
                    }}>
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '10px' }}>
                          <h4 style={{ color: '#333', margin: '0', fontSize: '18px' }}>
                            📅 {new Date(record.sessionDate).toLocaleDateString('ko-KR')}
                          </h4>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: '#e8f5e8',
                            color: '#2e7d32'
                          }}>
                            상담 완료
                          </span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                          <div>
                            <span style={{ color: '#666', fontSize: '14px' }}>상담 유형: </span>
                            <strong>{record.sessionType === 'individual' ? '개인상담' : record.sessionType === 'group' ? '그룹상담' : '긴급상담'}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#666', fontSize: '14px' }}>주요 이슈: </span>
                            <strong>{Array.isArray(record.mainIssues) ? record.mainIssues.join(', ') : '일반 상담'}</strong>
                          </div>
                          {record.counselor?.name && (
                            <div>
                              <span style={{ color: '#666', fontSize: '14px' }}>상담사: </span>
                              <strong>{record.counselor.name}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #e1e1e1'
                      }}>
                        <h5 style={{ color: '#333', margin: '0 0 15px 0', fontSize: '16px' }}>💡 상담 요약</h5>
                        <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                          {appointment._id === '2' 
                            ? '스트레스 관리 기법과 업무-삶의 균형에 대해 상담했습니다. 일상에서 실천할 수 있는 구체적인 방법들을 함께 논의했으며, 점진적인 개선 계획을 수립했습니다.'
                            : `${appointment.topic} 관련하여 전문 상담사와 심도 있는 대화를 나누었습니다. 개인의 상황에 맞는 맞춤형 해결 방안을 모색하고 실행 가능한 계획을 세웠습니다.`
                          }
                        </p>
                        
                        <h5 style={{ color: '#333', margin: '0 0 15px 0', fontSize: '16px' }}>📋 권장사항</h5>
                        <ul style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', paddingLeft: '20px', margin: '0 0 20px 0' }}>
                          {appointment._id === '2' ? (
                            <>
                              <li>매일 10분간 명상이나 깊은 호흡 연습하기</li>
                              <li>주중 최소 2회 이상 운동이나 신체활동 하기</li>
                              <li>업무 시간 외에는 업무 관련 연락 피하기</li>
                              <li>충분한 수면시간 확보 (7-8시간)</li>
                            </>
                          ) : (
                            <>
                              <li>꾸준한 자기 관찰과 감정 기록 작성</li>
                              <li>스트레스 상황에서 즉시 대응 방법 적용</li>
                              <li>주변 지지체계 활용하기</li>
                              <li>필요시 추가 상담 요청하기</li>
                            </>
                          )}
                        </ul>

                        <div style={{
                          backgroundColor: '#e3f2fd',
                          padding: '15px',
                          borderRadius: '6px',
                          border: '1px solid #2196f3'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ color: '#1976d2', fontWeight: '600', fontSize: '14px' }}>📞 후속 관리</span>
                          </div>
                          <p style={{ color: '#1976d2', fontSize: '13px', margin: '0' }}>
                            2주 후 상태 점검을 위한 전화 상담을 예정하고 있습니다. 
                            그 전에 급한 문제가 발생하면 언제든 연락 주세요.
                          </p>
                        </div>
                      </div>
                      
                      <div style={{ marginTop: '15px', textAlign: 'right' }}>
                        <button
                          style={{
                            backgroundColor: '#9c27b0',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            marginRight: '8px'
                          }}
                          onClick={() => setShowNewAppointment(true)}
                        >
                          후속 상담 예약
                        </button>
                        <button
                          style={{
                            backgroundColor: '#f5f5f5',
                            color: '#666',
                            border: '1px solid #ddd',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                          onClick={() => alert('상담 기록 PDF 다운로드 기능은 준비 중입니다.')}
                        >
                          📄 기록 저장
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
                  <h4 style={{ color: '#666', margin: '0 0 10px 0' }}>아직 완료된 상담이 없습니다</h4>
                  <p style={{ color: '#999', margin: '0 0 20px 0', fontSize: '14px' }}>
                    상담을 받으신 후에 이곳에서 상담 기록을 확인하실 수 있습니다
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      onClick={() => setActiveTab('appointments')}
                      style={{
                        backgroundColor: '#9c27b0',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      예약 관리로 이동
                    </button>
                    <button
                      onClick={() => setShowNewAppointment(true)}
                      style={{
                        backgroundColor: '#2196f3',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      새 상담 예약
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 갈등 해결 가이드 탭 */}
        {activeTab === 'conflict-guide' && (
          <div>
            {/* 소개 섹션 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '30px',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              marginBottom: '25px'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <h3 style={{ color: '#4caf50', fontSize: '24px', margin: '0 0 15px 0', fontWeight: '600' }}>
                  🤝 직장 내 갈등 해결 가이드
                </h3>
                <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6', margin: '0' }}>
                  동료, 상사, 부하직원과의 관계에서 발생하는 갈등을 건설적으로 해결하는 방법을 단계별로 안내합니다.
                </p>
              </div>
            </div>

            {/* 갈등 유형별 대응법 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '25px',
              marginBottom: '30px'
            }}>
              {/* 동료와의 갈등 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: '30px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h4 style={{ color: '#2196f3', fontSize: '20px', margin: '0 0 20px 0', fontWeight: '600' }}>
                  👥 동료와의 갈등
                </h4>
                <div style={{ marginBottom: '20px' }}>
                  <h5 style={{ color: '#333', fontSize: '16px', margin: '0 0 10px 0' }}>주요 원인:</h5>
                  <ul style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', marginLeft: '20px' }}>
                    <li>업무 역할과 책임의 불분명함</li>
                    <li>의사소통 방식의 차이</li>
                    <li>성과 평가나 승진 관련 경쟁</li>
                    <li>개인적 가치관이나 일하는 방식의 차이</li>
                  </ul>
                </div>
                <div>
                  <h5 style={{ color: '#333', fontSize: '16px', margin: '0 0 10px 0' }}>해결 방법:</h5>
                  <ol style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', marginLeft: '20px' }}>
                    <li><strong>직접 대화:</strong> 감정이 격해지기 전에 1:1로 솔직한 대화</li>
                    <li><strong>경청하기:</strong> 상대방의 입장과 관점을 이해하려 노력</li>
                    <li><strong>공통점 찾기:</strong> 서로의 공통 목표나 이익을 확인</li>
                    <li><strong>타협점 모색:</strong> 양쪽 모두 수용할 수 있는 해결책 도출</li>
                  </ol>
                </div>
              </div>

              {/* 상사와의 갈등 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: '30px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(255, 152, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h4 style={{ color: '#ff9800', fontSize: '20px', margin: '0 0 20px 0', fontWeight: '600' }}>
                  👔 상사와의 갈등
                </h4>
                <div style={{ marginBottom: '20px' }}>
                  <h5 style={{ color: '#333', fontSize: '16px', margin: '0 0 10px 0' }}>주요 원인:</h5>
                  <ul style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', marginLeft: '20px' }}>
                    <li>업무 지시나 피드백 방식의 문제</li>
                    <li>기대치와 실제 성과의 차이</li>
                    <li>권한과 자율성에 대한 인식 차이</li>
                    <li>승진이나 급여 관련 불만</li>
                  </ul>
                </div>
                <div>
                  <h5 style={{ color: '#333', fontSize: '16px', margin: '0 0 10px 0' }}>해결 방법:</h5>
                  <ol style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', marginLeft: '20px' }}>
                    <li><strong>정중한 의견 개진:</strong> 예의를 지키면서 자신의 입장 전달</li>
                    <li><strong>구체적 사례 제시:</strong> 추상적이지 않은 구체적인 상황 설명</li>
                    <li><strong>해결책 제안:</strong> 문제만 제기하지 말고 대안도 함께 제시</li>
                    <li><strong>문서화:</strong> 중요한 내용은 이메일 등으로 기록 남기기</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* 갈등 해결 단계별 가이드 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '30px',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(156, 39, 176, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              marginBottom: '25px'
            }}>
              <h4 style={{ color: '#9c27b0', fontSize: '22px', margin: '0 0 25px 0', fontWeight: '600' }}>
                📋 갈등 해결 5단계 프로세스
              </h4>
              <div style={{ display: 'grid', gap: '20px' }}>
                {[
                  {
                    step: '1단계',
                    title: '문제 인식 및 정의',
                    content: '갈등의 본질적 원인을 파악하고 명확히 정의합니다. 감정적 반응이 아닌 객관적 사실에 집중하세요.',
                    color: '#f44336'
                  },
                  {
                    step: '2단계',
                    title: '감정 조절 및 준비',
                    content: '감정을 가라앉히고 대화할 준비를 합니다. 상대방을 비난하지 않고 해결책을 찾는 마음가짐이 중요합니다.',
                    color: '#ff9800'
                  },
                  {
                    step: '3단계',
                    title: '대화 시작 및 경청',
                    content: '적절한 시간과 장소에서 대화를 시작합니다. 상대방의 입장을 충분히 들어보세요.',
                    color: '#2196f3'
                  },
                  {
                    step: '4단계',
                    title: '공통점 발견 및 협상',
                    content: '서로의 공통 관심사나 목표를 찾고, 상호 수용 가능한 해결책을 모색합니다.',
                    color: '#4caf50'
                  },
                  {
                    step: '5단계',
                    title: '합의 및 실행',
                    content: '도출된 해결책에 대해 명확히 합의하고, 실행 계획을 세워 지속적으로 모니터링합니다.',
                    color: '#9c27b0'
                  }
                ].map((item, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${item.color}`
                  }}>
                    <div style={{
                      backgroundColor: item.color,
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      marginRight: '20px',
                      minWidth: '60px',
                      textAlign: 'center'
                    }}>
                      {item.step}
                    </div>
                    <div>
                      <h5 style={{ color: '#333', fontSize: '16px', margin: '0 0 8px 0', fontWeight: '600' }}>
                        {item.title}
                      </h5>
                      <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', margin: '0' }}>
                        {item.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 추가 리소스 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '30px',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h4 style={{ color: '#4caf50', fontSize: '20px', margin: '0 0 20px 0', fontWeight: '600' }}>
                🔧 추가 도움 받기
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '10px',
                  border: '1px solid #2196f3',
                  textAlign: 'center'
                }}>
                  <h5 style={{ color: '#1976d2', margin: '0 0 10px 0' }}>📞 전문 상담</h5>
                  <p style={{ color: '#666', fontSize: '14px', margin: '0 0 15px 0' }}>
                    갈등 해결이 어려우시다면 전문 상담사와의 1:1 상담을 받으세요
                  </p>
                  <button
                    onClick={() => setShowNewAppointment(true)}
                    style={{
                      backgroundColor: '#2196f3',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    상담 예약하기
                  </button>
                </div>
                
                <div style={{
                  padding: '20px',
                  backgroundColor: '#e8f5e8',
                  borderRadius: '10px',
                  border: '1px solid #4caf50',
                  textAlign: 'center'
                }}>
                  <h5 style={{ color: '#2e7d32', margin: '0 0 10px 0' }}>📚 추가 자료</h5>
                  <p style={{ color: '#666', fontSize: '14px', margin: '0 0 15px 0' }}>
                    갈등 관리와 의사소통 스킬 향상을 위한 추가 자료를 확인하세요
                  </p>
                  <button
                    style={{
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                    onClick={() => window.open('https://blog.naver.com/arune00/eap', '_blank')}
                  >
                    자료 보기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 대시보드 탭 기존 내용 */}
        {activeTab === 'dashboard' && (
        <>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <p style={{ fontSize: '18px', color: '#666' }}>데이터를 불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                padding: '25px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease'
              }}>
                <h3 style={{ color: '#1976d2', fontSize: '16px', margin: '0 0 10px 0' }}>
                  📊 전체 예약
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {stats?.summary?.totalAppointments || 0}
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                padding: '25px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease'
              }}>
                <h3 style={{ color: '#4caf50', fontSize: '16px', margin: '0 0 10px 0' }}>
                  ✅ 완료된 상담
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {stats?.summary?.completedAppointments || 0}
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                padding: '25px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease'
              }}>
                <h3 style={{ color: '#ff9800', fontSize: '16px', margin: '0 0 10px 0' }}>
                  📈 완료율
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {stats?.summary?.completionRate || 0}%
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                padding: '25px',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease'
              }}>
                <h3 style={{ color: '#f44336', fontSize: '16px', margin: '0 0 10px 0' }}>
                  ❌ 취소된 예약
                </h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
                  {stats?.summary?.cancelledAppointments || 0}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0' }}>
                빠른 실행
              </h3>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <button 
                  onClick={openAppointmentModal}
                  style={{
                    background: 'linear-gradient(135deg, #4caf50 0%, #2196f3 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
                  }}>
                  📅 새 상담 예약
                </button>
                
                <button 
                  onClick={() => alert('상담 기록 작성 기능 개발 중입니다!')}
                  style={{
                    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
                  }}>
                  📝 상담 기록 작성
                </button>
                
                
                {(user?.role === 'admin' || user?.role === 'counselor') && (
                  <button 
                    onClick={() => alert('관리자 리포트 기능 개발 중입니다!')}
                    style={{
                      background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '14px 28px',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      boxShadow: '0 4px 15px rgba(255, 152, 0, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 152, 0, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 152, 0, 0.3)';
                    }}>
                    📊 리포트 생성
                  </button>
                )}
              </div>
            </div>


            {/* 나의 예약 목록 */}
            <div style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0' }}>
                📋 나의 상담 예약
              </h3>
              {appointments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {appointments.map((appointment) => (
                    <div key={appointment._id} style={{
                      backgroundColor: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '6px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#333' }}>
                            {appointment.date} {appointment.time}
                          </strong>
                          <span style={{ 
                            marginLeft: '12px', 
                            padding: '4px 8px', 
                            borderRadius: '12px', 
                            fontSize: '12px', 
                            backgroundColor: appointment.status === 'completed' ? '#e8f5e8' : 
                                           appointment.status === 'scheduled' ? '#e3f2fd' : '#ffebee',
                            color: appointment.status === 'completed' ? '#2e7d32' : 
                                   appointment.status === 'scheduled' ? '#1565c0' : '#d32f2f'
                          }}>
                            {appointment.status === 'completed' ? '완료' : 
                             appointment.status === 'scheduled' ? '예정' : 
                             appointment.status === 'cancelled' ? '취소' : '대기'}
                          </span>
                          {appointment.assignmentStatus && (
                            <span style={{ 
                              marginLeft: '8px', 
                              padding: '2px 6px', 
                              borderRadius: '8px', 
                              fontSize: '10px',
                              backgroundColor: appointment.assignmentStatus === 'assigned' ? '#e8f5e8' : '#fff3e0',
                              color: appointment.assignmentStatus === 'assigned' ? '#2e7d32' : '#ef6c00'
                            }}>
                              {appointment.assignmentStatus === 'assigned' ? '배정완료' : '배정대기'}
                            </span>
                          )}
                          {appointment.topic && (
                            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                              주제: {appointment.topic}
                            </p>
                          )}
                          {appointment.counselor && (
                            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '13px' }}>
                              상담사: {appointment.counselor}
                            </p>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {appointment.type === 'individual' ? '개인상담' : '그룹상담'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                  예약된 상담이 없습니다. 새 예약을 생성해보세요!
                </p>
              )}
            </div>

          </>
        )}
        </>
        )}
      </main>

      {/* 새 예약 모달 */}
      {showNewAppointment && (
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
            {/* 단계 표시 */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                {[1, 2, 3].map((step) => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: step <= appointmentStep ? '#1976d2' : '#e0e0e0',
                      color: step <= appointmentStep ? 'white' : '#999',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      {step}
                    </div>
                    {step < 3 && (
                      <div style={{
                        width: '40px',
                        height: '2px',
                        backgroundColor: step < appointmentStep ? '#1976d2' : '#e0e0e0',
                        margin: '0 10px'
                      }}></div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '14px', color: '#666' }}>
                {appointmentStep === 1 && '날짜 및 시간 선택'}
                {appointmentStep === 2 && '상담 유형 및 주제 선택'}
                {appointmentStep === 3 && '예약 내용 확인'}
              </div>
            </div>

            {/* 1단계: 날짜/시간 선택 */}
            {appointmentStep === 1 && (
              <div>
                <h3 style={{ color: '#333', margin: '0 0 20px 0' }}>📅 날짜 및 시간 선택</h3>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    상담 날짜
                  </label>
                  <select
                    value={appointmentForm.date}
                    onChange={(e) => updateAppointmentForm('date', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e1e1e1',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">날짜를 선택하세요</option>
                    {generateAvailableDates().map((date) => (
                      <option key={date.value} value={date.value}>
                        {date.display}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    상담 시간
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {generateTimeSlots().map((time) => (
                      <button
                        key={time}
                        onClick={() => updateAppointmentForm('time', time)}
                        style={{
                          padding: '10px',
                          border: `2px solid ${appointmentForm.time === time ? '#1976d2' : '#e1e1e1'}`,
                          backgroundColor: appointmentForm.time === time ? '#e3f2fd' : 'white',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: appointmentForm.time === time ? '#1976d2' : '#333'
                        }}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2단계: 상담 유형/주제 선택 */}
            {appointmentStep === 2 && (
              <div>
                <h3 style={{ color: '#333', margin: '0 0 20px 0' }}>💬 상담 유형 및 주제 선택</h3>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    상담 유형
                  </label>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    {['individual', 'group'].map((type) => (
                      <button
                        key={type}
                        onClick={() => updateAppointmentForm('type', type)}
                        style={{
                          padding: '15px 20px',
                          border: `2px solid ${appointmentForm.type === type ? '#1976d2' : '#e1e1e1'}`,
                          backgroundColor: appointmentForm.type === type ? '#e3f2fd' : 'white',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: appointmentForm.type === type ? '#1976d2' : '#333',
                          flex: 1,
                          textAlign: 'center',
                          fontWeight: appointmentForm.type === type ? 'bold' : 'normal'
                        }}
                      >
                        {type === 'individual' ? '🧑‍💼 개인 상담' : '👥 그룹 상담'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    상담 주제
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '15px' }}>
                    {[
                      '재무상담',
                      '법률상담',
                      '스트레스 관리',
                      '직장 내 갈등',
                      '업무 효율성',
                      '워라밸',
                      '진로 상담',
                      '기타'
                    ].map((topic) => (
                      <button
                        key={topic}
                        onClick={() => updateAppointmentForm('topic', topic)}
                        style={{
                          padding: '12px',
                          border: `2px solid ${appointmentForm.topic === topic ? '#1976d2' : '#e1e1e1'}`,
                          backgroundColor: appointmentForm.topic === topic ? '#e3f2fd' : 'white',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: appointmentForm.topic === topic ? '#1976d2' : '#333',
                          textAlign: 'center'
                        }}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    상담 요청 사항 (선택)
                  </label>
                  <textarea
                    value={appointmentForm.notes}
                    onChange={(e) => updateAppointmentForm('notes', e.target.value)}
                    placeholder="구체적인 상담 내용이나 요청사항을 입력해주세요"
                    style={{
                      width: '100%',
                      height: '80px',
                      padding: '10px',
                      border: '2px solid #e1e1e1',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    긴급도
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[
                      { value: 'low', label: '🟢 낮음', color: '#4caf50' },
                      { value: 'normal', label: '🟡 보통', color: '#ff9800' },
                      { value: 'high', label: '🔴 높음', color: '#f44336' }
                    ].map((urgency) => (
                      <button
                        key={urgency.value}
                        onClick={() => updateAppointmentForm('urgency', urgency.value)}
                        style={{
                          padding: '10px 15px',
                          border: `2px solid ${appointmentForm.urgency === urgency.value ? urgency.color : '#e1e1e1'}`,
                          backgroundColor: appointmentForm.urgency === urgency.value ? `${urgency.color}20` : 'white',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: appointmentForm.urgency === urgency.value ? urgency.color : '#333',
                          flex: 1,
                          textAlign: 'center'
                        }}
                      >
                        {urgency.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3단계: 예약 확인 */}
            {appointmentStep === 3 && (
              <div>
                <h3 style={{ color: '#333', margin: '0 0 20px 0' }}>✅ 예약 내용 확인</h3>
                
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>📅 날짜:</strong> {generateAvailableDates().find(d => d.value === appointmentForm.date)?.display}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>🕐 시간:</strong> {appointmentForm.time}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>👤 유형:</strong> {appointmentForm.type === 'individual' ? '개인 상담' : '그룹 상담'}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>💭 주제:</strong> {appointmentForm.topic}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>⚡ 긴급도:</strong> {
                      appointmentForm.urgency === 'low' ? '🟢 낮음' :
                      appointmentForm.urgency === 'normal' ? '🟡 보통' : '🔴 높음'
                    }
                  </div>
                  {appointmentForm.notes && (
                    <div>
                      <strong>📝 요청사항:</strong>
                      <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                        {appointmentForm.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div style={{
                  backgroundColor: '#e3f2fd',
                  padding: '15px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  border: '1px solid #bbdefb'
                }}>
                  <p style={{ margin: '0', fontSize: '14px', color: '#1976d2' }}>
                    💡 예약 완료 후 담당 상담사가 연락드릴 예정입니다.
                  </p>
                </div>
              </div>
            )}
            
            {/* 버튼 영역 */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
              <div>
                {appointmentStep > 1 && (
                  <button
                    onClick={prevStep}
                    style={{
                      backgroundColor: '#f5f5f5',
                      color: '#333',
                      border: '1px solid #ddd',
                      padding: '12px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    ← 이전
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={closeAppointmentModal}
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
                
                {appointmentStep < 3 ? (
                  <button
                    onClick={nextStep}
                    disabled={
                      (appointmentStep === 1 && (!appointmentForm.date || !appointmentForm.time)) ||
                      (appointmentStep === 2 && (!appointmentForm.type || !appointmentForm.topic))
                    }
                    style={{
                      backgroundColor: 
                        (appointmentStep === 1 && (!appointmentForm.date || !appointmentForm.time)) ||
                        (appointmentStep === 2 && (!appointmentForm.type || !appointmentForm.topic))
                          ? '#ccc' : '#1976d2',
                      color: 'white',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '6px',
                      cursor: 
                        (appointmentStep === 1 && (!appointmentForm.date || !appointmentForm.time)) ||
                        (appointmentStep === 2 && (!appointmentForm.type || !appointmentForm.topic))
                          ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    다음 →
                  </button>
                ) : (
                  <button
                    onClick={createNewAppointment}
                    style={{
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    🎯 예약 완료
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 예약 취소 확인 모달 */}
      {showCancelConfirm && (
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
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ 
              color: '#333', 
              margin: '0 0 15px 0',
              fontSize: '20px' 
            }}>
              예약 취소 확인
            </h3>
            <p style={{ 
              color: '#666', 
              margin: '0 0 25px 0',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              정말 예약을 취소하시겠습니까?<br />
              취소된 예약은 복구할 수 없습니다.
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '10px',
              justifyContent: 'center'
            }}>
              <button
                onClick={closeCancelConfirm}
                style={{
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                취소
              </button>
              <button
                onClick={confirmCancelAppointment}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                예약 취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;