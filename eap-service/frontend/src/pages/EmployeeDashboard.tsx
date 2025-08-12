import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NotificationBell from '../components/Notifications/NotificationBell.tsx';
import BookingModal from '../components/Booking/BookingModal.tsx';
import PortfolioManager from '../components/FinancialPortfolio/PortfolioManager.tsx';
import ResourcesBoard from '../components/Resources/ResourcesBoard.tsx';
import SessionRating from '../components/Rating/SessionRating.tsx';
import { MomentumTheme, MomentumComponents } from '../styles/MomentumTheme.ts';

interface EmployeeDashboardProps {
  user: any;
  onLogout: () => void;
}

interface Session {
  _id: string;
  sessionCategory: 'psychological' | 'financial';
  appointmentDate: string;
  duration: number;
  status: string;
  topic?: string;
  sessionType?: string;
  advisor: {
    name: string;
    email: string;
  };
  sessionRecord?: {
    sharedContent?: {
      sessionSummary?: string;
      generalTopics?: string[];
      nextSteps?: string[];
      followUpNeeded?: boolean;
      nextSessionDate?: string;
    };
  };
  clientFeedback?: {
    rating: number;
    comments: string;
    wouldRecommend: boolean;
  };
}

interface SessionStats {
  total: number;
  counselingCount: number;
  financialCount: number;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<SessionStats>({ total: 0, counselingCount: 0, financialCount: 0 });
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [goalStats, setGoalStats] = useState({ total: 0, active: 0, completed: 0, averageProgress: 0 });
  const [bookingModal, setBookingModal] = useState<{
    isOpen: boolean;
    sessionType: 'psychological' | 'financial';
  }>({ isOpen: false, sessionType: 'psychological' });
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    session: Session | null;
  }>({ isOpen: false, session: null });

  useEffect(() => {
    loadDashboardData();
    loadGoalData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // 기존 세션 데이터 조회
      const sessionsResponse = await axios.get('http://localhost:3000/api/sessions/my-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 심리상담 예약 데이터 조회
      let appointmentsData = [];
      try {
        const appointmentsResponse = await axios.get('http://localhost:3000/api/appointments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        appointmentsData = appointmentsResponse.data || [];
      } catch (error) {
        console.error('예약 데이터 조회 실패:', error);
      }
      
      // 재무상담 예약 데이터 조회
      let financialSessionsData = [];
      try {
        const financialResponse = await axios.get('http://localhost:3000/api/financial-sessions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        financialSessionsData = financialResponse.data?.sessions || [];
      } catch (error) {
        console.error('재무상담 데이터 조회 실패:', error);
      }
      
      // 심리상담 예약 데이터를 세션 형식으로 변환
      const convertedAppointments = appointmentsData.map(appointment => ({
        _id: appointment._id,
        sessionCategory: 'psychological',
        appointmentDate: appointment.scheduledDate,
        duration: appointment.duration,
        status: appointment.status || 'scheduled',
        topic: appointment.reason,
        sessionType: appointment.type,
        advisor: {
          name: appointment.counselor?.name || '상담사',
          specialties: appointment.counselor?.specialties || []
        },
        sharedContent: {
          sessionSummary: '',
          progressNotes: appointment.notes || ''
        }
      }));
      
      // 재무상담 세션 데이터를 세션 형식으로 변환
      const convertedFinancialSessions = financialSessionsData.map(session => ({
        _id: session._id,
        sessionCategory: 'financial',
        appointmentDate: session.scheduledDate,
        duration: session.duration,
        status: session.status || 'scheduled',
        topic: session.preparation?.reason || '재무상담',
        sessionType: session.sessionType,
        advisor: {
          name: session.financialAdvisor?.name || '재무상담사',
          specialties: session.financialAdvisor?.specialties || []
        },
        sharedContent: {
          sessionSummary: '',
          progressNotes: session.preparation?.notes || ''
        }
      }));
      
      // 기존 세션과 예약 데이터 결합
      const allSessions = [
        ...(sessionsResponse.data.sessions || []),
        ...convertedAppointments,
        ...convertedFinancialSessions
      ];
      
      setSessions(allSessions);
      setStats({
        total: allSessions.length,
        counselingCount: allSessions.filter(s => s.sessionCategory === 'psychological').length,
        financialCount: allSessions.filter(s => s.sessionCategory === 'financial').length
      });
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadGoalData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/counseling-goals/my-goals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGoals(response.data.goals || []);
      setGoalStats(response.data.summary || { total: 0, active: 0, completed: 0, averageProgress: 0 });
    } catch (error) {
      console.error('목표 데이터 로드 실패:', error);
      setGoals([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': 
        return { 
          bg: `rgba(92, 126, 229, 0.1)`, 
          color: MomentumTheme.colors.primary 
        };
      case 'completed': 
        return { 
          bg: `rgba(16, 185, 129, 0.1)`, 
          color: MomentumTheme.colors.success 
        };
      case 'in-progress': 
        return { 
          bg: `rgba(227, 69, 74, 0.1)`, 
          color: MomentumTheme.colors.accent 
        };
      default: 
        return { 
          bg: `rgba(239, 68, 68, 0.1)`, 
          color: MomentumTheme.colors.error 
        };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return '예정';
      case 'completed': return '완료';
      case 'in-progress': return '진행중';
      case 'cancelled': return '취소';
      default: return '미출석';
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>직원 대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: MomentumTheme.colors.surface,
      fontFamily: MomentumTheme.typography.fontFamily.primary
    }}>
      {/* 헤더 */}
      <div style={MomentumComponents.header}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div>
            <h1 style={{ 
              margin: '0 0 5px 0', 
              fontSize: '28px', 
              fontWeight: '700'
            }}>
              🏢 나의 EAP 대시보드
            </h1>
            <p style={{ 
              margin: '0', 
              fontSize: '16px', 
              opacity: 0.9 
            }}>
              안녕하세요, {user.name}님! 상담 현황을 확인해보세요.
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <NotificationBell />
            <button
              onClick={onLogout}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '30px 20px' 
      }}>
        {/* 통계 카드 - Momentum 스타일 적용 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '20px',
          marginBottom: '30px' 
        }}>
          <div style={{
            ...MomentumComponents.statsCard('primary'),
            boxShadow: `0 4px 20px rgba(92, 126, 229, 0.3)`
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', opacity: 0.9 }}>총 상담 세션</h3>
            <p style={{ margin: '0', fontSize: '32px', fontWeight: '700' }}>{stats.total}</p>
          </div>
          
          <div style={{
            background: MomentumTheme.gradients.tealPurple,
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
            boxShadow: '0 4px 20px rgba(58, 170, 185, 0.3)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', opacity: 0.9 }}>심리상담</h3>
            <p style={{ margin: '0', fontSize: '32px', fontWeight: '700' }}>{stats.counselingCount}</p>
          </div>
          
          <div style={{
            ...MomentumComponents.statsCard('accent'),
            boxShadow: `0 4px 20px rgba(227, 69, 74, 0.3)`
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', opacity: 0.9 }}>재무상담</h3>
            <p style={{ margin: '0', fontSize: '32px', fontWeight: '700' }}>{stats.financialCount}</p>
          </div>
          
          <div style={{
            background: `linear-gradient(135deg, ${MomentumTheme.colors.primary} 0%, ${MomentumTheme.colors.primaryDark} 100%)`,
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
            boxShadow: `0 4px 20px rgba(92, 126, 229, 0.3)`
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', opacity: 0.9 }}>이번 달 완료</h3>
            <p style={{ margin: '0', fontSize: '32px', fontWeight: '700' }}>
              {sessions.filter(s => s.status === 'completed' && 
                new Date(s.appointmentDate).getMonth() === new Date().getMonth()).length}
            </p>
          </div>
        </div>

        {/* 탭 메뉴 - Momentum 스타일 */}
        <div style={{ 
          display: 'flex', 
          marginBottom: '30px',
          background: MomentumTheme.colors.background,
          borderRadius: '12px',
          padding: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: `1px solid ${MomentumTheme.colors.gray[200]}`
        }}>
          {[
            { key: 'overview', label: '📊 개요', icon: '📊' },
            { key: 'booking', label: '📝 상담신청', icon: '📝' },
            { key: 'sessions', label: '📅 상담 이력', icon: '📅' },
            { key: 'portfolio', label: '💰 재무 현황', icon: '💰' },
            { key: 'goals', label: '🎯 목표 관리', icon: '🎯' },
            { key: 'resources', label: '📚 자료실', icon: '📚' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={MomentumComponents.tab(activeTab === tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 - Momentum 카드 스타일 */}
        <div style={{
          ...MomentumTheme.card,
          minHeight: '400px'
        }}>
          {activeTab === 'sessions' && (
            <div>
              <h2 style={{ 
                color: MomentumTheme.colors.text.primary, 
                marginBottom: '24px',
                fontSize: MomentumTheme.typography.fontSize['2xl'],
                fontWeight: MomentumTheme.typography.fontWeight.semibold,
                fontFamily: MomentumTheme.typography.fontFamily.primary
              }}>
                📅 내 상담 이력
              </h2>
              
              {sessions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗓️</div>
                  <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>상담 이력이 없습니다</h3>
                  <p>첫 상담을 예약해보세요!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sessions.map(session => {
                    const statusStyle = getStatusColor(session.status);
                    return (
                      <div key={session._id} style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '20px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedSession(session)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                        e.currentTarget.style.borderColor = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                              <span style={{ 
                                fontSize: '20px' 
                              }}>
                                {session.sessionCategory === 'psychological' ? '🧠' : '💰'}
                              </span>
                              <h4 style={{ 
                                margin: '0', 
                                color: '#1f2937',
                                fontSize: '18px',
                                fontWeight: '600'
                              }}>
                                {session.sessionCategory === 'psychological' ? '심리상담' : '재무상담'}
                                {session.topic && ` - ${session.topic}`}
                                {session.sessionType && ` - ${session.sessionType}`}
                              </h4>
                            </div>
                            <p style={{ 
                              margin: '0 0 4px 0', 
                              color: '#6b7280',
                              fontSize: '14px' 
                            }}>
                              👩‍⚕️ 상담사: {session.advisor.name}
                            </p>
                            <p style={{ 
                              margin: '0', 
                              color: '#6b7280',
                              fontSize: '14px' 
                            }}>
                              ⏰ {session.duration}분 세션
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              marginBottom: '8px'
                            }}>
                              {getStatusText(session.status)}
                            </div>
                            <p style={{ 
                              margin: '0', 
                              color: '#4b5563',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}>
                              {new Date(session.appointmentDate).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                        </div>
                        
                        {/* 공유 내용 미리보기 */}
                        {session.sessionRecord?.sharedContent?.sessionSummary && (
                          <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            borderLeft: '3px solid #3b82f6'
                          }}>
                            <p style={{
                              margin: '0',
                              fontSize: '14px',
                              color: '#4b5563',
                              fontStyle: 'italic'
                            }}>
                              "{session.sessionRecord.sharedContent.sessionSummary.substring(0, 100)}..."
                            </p>
                          </div>
                        )}
                        
                        {/* 평점 버튼 (재무상담이고 완료된 세션에만 표시) */}
                        {session.sessionCategory === 'financial' && session.status === 'completed' && (
                          <div style={{
                            marginTop: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            {session.clientFeedback?.rating ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px', color: MomentumTheme.colors.text.secondary }}>
                                  내 평점:
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <span
                                      key={star}
                                      style={{
                                        fontSize: '16px',
                                        color: star <= session.clientFeedback!.rating ? '#fbbf24' : '#d1d5db'
                                      }}
                                    >
                                      ★
                                    </span>
                                  ))}
                                  <span style={{ fontSize: '14px', color: MomentumTheme.colors.text.secondary, marginLeft: '4px' }}>
                                    ({session.clientFeedback.rating}점)
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRatingModal({ isOpen: true, session });
                                  }}
                                  style={{
                                    background: 'none',
                                    border: `1px solid ${MomentumTheme.colors.gray[300]}`,
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    color: MomentumTheme.colors.text.secondary,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  수정
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRatingModal({ isOpen: true, session });
                                }}
                                style={{
                                  background: MomentumTheme.gradients.accent,
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '8px 16px',
                                  color: 'white',
                                  fontSize: '13px',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                ⭐ 상담 평가하기
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'overview' && (
            <div>
              <h2 style={{ 
                color: '#1f2937', 
                marginBottom: '24px',
                fontSize: '24px',
                fontWeight: '600'
              }}>
                📊 내 EAP 서비스 현황
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ 
                  padding: '20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px'
                }}>
                  <h3 style={{ color: '#374151', marginBottom: '16px' }}>🧠 심리상담 서비스</h3>
                  <p style={{ color: '#6b7280', marginBottom: '12px' }}>
                    직장 스트레스, 대인관계, 심리적 어려움을 전문 상담사와 함께 해결해보세요.
                  </p>
                  <div style={{ 
                    background: '#f0f9ff',
                    padding: '12px',
                    borderRadius: '8px',
                    marginTop: '12px',
                    marginBottom: '16px'
                  }}>
                    <p style={{ margin: '0', fontSize: '14px', color: '#0369a1' }}>
                      완료된 상담: {stats.counselingCount}건
                    </p>
                  </div>
                  <button 
                    onClick={() => setBookingModal({ isOpen: true, sessionType: 'psychological' })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                    🧠 심리상담 신청하기
                  </button>
                </div>
                
                <div style={{ 
                  padding: '20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px'
                }}>
                  <h3 style={{ color: '#374151', marginBottom: '16px' }}>💰 재무상담 서비스</h3>
                  <p style={{ color: '#6b7280', marginBottom: '12px' }}>
                    재무 계획, 투자 전략, 은퇴 설계를 전문 재무상담사와 함께 수립해보세요.
                  </p>
                  <div style={{ 
                    background: '#f0fdf4',
                    padding: '12px',
                    borderRadius: '8px',
                    marginTop: '12px',
                    marginBottom: '16px'
                  }}>
                    <p style={{ margin: '0', fontSize: '14px', color: '#059669' }}>
                      완료된 상담: {stats.financialCount}건
                    </p>
                  </div>
                  <button 
                    onClick={() => setBookingModal({ isOpen: true, sessionType: 'financial' })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                    💰 재무상담 신청하기
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'booking' && (
            <div>
              <h2 style={{ 
                color: MomentumTheme.colors.text.primary, 
                marginBottom: '24px',
                fontSize: MomentumTheme.typography.fontSize['2xl'],
                fontWeight: MomentumTheme.typography.fontWeight.semibold,
                fontFamily: MomentumTheme.typography.fontFamily.primary
              }}>
                📝 상담 신청
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 심리상담 신청 */}
                <div style={{
                  ...MomentumTheme.card,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>🧠</div>
                  <h3 style={{ 
                    color: MomentumTheme.colors.primary,
                    marginBottom: '12px',
                    fontSize: '20px',
                    fontWeight: '600'
                  }}>
                    심리상담 신청
                  </h3>
                  <p style={{ 
                    color: MomentumTheme.colors.text.secondary,
                    marginBottom: '20px',
                    lineHeight: '1.5'
                  }}>
                    직장 스트레스, 대인관계, 심리적 어려움을<br/>
                    전문 상담사와 함께 해결해보세요.
                  </p>
                  <button 
                    onClick={() => setBookingModal({ isOpen: true, sessionType: 'psychological' })}
                    style={{
                      ...MomentumTheme.button.primary,
                      width: '100%',
                      background: MomentumTheme.gradients.primary
                    }}>
                    심리상담 예약하기
                  </button>
                </div>

                {/* 재무상담 신청 */}
                <div style={{
                  ...MomentumTheme.card,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>💰</div>
                  <h3 style={{ 
                    color: MomentumTheme.colors.accent,
                    marginBottom: '12px',
                    fontSize: '20px',
                    fontWeight: '600'
                  }}>
                    재무상담 신청
                  </h3>
                  <p style={{ 
                    color: MomentumTheme.colors.text.secondary,
                    marginBottom: '20px',
                    lineHeight: '1.5'
                  }}>
                    재무 계획, 투자 전략, 은퇴 설계를<br/>
                    전문 재무상담사와 함께 수립해보세요.
                  </p>
                  <button 
                    onClick={() => setBookingModal({ isOpen: true, sessionType: 'financial' })}
                    style={{
                      ...MomentumTheme.button.primary,
                      width: '100%',
                      background: MomentumTheme.gradients.accent,
                      color: 'white'
                    }}>
                    재무상담 예약하기
                  </button>
                </div>
              </div>

              {/* 이용 안내 */}
              <div style={{
                ...MomentumTheme.card,
                marginTop: '24px',
                background: `linear-gradient(135deg, ${MomentumTheme.colors.surface} 0%, ${MomentumTheme.colors.gray[50]} 100%)`
              }}>
                <h3 style={{ 
                  color: MomentumTheme.colors.text.primary,
                  marginBottom: '16px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  📋 상담 이용 안내
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <h4 style={{ color: MomentumTheme.colors.text.primary, marginBottom: '8px' }}>
                      ⏰ 이용 시간
                    </h4>
                    <p style={{ color: MomentumTheme.colors.text.secondary, fontSize: '14px', margin: '0' }}>
                      월-금 09:00~18:00<br/>토요일 10:00~15:00
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: MomentumTheme.colors.text.primary, marginBottom: '8px' }}>
                      📞 상담 방식
                    </h4>
                    <p style={{ color: MomentumTheme.colors.text.secondary, fontSize: '14px', margin: '0' }}>
                      대면상담, 화상통화, 전화상담<br/>원하는 방식을 선택하세요
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div>
              <h2 style={{ 
                color: MomentumTheme.colors.text.primary, 
                marginBottom: '24px',
                fontSize: MomentumTheme.typography.fontSize['2xl'],
                fontWeight: MomentumTheme.typography.fontWeight.semibold,
                fontFamily: MomentumTheme.typography.fontFamily.primary
              }}>
                💰 나의 재무 현황
              </h2>
              
              <div style={{
                marginBottom: '20px',
                padding: '20px',
                background: `linear-gradient(135deg, ${MomentumTheme.colors.surface} 0%, ${MomentumTheme.colors.gray[50]} 100%)`,
                borderRadius: '12px',
                border: `1px solid ${MomentumTheme.colors.gray[200]}`
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div>
                    <p style={{
                      margin: '0 0 4px 0',
                      fontSize: '14px',
                      color: MomentumTheme.colors.text.primary,
                      fontWeight: '600'
                    }}>
                      📋 재무 정보 관리
                    </p>
                    <p style={{
                      margin: '0',
                      fontSize: '13px',
                      color: MomentumTheme.colors.text.secondary
                    }}>
                      재무 정보는 재무상담사와의 상담을 통해 작성됩니다.
                    </p>
                  </div>
                  <button
                    onClick={() => setBookingModal({ isOpen: true, sessionType: 'financial' })}
                    style={{
                      padding: '8px 16px',
                      background: MomentumTheme.gradients.accent,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    💰 재무상담 신청
                  </button>
                </div>
              </div>

              <PortfolioManager 
                userId={user._id}
                isReadOnly={true}
                onSave={() => {
                  // 직원은 읽기 전용이므로 저장 불가
                  console.log('직원은 읽기 전용 모드');
                }}
              />
            </div>
          )}

          {activeTab === 'goals' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ 
                  color: '#1f2937', 
                  margin: '0',
                  fontSize: '24px',
                  fontWeight: '600'
                }}>
                  🎯 목표 관리
                </h2>
                <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#6b7280' }}>
                  <span>총 {goalStats.total}개</span>
                  <span>진행중 {goalStats.active}개</span>
                  <span>완료 {goalStats.completed}개</span>
                </div>
              </div>

              {/* 목표 통계 카드 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  borderRadius: '12px',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {goalStats.total}
                  </div>
                  <div style={{ opacity: 0.9, fontSize: '14px' }}>전체 목표</div>
                </div>
                
                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: '12px',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {goalStats.active}
                  </div>
                  <div style={{ opacity: 0.9, fontSize: '14px' }}>진행중</div>
                </div>
                
                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '12px',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {goalStats.completed}
                  </div>
                  <div style={{ opacity: 0.9, fontSize: '14px' }}>완료</div>
                </div>
                
                <div style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  borderRadius: '12px',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {goalStats.averageProgress}%
                  </div>
                  <div style={{ opacity: 0.9, fontSize: '14px' }}>평균 달성률</div>
                </div>
              </div>

              {/* 목표 목록 */}
              {goals.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                  <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>설정된 목표가 없습니다</h3>
                  <p>상담사와 함께 개인 목표를 설정해보세요!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {goals.map((goal, index) => (
                    <div key={goal._id} style={{
                      padding: '20px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      backgroundColor: '#ffffff'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                            {goal.title}
                          </h3>
                          <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
                            {goal.description}
                          </p>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            상담사: {goal.counselor?.name} | 마감일: {new Date(goal.targetDate).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: goal.status === 'completed' ? '#10b981' : goal.status === 'active' ? '#f59e0b' : '#6b7280',
                          color: 'white'
                        }}>
                          {goal.status === 'completed' ? '완료' : goal.status === 'active' ? '진행중' : goal.status}
                        </span>
                      </div>
                      
                      {/* 진행률 바 */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                          <span style={{ color: '#6b7280' }}>진행률</span>
                          <span style={{ color: '#1f2937', fontWeight: '600' }}>{goal.progress}%</span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${goal.progress}%`,
                            height: '100%',
                            background: goal.progress >= 100 ? '#10b981' : goal.progress >= 50 ? '#f59e0b' : '#3b82f6',
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                      </div>

                      {/* 목표값 정보 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280' }}>
                        <span>현재: {goal.currentValue} {goal.unit}</span>
                        <span>목표: {goal.targetValue} {goal.unit}</span>
                      </div>

                      {/* 액션 스텝 (있는 경우) */}
                      {goal.actionSteps && goal.actionSteps.length > 0 && (
                        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>
                            실행 단계 ({goal.actionSteps.filter((step: any) => step.isCompleted).length}/{goal.actionSteps.length})
                          </div>
                          <div style={{ display: 'grid', gap: '4px' }}>
                            {goal.actionSteps.map((step: any, stepIndex: number) => (
                              <div key={stepIndex} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '13px'
                              }}>
                                <span style={{
                                  color: step.isCompleted ? '#10b981' : '#9ca3af',
                                  fontSize: '14px'
                                }}>
                                  {step.isCompleted ? '✅' : '⭕'}
                                </span>
                                <span style={{
                                  color: step.isCompleted ? '#6b7280' : '#1f2937',
                                  textDecoration: step.isCompleted ? 'line-through' : 'none'
                                }}>
                                  {step.step}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'resources' && (
            <ResourcesBoard />
          )}
        </div>
      </div>

      {/* 상담신청 모달 */}
      <BookingModal
        isOpen={bookingModal.isOpen}
        onClose={() => setBookingModal({ ...bookingModal, isOpen: false })}
        sessionType={bookingModal.sessionType}
        onSuccess={() => {
          loadDashboardData(); // 예약 후 데이터 새로고침
        }}
      />

      {/* 세션 평점 모달 */}
      {ratingModal.isOpen && ratingModal.session && (
        <SessionRating
          sessionId={ratingModal.session._id}
          sessionType={ratingModal.session.sessionCategory}
          advisorName={ratingModal.session.advisor.name}
          currentRating={ratingModal.session.clientFeedback}
          onRatingSubmitted={() => {
            loadDashboardData(); // 평점 등록 후 데이터 새로고침
          }}
          onClose={() => setRatingModal({ isOpen: false, session: null })}
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;