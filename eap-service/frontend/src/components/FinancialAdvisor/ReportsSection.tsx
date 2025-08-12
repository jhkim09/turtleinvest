import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MomentumTheme } from '../../styles/MomentumTheme.ts';
import DonutChart from '../Charts/DonutChart.tsx';

interface Client {
  _id: string;
  name: string;
  email: string;
  department: string;
}

interface FinancialProfile {
  _id: string;
  user: Client;
  currentAssets: {
    cash: number;
    savings: number;
    investments: number;
    realEstate: number;
    other: number;
  };
  currentLiabilities: {
    creditCard: number;
    loans: number;
    mortgage: number;
    other: number;
  };
  monthlyIncome: {
    salary: number;
    business: number;
    investment: number;
    other: number;
  };
  monthlyExpenses: {
    living: number;
    housing: number;
    insurance: number;
    education: number;
    other: number;
  };
  financialGoals: Array<{
    _id: string;
    title: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    status: string;
    priority: string;
  }>;
  riskProfile: string;
  investmentExperience: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportsSectionProps {
  advisorId: string;
}

const ReportsSection: React.FC<ReportsSectionProps> = ({ advisorId }) => {
  const [clients, setClients] = useState<FinancialProfile[]>([]);
  const [selectedClient, setSelectedClient] = useState<FinancialProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'overview' | 'detailed' | 'goals'>('overview');

  useEffect(() => {
    loadClients();
  }, [advisorId]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/financial-profiles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data);
      if (response.data.length > 0) {
        setSelectedClient(response.data[0]);
      }
    } catch (error) {
      console.error('고객 목록 로드 실패:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const formatWon = (value: number): string => {
    return new Intl.NumberFormat('ko-KR').format(value) + '원';
  };

  const formatWonUnits = (value: number): string => {
    return new Intl.NumberFormat('ko-KR').format(value / 10000) + '만원';
  };

  const calculateNetWorth = (profile: FinancialProfile) => {
    const totalAssets = Object.values(profile.currentAssets).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = Object.values(profile.currentLiabilities).reduce((sum, val) => sum + val, 0);
    return totalAssets - totalLiabilities;
  };

  const calculateMonthlyNet = (profile: FinancialProfile) => {
    const totalIncome = Object.values(profile.monthlyIncome).reduce((sum, val) => sum + val, 0);
    const totalExpenses = Object.values(profile.monthlyExpenses).reduce((sum, val) => sum + val, 0);
    return totalIncome - totalExpenses;
  };

  const calculateGoalProgress = (goals: FinancialProfile['financialGoals']) => {
    if (goals.length === 0) return 0;
    return goals.reduce((sum, goal) => {
      const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
      return sum + Math.min(progress, 100);
    }, 0) / goals.length;
  };

  const generateRecommendations = (profile: FinancialProfile) => {
    const recommendations: string[] = [];
    const netWorth = calculateNetWorth(profile);
    const monthlyNet = calculateMonthlyNet(profile);
    const totalAssets = Object.values(profile.currentAssets).reduce((sum, val) => sum + val, 0);
    const totalLiabilities = Object.values(profile.currentLiabilities).reduce((sum, val) => sum + val, 0);

    if (monthlyNet < 0) {
      recommendations.push('월 지출이 수입보다 높습니다. 가계부를 점검하여 불필요한 지출을 줄이는 것을 권장합니다.');
    }

    if (totalLiabilities > totalAssets * 0.3) {
      recommendations.push('부채 비율이 높습니다. 고금리 부채부터 우선적으로 상환 계획을 세우시기 바랍니다.');
    }

    if (profile.currentAssets.cash < monthlyNet * 6) {
      recommendations.push('비상자금이 부족합니다. 월 생활비의 6개월분 이상을 현금성 자산으로 보유하시기 바랍니다.');
    }

    if (profile.currentAssets.investments < totalAssets * 0.1 && profile.riskProfile !== 'conservative') {
      recommendations.push('투자 비중이 낮습니다. 위험 성향에 맞는 투자 포트폴리오 구성을 검토해보시기 바랍니다.');
    }

    const activeGoals = profile.financialGoals.filter(goal => goal.status === 'planning' || goal.status === 'in-progress');
    if (activeGoals.length === 0) {
      recommendations.push('구체적인 재무 목표가 없습니다. 단기 및 장기 재무 목표를 설정하시기 바랍니다.');
    }

    if (recommendations.length === 0) {
      recommendations.push('전반적으로 양호한 재무 상태입니다. 현재 계획을 꾸준히 실행하시기 바랍니다.');
    }

    return recommendations;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #f3f3f3',
          borderTop: `3px solid ${MomentumTheme.colors.primary}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#9ca3af'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
        <h3 style={{ color: '#6b7280', marginBottom: '8px' }}>고객 데이터 없음</h3>
        <p>재무 프로필이 등록된 고객이 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{
          color: MomentumTheme.colors.text.primary,
          margin: '0',
          fontSize: '24px',
          fontWeight: '600'
        }}>
          📊 재무분석 리포트
        </h2>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* 고객 선택 */}
          <select
            value={selectedClient?._id || ''}
            onChange={(e) => {
              const client = clients.find(c => c._id === e.target.value);
              setSelectedClient(client || null);
            }}
            style={{
              padding: '8px 12px',
              border: `1px solid ${MomentumTheme.colors.gray[300]}`,
              borderRadius: '8px',
              fontSize: '14px',
              minWidth: '150px'
            }}
          >
            {clients.map(client => (
              <option key={client._id} value={client._id}>
                {client.user.name}
              </option>
            ))}
          </select>

          {/* 리포트 타입 선택 */}
          <div style={{
            display: 'flex',
            background: 'white',
            borderRadius: '8px',
            padding: '2px',
            border: `1px solid ${MomentumTheme.colors.gray[300]}`
          }}>
            {[
              { key: 'overview', label: '개요' },
              { key: 'detailed', label: '상세' },
              { key: 'goals', label: '목표' }
            ].map((type) => (
              <button
                key={type.key}
                onClick={() => setReportType(type.key as any)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: reportType === type.key
                    ? MomentumTheme.gradients.primary
                    : 'transparent',
                  color: reportType === type.key ? 'white' : MomentumTheme.colors.text.secondary,
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedClient && (
        <div>
          {reportType === 'overview' && (
            <div>
              {/* 고객 기본 정보 */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{
                  color: MomentumTheme.colors.primary,
                  marginBottom: '16px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  👤 고객 정보
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: MomentumTheme.colors.text.secondary }}>
                      이름: <span style={{ fontWeight: '600', color: MomentumTheme.colors.text.primary }}>{selectedClient.user.name}</span>
                    </p>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: MomentumTheme.colors.text.secondary }}>
                      부서: <span style={{ fontWeight: '600', color: MomentumTheme.colors.text.primary }}>{selectedClient.user.department}</span>
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: MomentumTheme.colors.text.secondary }}>
                      투자성향: <span style={{ fontWeight: '600', color: MomentumTheme.colors.text.primary }}>
                        {selectedClient.riskProfile === 'conservative' ? '안정형' :
                         selectedClient.riskProfile === 'moderate' ? '적극형' : '공격형'}
                      </span>
                    </p>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: MomentumTheme.colors.text.secondary }}>
                      투자경험: <span style={{ fontWeight: '600', color: MomentumTheme.colors.text.primary }}>
                        {selectedClient.investmentExperience === 'beginner' ? '초보자' :
                         selectedClient.investmentExperience === 'intermediate' ? '중급자' : '숙련자'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 재무 요약 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  background: MomentumTheme.gradients.primary,
                  color: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', opacity: 0.9 }}>순자산</h4>
                  <p style={{ margin: '0', fontSize: '20px', fontWeight: '700' }}>
                    {formatWonUnits(calculateNetWorth(selectedClient))}
                  </p>
                </div>

                <div style={{
                  background: MomentumTheme.gradients.tealPurple,
                  color: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', opacity: 0.9 }}>월 순소득</h4>
                  <p style={{ margin: '0', fontSize: '20px', fontWeight: '700' }}>
                    {formatWonUnits(calculateMonthlyNet(selectedClient))}
                  </p>
                </div>

                <div style={{
                  background: MomentumTheme.gradients.accent,
                  color: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', opacity: 0.9 }}>목표 달성률</h4>
                  <p style={{ margin: '0', fontSize: '20px', fontWeight: '700' }}>
                    {calculateGoalProgress(selectedClient.financialGoals).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* 권장사항 */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{
                  color: MomentumTheme.colors.primary,
                  marginBottom: '16px',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  💡 맞춤 권장사항
                </h3>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  {generateRecommendations(selectedClient).map((recommendation, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '16px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${MomentumTheme.colors.primary}`
                      }}
                    >
                      <p style={{
                        margin: '0',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        color: MomentumTheme.colors.text.primary
                      }}>
                        {recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {reportType === 'detailed' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px'
            }}>
              {/* 자산/부채 차트 */}
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}>
                <DonutChart
                  title="자산 분포"
                  data={[
                    { label: '현금/예금', value: selectedClient.currentAssets.cash, color: '#5c7ee5' },
                    { label: '적금/저축', value: selectedClient.currentAssets.savings, color: '#10b981' },
                    { label: '투자자산', value: selectedClient.currentAssets.investments, color: '#f59e0b' },
                    { label: '부동산', value: selectedClient.currentAssets.realEstate, color: '#8b5cf6' },
                    { label: '기타자산', value: selectedClient.currentAssets.other, color: '#6b7280' }
                  ].filter(item => item.value > 0)}
                  centerText="총 자산"
                  centerValue={formatWonUnits(Object.values(selectedClient.currentAssets).reduce((sum, val) => sum + val, 0))}
                  width={300}
                  height={300}
                />
              </div>

              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}>
                <DonutChart
                  title="월 수입/지출"
                  data={[
                    { label: '급여소득', value: selectedClient.monthlyIncome.salary, color: '#5c7ee5' },
                    { label: '사업소득', value: selectedClient.monthlyIncome.business, color: '#10b981' },
                    { label: '투자소득', value: selectedClient.monthlyIncome.investment, color: '#f59e0b' },
                    { label: '기타소득', value: selectedClient.monthlyIncome.other, color: '#8b5cf6' }
                  ].filter(item => item.value > 0)}
                  centerText="월 수입"
                  centerValue={formatWonUnits(Object.values(selectedClient.monthlyIncome).reduce((sum, val) => sum + val, 0))}
                  width={300}
                  height={300}
                />
              </div>
            </div>
          )}

          {reportType === 'goals' && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{
                color: MomentumTheme.colors.primary,
                marginBottom: '20px',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                🎯 재무 목표 현황 ({selectedClient.financialGoals.length}개)
              </h3>

              {selectedClient.financialGoals.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                  <p>설정된 재무 목표가 없습니다.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {selectedClient.financialGoals.map((goal) => {
                    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                    const isOverdue = new Date(goal.targetDate) < new Date() && goal.status !== 'achieved';

                    return (
                      <div
                        key={goal._id}
                        style={{
                          border: `2px solid ${isOverdue ? '#fef3c7' : MomentumTheme.colors.gray[200]}`,
                          borderRadius: '12px',
                          padding: '20px',
                          background: isOverdue ? '#fffbeb' : 'white'
                        }}
                      >
                        <div style={{ marginBottom: '12px' }}>
                          <h4 style={{
                            margin: '0 0 8px 0',
                            color: MomentumTheme.colors.text.primary,
                            fontSize: '16px',
                            fontWeight: '600'
                          }}>
                            {goal.title}
                          </h4>

                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{
                              background: goal.priority === 'high' ? '#ef4444' :
                                         goal.priority === 'medium' ? '#f59e0b' : '#10b981',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {goal.priority === 'high' ? '높음' :
                               goal.priority === 'medium' ? '보통' : '낮음'}
                            </span>

                            <span style={{
                              background: goal.status === 'planning' ? '#6b7280' :
                                         goal.status === 'in-progress' ? '#3b82f6' :
                                         goal.status === 'achieved' ? '#10b981' : '#ef4444',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {goal.status === 'planning' ? '계획' :
                               goal.status === 'in-progress' ? '진행중' :
                               goal.status === 'achieved' ? '달성' : '중단'}
                            </span>

                            {isOverdue && (
                              <span style={{
                                background: '#f59e0b',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}>
                                기한 초과
                              </span>
                            )}
                          </div>

                          <p style={{
                            margin: '0 0 4px 0',
                            fontSize: '14px',
                            color: MomentumTheme.colors.text.secondary
                          }}>
                            목표: {formatWonUnits(goal.targetAmount)} | 현재: {formatWonUnits(goal.currentAmount)}
                          </p>

                          <p style={{
                            margin: '0',
                            fontSize: '14px',
                            color: MomentumTheme.colors.text.secondary
                          }}>
                            목표일: {new Date(goal.targetDate).toLocaleDateString('ko-KR')}
                          </p>
                        </div>

                        {/* 진행률 바 */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', color: MomentumTheme.colors.text.secondary }}>
                              진행률
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: MomentumTheme.colors.text.primary }}>
                              {progress.toFixed(1)}%
                            </span>
                          </div>

                          <div style={{
                            width: '100%',
                            height: '8px',
                            background: MomentumTheme.colors.gray[200],
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(progress, 100)}%`,
                              height: '100%',
                              background: progress >= 100 ? '#10b981' : MomentumTheme.gradients.primary,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsSection;