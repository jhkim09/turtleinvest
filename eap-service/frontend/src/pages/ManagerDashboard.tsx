import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ManagerDashboardProps {
  user: any;
  onLogout: () => void;
}

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  annualLimit: number;
  usedSessions: number;
  remainingSessions: number;
  appointments: any[];
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ user, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [departmentStats, setDepartmentStats] = useState<any>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showMemberDetail, setShowMemberDetail] = useState(false);

  useEffect(() => {
    fetchManagerData();
  }, []);

  const fetchManagerData = async () => {
    try {
      
      // 실제 API 호출 시도
      const token = localStorage.getItem('token');
      
      // 팀원 목록 조회
      const teamResponse = await axios.get('http://localhost:3000/api/manager/team-members', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeamMembers(teamResponse.data);
      
      // 부서 통계 조회
      const statsResponse = await axios.get('http://localhost:3000/api/manager/department-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartmentStats(statsResponse.data);
      
    } catch (error) {
      console.error('Manager data fetch failed:', error);
      // 데모 데이터 사용
      setTeamMembers([
        {
          _id: '1',
          name: '김직원',
          email: 'kim@company.com',
          department: 'IT개발팀',
          position: '선임연구원',
          annualLimit: 12,
          usedSessions: 3,
          remainingSessions: 9,
          appointments: [
            { date: '2025-08-10', type: 'individual', status: 'completed', topic: '스트레스 관리' },
            { date: '2025-08-20', type: 'individual', status: 'scheduled', topic: '업무 효율성' }
          ]
        },
        {
          _id: '2',
          name: '이사원',
          email: 'lee@company.com',
          department: 'IT개발팀',
          position: '주임연구원',
          annualLimit: 12,
          usedSessions: 7,
          remainingSessions: 5,
          appointments: [
            { date: '2025-07-15', type: 'group', status: 'completed', topic: '인간관계' },
            { date: '2025-08-25', type: 'individual', status: 'scheduled', topic: '진로 상담' }
          ]
        },
        {
          _id: '3',
          name: '박대리',
          email: 'park@company.com',
          department: 'IT개발팀',
          position: '책임연구원',
          annualLimit: 15,
          usedSessions: 2,
          remainingSessions: 13,
          appointments: [
            { date: '2025-08-05', type: 'individual', status: 'completed', topic: '워라밸' }
          ]
        }
      ]);
      
      setDepartmentStats({
        totalMembers: 3,
        totalSessions: 12,
        completedSessions: 8,
        scheduledSessions: 4,
        averageUsage: 4.0,
        highUsageMembers: 1,
        lowUsageMembers: 1
      });
    } finally {
      setLoading(false);
    }
  };


  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
  };

  const openMemberDetail = (member: TeamMember) => {
    setSelectedMember(member);
    setShowMemberDetail(true);
  };

  const closeMemberDetail = () => {
    setShowMemberDetail(false);
    setSelectedMember(null);
  };

  const getUsageColor = (usedSessions: number, annualLimit: number) => {
    const percentage = (usedSessions / annualLimit) * 100;
    if (percentage >= 80) return '#f44336'; // 빨간색 - 높은 사용량
    if (percentage >= 60) return '#ff9800'; // 주황색 - 보통 사용량
    return '#4caf50'; // 초록색 - 낮은 사용량
  };

  const getUsageStatus = (usedSessions: number, annualLimit: number) => {
    const percentage = (usedSessions / annualLimit) * 100;
    if (percentage >= 80) return '높음';
    if (percentage >= 60) return '보통';
    if (percentage >= 30) return '적정';
    return '낮음';
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
          <h2 style={{ color: '#333' }}>관리자 대시보드 로딩 중...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom, #f8fafc 0%, #fff3e0 50%, #e8f5e8 100%)', 
      fontFamily: '"Segoe UI", "Malgun Gothic", sans-serif' 
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #ff9800 0%, #4caf50 100%)',
        color: 'white',
        padding: '0',
        boxShadow: '0 4px 20px rgba(255, 152, 0, 0.25)',
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
                👨‍💼 팀 관리 대시보드
              </h1>
              <p style={{ 
                color: 'rgba(255, 255, 255, 0.9)', 
                margin: '8px 0 0 0', 
                fontSize: '16px', 
                fontWeight: '300' 
              }}>
                {user?.department || 'IT개발팀'} 상담 현황 관리
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
                  팀 관리자
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
        backgroundColor: 'white',
        borderBottom: '1px solid #e1e1e1',
        padding: '0'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            {[
              { name: '팀 현황', active: true },
              { name: '상담 통계', active: false },
              { name: '직원 관리', active: false },
              { name: '리포트', active: false }
            ].map((item, index) => (
              <div
                key={index}
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
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#333', fontSize: '28px', margin: '0 0 10px 0' }}>
            팀 상담 현황 대시보드
          </h2>
          <p style={{ color: '#666', margin: '0' }}>
            우리 팀 구성원들의 EAP 상담 이용 현황을 확인하세요
          </p>
        </div>


        {/* 부서 통계 카드들 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
              👥 팀원 수
            </h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
              {departmentStats?.totalMembers || 0}명
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#4caf50', fontSize: '16px', margin: '0 0 10px 0' }}>
              ✅ 완료 상담
            </h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
              {departmentStats?.completedSessions || 0}회
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#ff9800', fontSize: '16px', margin: '0 0 10px 0' }}>
              📅 예정 상담
            </h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
              {departmentStats?.scheduledSessions || 0}회
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#9c27b0', fontSize: '16px', margin: '0 0 10px 0' }}>
              📊 평균 이용률
            </h3>
            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '0' }}>
              {departmentStats?.averageUsage || 0}회
            </p>
          </div>
        </div>

        {/* 팀원 상담 현황 테이블 */}
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0' }}>
            👨‍👩‍👧‍👦 팀원별 상담 현황
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>이름</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>직책</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>연간 할당</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>이용 횟수</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>남은 횟수</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>이용률</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>상태</th>
                  <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>상세</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>{member.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{member.email}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>{member.position}</td>
                    <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>{member.annualLimit}회</td>
                    <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <span style={{ 
                        color: getUsageColor(member.usedSessions, member.annualLimit),
                        fontWeight: 'bold'
                      }}>
                        {member.usedSessions}회
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>{member.remainingSessions}회</td>
                    <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                      {Math.round((member.usedSessions / member.annualLimit) * 100)}%
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        backgroundColor: `${getUsageColor(member.usedSessions, member.annualLimit)}20`,
                        color: getUsageColor(member.usedSessions, member.annualLimit)
                      }}>
                        {getUsageStatus(member.usedSessions, member.annualLimit)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>
                      <button
                        onClick={() => openMemberDetail(member)}
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
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 빠른 실행 */}
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#333', fontSize: '20px', margin: '0 0 20px 0' }}>
            ⚡ 관리자 기능
          </h3>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
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
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(25, 118, 210, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(25, 118, 210, 0.3)';
            }}>
              📊 월간 리포트 생성
            </button>
            
            <button style={{
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
              👥 신규 직원 등록
            </button>
            
          </div>
        </div>
      </main>

      {/* 직원 상세 모달 */}
      {showMemberDetail && selectedMember && (
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
              👤 {selectedMember.name}님 상담 상세 현황
            </h3>
            
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <div>
                  <strong>📧 이메일:</strong> {selectedMember.email}
                </div>
                <div>
                  <strong>💼 직책:</strong> {selectedMember.position}
                </div>
                <div>
                  <strong>🎯 연간 할당:</strong> {selectedMember.annualLimit}회
                </div>
                <div>
                  <strong>✅ 이용 횟수:</strong> 
                  <span style={{ 
                    color: getUsageColor(selectedMember.usedSessions, selectedMember.annualLimit),
                    fontWeight: 'bold',
                    marginLeft: '5px'
                  }}>
                    {selectedMember.usedSessions}회
                  </span>
                </div>
                <div>
                  <strong>⏳ 남은 횟수:</strong> {selectedMember.remainingSessions}회
                </div>
                <div>
                  <strong>📊 이용률:</strong> {Math.round((selectedMember.usedSessions / selectedMember.annualLimit) * 100)}%
                </div>
              </div>
            </div>

            <h4 style={{ color: '#333', margin: '20px 0 15px 0' }}>📋 상담 이력</h4>
            
            {selectedMember.appointments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedMember.appointments.map((appointment, index) => (
                  <div key={index} style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: '#333' }}>
                          📅 {appointment.date}
                        </strong>
                        <span style={{ 
                          marginLeft: '12px', 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '12px', 
                          backgroundColor: appointment.status === 'completed' ? '#e8f5e8' : '#e3f2fd',
                          color: appointment.status === 'completed' ? '#2e7d32' : '#1565c0'
                        }}>
                          {appointment.status === 'completed' ? '완료' : '예정'}
                        </span>
                        <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                          💬 {appointment.topic} ({appointment.type === 'individual' ? '개인상담' : '그룹상담'})
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                아직 상담 이력이 없습니다.
              </p>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={closeMemberDetail}
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

export default ManagerDashboard;