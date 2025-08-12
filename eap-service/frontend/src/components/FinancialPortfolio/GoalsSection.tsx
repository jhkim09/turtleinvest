import React, { useState } from 'react';
import { MomentumTheme } from '../../styles/MomentumTheme.ts';

interface FinancialGoal {
  _id?: string;
  title: string;
  targetAmount: number;
  targetDate: string;
  currentAmount: number;
  priority: 'high' | 'medium' | 'low';
  status: 'planning' | 'in-progress' | 'achieved' | 'suspended';
}

interface GoalsSectionProps {
  goals: FinancialGoal[];
  onAddGoal: (goal: Omit<FinancialGoal, '_id' | 'currentAmount' | 'status'>) => Promise<void>;
  onUpdateGoal: (goalId: string, updates: Partial<FinancialGoal>) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  isReadOnly?: boolean;
}

const GoalsSection: React.FC<GoalsSectionProps> = ({ 
  goals, 
  onAddGoal, 
  onUpdateGoal, 
  onDeleteGoal, 
  isReadOnly = false 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [updatingProgress, setUpdatingProgress] = useState<string | null>(null);
  const [progressAmount, setProgressAmount] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    targetAmount: '',
    targetDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low'
  });

  const toWonUnits = (value: number): string => (value / 10000).toString();
  const fromWonUnits = (value: string): number => parseFloat(value || '0') * 10000;
  const formatWonUnits = (value: number): string => 
    new Intl.NumberFormat('ko-KR').format(value / 10000) + '만원';

  const resetForm = () => {
    setFormData({ title: '', targetAmount: '', targetDate: '', priority: 'medium' });
    setEditingGoal(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 입력 검증
    if (!formData.title.trim()) {
      alert('목표명을 입력해주세요.');
      return;
    }
    if (!formData.targetAmount || parseFloat(formData.targetAmount) <= 0) {
      alert('목표 금액을 올바르게 입력해주세요.');
      return;
    }
    if (!formData.targetDate) {
      alert('목표 날짜를 선택해주세요.');
      return;
    }
    
    try {
      const goalData = {
        title: formData.title,
        targetAmount: fromWonUnits(formData.targetAmount),
        targetDate: formData.targetDate,
        priority: formData.priority
      };

      if (editingGoal) {
        await onUpdateGoal(editingGoal._id!, goalData);
      } else {
        await onAddGoal(goalData);
      }
      
      resetForm();
    } catch (error) {
      console.error('목표 저장 실패:', error);
      alert('목표 저장 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
    }
  };

  const startEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      targetAmount: toWonUnits(goal.targetAmount),
      targetDate: goal.targetDate.split('T')[0],
      priority: goal.priority
    });
    setShowForm(true);
  };

  const startProgressUpdate = (goal: FinancialGoal) => {
    setUpdatingProgress(goal._id!);
    setProgressAmount(toWonUnits(goal.currentAmount));
  };

  const handleProgressUpdate = async (goalId: string) => {
    try {
      const currentAmount = fromWonUnits(progressAmount);
      
      // 입력 검증
      if (!progressAmount || isNaN(currentAmount) || currentAmount < 0) {
        alert('올바른 금액을 입력해주세요.');
        return;
      }

      await onUpdateGoal(goalId, { currentAmount });
      
      setUpdatingProgress(null);
      setProgressAmount('');
    } catch (error) {
      console.error('달성률 업데이트 실패:', error);
      alert('달성률 업데이트 중 오류가 발생했습니다.');
    }
  };

  const cancelProgressUpdate = () => {
    setUpdatingProgress(null);
    setProgressAmount('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved': return '#10b981';
      case 'in-progress': return '#3b82f6';
      case 'planning': return '#6b7280';
      case 'suspended': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const calculateProgress = (goal: FinancialGoal) => {
    return goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px' 
      }}>
        <h3 style={{ 
          color: MomentumTheme.colors.primary, 
          margin: '0',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          🎯 재무 목표 ({goals.length}개)
        </h3>
        
        {!isReadOnly && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '10px 20px',
              background: MomentumTheme.gradients.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + 새 목표 추가
          </button>
        )}
      </div>

      {/* 목표 추가/수정 폼 */}
      {showForm && (
        <div style={{
          background: MomentumTheme.colors.gray[50],
          padding: '24px',
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <h4 style={{ color: MomentumTheme.colors.text.primary, marginBottom: '16px' }}>
            {editingGoal ? '목표 수정' : '새 목표 추가'}
          </h4>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: MomentumTheme.colors.text.primary
              }}>
                목표명
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="예: 내 집 마련, 노후 자금"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${MomentumTheme.colors.gray[300]}`,
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: MomentumTheme.colors.text.primary
                }}>
                  목표 금액 (만원)
                </label>
                <input
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  placeholder="0"
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `2px solid ${MomentumTheme.colors.gray[300]}`,
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: MomentumTheme.colors.text.primary
                }}>
                  목표 날짜
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `2px solid ${MomentumTheme.colors.gray[300]}`,
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: MomentumTheme.colors.text.primary
                }}>
                  우선순위
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `2px solid ${MomentumTheme.colors.gray[300]}`,
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                >
                  <option value="high">높음</option>
                  <option value="medium">보통</option>
                  <option value="low">낮음</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '10px 20px',
                  background: MomentumTheme.colors.gray[200],
                  color: MomentumTheme.colors.text.secondary,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                취소
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  background: MomentumTheme.gradients.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {editingGoal ? '수정' : '추가'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 목표 목록 */}
      {goals.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: MomentumTheme.colors.text.light
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <h3 style={{ color: MomentumTheme.colors.text.secondary, marginBottom: '8px' }}>
            재무 목표를 설정하세요
          </h3>
          <p>구체적인 재무 목표를 설정하고 달성 과정을 관리할 수 있습니다.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {goals.map((goal) => {
            const progress = calculateProgress(goal);
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <h4 style={{ 
                      margin: '0 0 8px 0',
                      color: MomentumTheme.colors.text.primary,
                      fontSize: '18px',
                      fontWeight: '600'
                    }}>
                      {goal.title}
                    </h4>
                    
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{
                        background: getPriorityColor(goal.priority),
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
                        background: getStatusColor(goal.status),
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
                  
                  {!isReadOnly && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => startEdit(goal)}
                        style={{
                          padding: '6px 12px',
                          background: MomentumTheme.colors.gray[100],
                          border: `1px solid ${MomentumTheme.colors.gray[300]}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        수정
                      </button>
                      <button
                        onClick={() => startProgressUpdate(goal)}
                        style={{
                          padding: '6px 12px',
                          background: '#dbeafe',
                          border: '1px solid #93c5fd',
                          color: '#1e40af',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        달성률 업데이트
                      </button>
                      <button
                        onClick={() => onDeleteGoal(goal._id!)}
                        style={{
                          padding: '6px 12px',
                          background: '#fee2e2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
                
                {/* 달성률 업데이트 폼 */}
                {updatingProgress === goal._id && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h5 style={{
                      margin: '0 0 12px 0',
                      color: MomentumTheme.colors.text.primary,
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      현재 달성 금액 업데이트
                    </h5>
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{
                          display: 'block',
                          marginBottom: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: MomentumTheme.colors.text.secondary
                        }}>
                          현재 금액 (만원)
                        </label>
                        <input
                          type="number"
                          value={progressAmount}
                          onChange={(e) => setProgressAmount(e.target.value)}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: `1px solid ${MomentumTheme.colors.gray[300]}`,
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      
                      <button
                        onClick={() => handleProgressUpdate(goal._id!)}
                        style={{
                          padding: '8px 12px',
                          background: MomentumTheme.gradients.primary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        저장
                      </button>
                      
                      <button
                        onClick={cancelProgressUpdate}
                        style={{
                          padding: '8px 12px',
                          background: MomentumTheme.colors.gray[200],
                          color: MomentumTheme.colors.text.secondary,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {/* 진행률 바 */}
                <div style={{ marginTop: '16px' }}>
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
  );
};

export default GoalsSection;