import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NotificationBell from '../components/Notifications/NotificationBell.tsx';
import PortfolioManager from '../components/FinancialPortfolio/PortfolioManager.tsx';
import ReportsSection from '../components/FinancialAdvisor/ReportsSection.tsx';
import { MomentumTheme, MomentumComponents } from '../styles/MomentumTheme.ts';

interface FinancialAdvisorDashboardProps {
  user: any;
  onLogout: () => void;
}

interface FinancialSession {
  _id: string;
  scheduledDate: string;
  duration: number;
  sessionType: string;
  format: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  client: {
    _id: string;
    name: string;
    email: string;
    department: string;
  };
  sessionRecord?: {
    mainTopics: string[];
    recommendations: string[];
    followUpNeeded: boolean;
    nextSessionDate?: string;
  };
}

interface DashboardStats {
  weeklyScheduled: number;
  totalClients: number;
  monthlyStats: Array<{
    _id: string;
    count: number;
  }>;
  satisfaction: {
    avgRating: number;
    totalFeedbacks: number;
  };
}

const FinancialAdvisorDashboard: React.FC<FinancialAdvisorDashboardProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<FinancialSession[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // 재무상담 세션 데이터 로드
      const sessionsResponse = await axios.get('http://localhost:3000/api/financial-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(sessionsResponse.data.sessions || []);
      
      // 대시보드 통계 데이터 로드
      const statsResponse = await axios.get('http://localhost:3000/api/financial-sessions/advisor/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(statsResponse.data);
      
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      // 에러 시 빈 데이터로 설정
      setSessions([]);
      setStats(null);
    } finally {
      setLoading(false);
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
            borderTop: '3px solid #10b981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>재무상담사 대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      fontFamily: '"Segoe UI", "Malgun Gothic", sans-serif'
    }}>
      {/* 헤더 - Momentum 재무상담 스타일 */}
      <div style={{
        ...MomentumComponents.header,
        background: MomentumTheme.gradients.accent  // 재무상담용 코랄 색상
      }}>
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
              💰 재무상담사 대시보드
            </h1>
            <p style={{ 
              margin: '0', 
              fontSize: '16px', 
              opacity: 0.9 
            }}>
              안녕하세요, {user.name} 재무상담사님!
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
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
        {/* 탭 메뉴 */}
        <div style={{ 
          display: 'flex', 
          marginBottom: '30px',
          background: 'white',
          borderRadius: '12px',
          padding: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          {[
            { key: 'schedule', label: '📅 일정 관리', icon: '📅' },
            { key: 'clients', label: '👥 고객 관리', icon: '👥' },
            { key: 'portfolio', label: '💰 포트폴리오', icon: '💰' },
            { key: 'reports', label: '📊 리포트', icon: '📊' },
            { key: 'settings', label: '⚙️ 설정', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '15px 20px',
                border: 'none',
                borderRadius: '8px',
                background: activeTab === tab.key 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                  : 'transparent',
                color: activeTab === tab.key ? 'white' : '#6b7280',
                fontSize: '16px',
                fontWeight: activeTab === tab.key ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '20px',
            marginBottom: '30px' 
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '16px',
              padding: '24px',
              color: 'white',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', opacity: 0.9 }}>이번 주 예정 상담</h3>
              <p style={{ margin: '0', fontSize: '32px', fontWeight: '700' }}>{stats.weeklyScheduled}</p>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              borderRadius: '16px',
              padding: '24px',
              color: 'white',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', opacity: 0.9 }}>총 고객 수</h3>
              <p style={{ margin: '0', fontSize: '32px', fontWeight: '700' }}>{stats.totalClients}</p>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: '16px',
              padding: '24px',
              color: 'white',
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', opacity: 0.9 }}>평균 만족도</h3>
              <p style={{ margin: '0', fontSize: '32px', fontWeight: '700' }}>
                {stats.satisfaction.avgRating ? `${stats.satisfaction.avgRating.toFixed(1)}/5` : 'N/A'}
              </p>
            </div>
            
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: '16px',
              padding: '24px',
              color: 'white',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)'
            }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', opacity: 0.9 }}>이번 달 완료</h3>
              <p style={{ margin: '0', fontSize: '32px', fontWeight: '700' }}>
                {stats.monthlyStats.find(s => s._id === 'completed')?.count || 0}
              </p>
            </div>
          </div>
        )}

        {/* 탭 컨텐츠 */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          minHeight: '400px'
        }}>
          {activeTab === 'schedule' && (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '24px' 
              }}>
                <h2 style={{ 
                  color: '#1f2937', 
                  margin: '0',
                  fontSize: '24px',
                  fontWeight: '600'
                }}>
                  📅 재무상담 일정
                </h2>
                <button style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  + 새 상담 예약
                </button>
              </div>
              
              {sessions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                  <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>재무상담 세션</h3>
                  <p>아직 예약된 재무상담이 없습니다.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sessions.slice(0, 5).map(session => (
                    <div key={session._id} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '20px',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.borderColor = '#10b981';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <h4 style={{ 
                            margin: '0 0 8px 0', 
                            color: '#1f2937',
                            fontSize: '18px',
                            fontWeight: '600'
                          }}>
                            {session.client.name} - {session.sessionType}
                          </h4>
                          <p style={{ 
                            margin: '0 0 4px 0', 
                            color: '#6b7280',
                            fontSize: '14px' 
                          }}>
                            📧 {session.client.email}
                          </p>
                          <p style={{ 
                            margin: '0', 
                            color: '#6b7280',
                            fontSize: '14px' 
                          }}>
                            🏢 {session.client.department}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            background: session.status === 'scheduled' ? '#dbeafe' :
                                      session.status === 'completed' ? '#d1fae5' :
                                      session.status === 'in-progress' ? '#fef3c7' : '#fee2e2',
                            color: session.status === 'scheduled' ? '#1e40af' :
                                   session.status === 'completed' ? '#065f46' :
                                   session.status === 'in-progress' ? '#92400e' : '#dc2626',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            marginBottom: '8px'
                          }}>
                            {session.status === 'scheduled' ? '예정' :
                             session.status === 'completed' ? '완료' :
                             session.status === 'in-progress' ? '진행중' : 
                             session.status === 'cancelled' ? '취소' : '미출석'}
                          </div>
                          <p style={{ 
                            margin: '0', 
                            color: '#4b5563',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}>
                            {new Date(session.scheduledDate).toLocaleDateString('ko-KR')}
                          </p>
                          <p style={{ 
                            margin: '0', 
                            color: '#6b7280',
                            fontSize: '12px'
                          }}>
                            {session.duration}분 • {session.format === 'video-call' ? '화상통화' : 
                            session.format === 'phone-call' ? '전화상담' : '대면상담'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'clients' && (
            <div>
              <h2 style={{ 
                color: '#1f2937', 
                marginBottom: '20px',
                fontSize: '24px',
                fontWeight: '600'
              }}>
                👥 고객 관리
              </h2>
              
              {sessions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
                  <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>고객 목록</h3>
                  <p>등록된 재무상담 고객이 없습니다.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {sessions.filter((session, index, self) => 
                    index === self.findIndex(s => s.client._id === session.client._id)
                  ).map(session => (
                    <div key={session.client._id} style={{
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => {
                      setSelectedClientId(session.client._id);
                      setActiveTab('portfolio');
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    >
                      <h3 style={{ 
                        margin: '0 0 8px 0', 
                        color: '#1f2937',
                        fontSize: '18px',
                        fontWeight: '600'
                      }}>
                        {session.client.name}
                      </h3>
                      <p style={{ margin: '0 0 4px 0', color: '#6b7280', fontSize: '14px' }}>
                        📧 {session.client.email}
                      </p>
                      <p style={{ margin: '0 0 12px 0', color: '#6b7280', fontSize: '14px' }}>
                        🏢 {session.client.department}
                      </p>
                      <div style={{
                        background: '#f0f9ff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#0369a1',
                        fontWeight: '500'
                      }}>
                        포트폴리오 관리하기 →
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div>
              {selectedClientId ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <button
                      onClick={() => {
                        setSelectedClientId(null);
                        setActiveTab('clients');
                      }}
                      style={{
                        background: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151'
                      }}
                    >
                      ← 고객 목록
                    </button>
                    <h2 style={{ 
                      color: '#1f2937', 
                      margin: '0',
                      fontSize: '24px',
                      fontWeight: '600'
                    }}>
                      💰 재무 포트폴리오 관리
                    </h2>
                  </div>
                  
                  <PortfolioManager 
                    userId={selectedClientId}
                    onSave={(profile) => {
                      console.log('포트폴리오 저장됨:', profile);
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
                  <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>포트폴리오 관리</h3>
                  <p>고객을 선택하여 재무 포트폴리오를 관리하세요.</p>
                  <button
                    onClick={() => setActiveTab('clients')}
                    style={{
                      marginTop: '16px',
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    고객 선택하기
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <ReportsSection advisorId={user._id} />
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 style={{ 
                color: '#1f2937', 
                marginBottom: '20px',
                fontSize: '24px',
                fontWeight: '600'
              }}>
                ⚙️ 재무상담사 설정
              </h2>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{
                  padding: '20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px'
                }}>
                  <h3 style={{ color: '#374151', marginBottom: '10px' }}>프로필 정보</h3>
                  <p style={{ color: '#6b7280', marginBottom: '5px' }}>이름: {user.name}</p>
                  <p style={{ color: '#6b7280', marginBottom: '5px' }}>이메일: {user.email}</p>
                  <p style={{ color: '#6b7280', marginBottom: '5px' }}>역할: 재무상담사</p>
                </div>
                
                <div style={{
                  padding: '20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px'
                }}>
                  <h3 style={{ color: '#374151', marginBottom: '10px' }}>상담료 설정</h3>
                  <p style={{ color: '#6b7280' }}>시간당 상담료를 설정할 수 있습니다.</p>
                  <button style={{
                    marginTop: '10px',
                    padding: '10px 20px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}>
                    설정 변경
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialAdvisorDashboard;