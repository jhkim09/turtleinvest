import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MomentumTheme } from '../../styles/MomentumTheme.ts';
import DonutChart from '../Charts/DonutChart.tsx';
import GoalsSection from './GoalsSection.tsx';

interface FinancialAssets {
  cash: number;
  savings: number;
  investments: number;
  realEstate: number;
  other: number;
}

interface FinancialLiabilities {
  creditCard: number;
  loans: number;
  mortgage: number;
  other: number;
}

interface MonthlyIncome {
  salary: number;
  business: number;
  investment: number;
  other: number;
}

interface MonthlyExpenses {
  living: number;
  housing: number;
  insurance: number;
  education: number;
  other: number;
}

interface FinancialGoal {
  _id?: string;
  title: string;
  targetAmount: number;
  targetDate: string;
  currentAmount: number;
  priority: 'high' | 'medium' | 'low';
  status: 'planning' | 'in-progress' | 'achieved' | 'suspended';
}

interface FinancialProfile {
  _id?: string;
  currentAssets: FinancialAssets;
  currentLiabilities: FinancialLiabilities;
  monthlyIncome: MonthlyIncome;
  monthlyExpenses: MonthlyExpenses;
  financialGoals?: FinancialGoal[];
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  investmentExperience: 'beginner' | 'intermediate' | 'advanced';
}

interface PortfolioManagerProps {
  userId: string;
  isReadOnly?: boolean;
  onSave?: (profile: FinancialProfile) => void;
}

const PortfolioManager: React.FC<PortfolioManagerProps> = ({ 
  userId, 
  isReadOnly = false, 
  onSave 
}) => {
  const [profile, setProfile] = useState<FinancialProfile>({
    currentAssets: { cash: 0, savings: 0, investments: 0, realEstate: 0, other: 0 },
    currentLiabilities: { creditCard: 0, loans: 0, mortgage: 0, other: 0 },
    monthlyIncome: { salary: 0, business: 0, investment: 0, other: 0 },
    monthlyExpenses: { living: 0, housing: 0, insurance: 0, education: 0, other: 0 },
    financialGoals: [],
    riskProfile: 'moderate',
    investmentExperience: 'beginner'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'assets' | 'income' | 'goals' | 'risk'>('assets');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [goalFormData, setGoalFormData] = useState({
    title: '',
    targetAmount: '',
    targetDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low'
  });

  // 💰 만원 단위 변환 헬퍼 함수들
  const toWonUnits = (value: number): string => {
    return (value / 10000).toString();
  };

  const fromWonUnits = (value: string): number => {
    return parseFloat(value || '0') * 10000;
  };

  const formatWon = (value: number): string => {
    return new Intl.NumberFormat('ko-KR').format(value) + '원';
  };

  const formatWonUnits = (value: number): string => {
    return new Intl.NumberFormat('ko-KR').format(value / 10000) + '만원';
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/financial-profiles/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('재무 프로필 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post('http://localhost:3000/api/financial-profiles', {
        userId,
        ...profile
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProfile(response.data);
      if (onSave) onSave(response.data);
      
      alert('재무 정보가 저장되었습니다.');
    } catch (error) {
      console.error('재무 프로필 저장 실패:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 자산 입력 컴포넌트
  const AssetInput: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
  }> = ({ label, value, onChange, placeholder = '0' }) => {
    const [inputValue, setInputValue] = useState(toWonUnits(value));

    // value가 외부에서 변경되면 inputValue 동기화
    useEffect(() => {
      setInputValue(toWonUnits(value));
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      
      // 숫자가 유효한 경우에만 부모 컴포넌트에 전달
      const numericValue = parseFloat(newValue || '0');
      if (!isNaN(numericValue)) {
        onChange(fromWonUnits(newValue));
      }
    };

    const handleBlur = () => {
      // blur 시 값 정리
      const numericValue = parseFloat(inputValue || '0');
      if (isNaN(numericValue)) {
        setInputValue('0');
        onChange(0);
      } else {
        setInputValue(numericValue.toString());
        onChange(fromWonUnits(numericValue.toString()));
      }
    };

    return (
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: '600',
          color: MomentumTheme.colors.text.primary
        }}>
          {label}
        </label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={isReadOnly}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: `2px solid ${MomentumTheme.colors.gray[300]}`,
              borderRadius: '8px',
              fontSize: '16px',
              fontFamily: MomentumTheme.typography.fontFamily.primary,
              outline: 'none',
              transition: 'border-color 0.3s ease',
              backgroundColor: isReadOnly ? MomentumTheme.colors.gray[100] : 'white'
            }}
            onFocus={(e) => {
              if (!isReadOnly) {
                e.target.style.borderColor = MomentumTheme.colors.primary;
                e.target.style.boxShadow = `0 0 0 3px rgba(92, 126, 229, 0.1)`;
              }
            }}
            onBlur={(e) => {
              e.target.style.borderColor = MomentumTheme.colors.gray[300];
              e.target.style.boxShadow = 'none';
              handleBlur();
            }}
          />
          <span style={{
            marginLeft: '12px',
            fontSize: '14px',
            color: MomentumTheme.colors.text.secondary,
            fontWeight: '600'
          }}>
            만원
          </span>
        </div>
        {value > 0 && (
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: MomentumTheme.colors.text.light
          }}>
            = {formatWon(value)}
          </p>
        )}
      </div>
    );
  };

  // 계산된 값들
  const totalAssets = Object.values(profile.currentAssets).reduce((sum, val) => sum + val, 0);
  const totalLiabilities = Object.values(profile.currentLiabilities).reduce((sum, val) => sum + val, 0);
  const netWorth = totalAssets - totalLiabilities;
  const totalMonthlyIncome = Object.values(profile.monthlyIncome).reduce((sum, val) => sum + val, 0);
  const totalMonthlyExpenses = Object.values(profile.monthlyExpenses).reduce((sum, val) => sum + val, 0);
  const monthlyNetIncome = totalMonthlyIncome - totalMonthlyExpenses;

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

  return (
    <div style={{ fontFamily: MomentumTheme.typography.fontFamily.primary }}>
      {/* 요약 카드 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '30px' 
      }}>
        <div style={{
          background: MomentumTheme.gradients.primary,
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', opacity: 0.9 }}>순자산</h3>
          <p style={{ margin: '0', fontSize: '24px', fontWeight: '700' }}>
            {formatWonUnits(netWorth)}
          </p>
        </div>
        
        <div style={{
          background: MomentumTheme.gradients.tealPurple,
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', opacity: 0.9 }}>월 순소득</h3>
          <p style={{ margin: '0', fontSize: '24px', fontWeight: '700' }}>
            {formatWonUnits(monthlyNetIncome)}
          </p>
        </div>
        
        <div style={{
          background: MomentumTheme.gradients.accent,
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', opacity: 0.9 }}>투자성향</h3>
          <p style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>
            {profile.riskProfile === 'conservative' ? '안정형' :
             profile.riskProfile === 'moderate' ? '적극형' : '공격형'}
          </p>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div style={{
        display: 'flex',
        marginBottom: '24px',
        background: 'white',
        borderRadius: '12px',
        padding: '4px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        {[
          { key: 'assets', label: '💰 자산/부채', icon: '💰' },
          { key: 'income', label: '📊 수입/지출', icon: '📊' },
          { key: 'goals', label: '🎯 재무목표', icon: '🎯' },
          { key: 'risk', label: '📈 투자성향', icon: '📈' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key as any)}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              background: activeSection === tab.key 
                ? MomentumTheme.gradients.primary 
                : 'transparent',
              color: activeSection === tab.key ? 'white' : MomentumTheme.colors.text.secondary,
              fontSize: '14px',
              fontWeight: activeSection === tab.key ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        {activeSection === 'assets' && (
          <div>
            {/* 자산 개요 차트 */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '40px',
              marginBottom: '40px'
            }}>
              <DonutChart
                title="자산 분포"
                data={[
                  { 
                    label: '현금/예금', 
                    value: profile.currentAssets.cash,
                    color: '#5c7ee5'
                  },
                  { 
                    label: '적금/저축', 
                    value: profile.currentAssets.savings,
                    color: '#10b981'
                  },
                  { 
                    label: '투자자산', 
                    value: profile.currentAssets.investments,
                    color: '#f59e0b'
                  },
                  { 
                    label: '부동산', 
                    value: profile.currentAssets.realEstate,
                    color: '#8b5cf6'
                  },
                  { 
                    label: '기타자산', 
                    value: profile.currentAssets.other,
                    color: '#6b7280'
                  }
                ].filter(item => item.value > 0)}
                centerText="총 자산"
                centerValue={formatWonUnits(totalAssets)}
                width={300}
                height={300}
              />
              
              <DonutChart
                title="부채 분포"
                data={[
                  { 
                    label: '신용카드', 
                    value: profile.currentLiabilities.creditCard,
                    color: '#ef4444'
                  },
                  { 
                    label: '대출', 
                    value: profile.currentLiabilities.loans,
                    color: '#f97316'
                  },
                  { 
                    label: '주택담보대출', 
                    value: profile.currentLiabilities.mortgage,
                    color: '#ec4899'
                  },
                  { 
                    label: '기타부채', 
                    value: profile.currentLiabilities.other,
                    color: '#6b7280'
                  }
                ].filter(item => item.value > 0)}
                centerText="총 부채"
                centerValue={formatWonUnits(totalLiabilities)}
                width={300}
                height={300}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              {/* 자산 */}
              <div>
                <h3 style={{ 
                  color: MomentumTheme.colors.primary, 
                  marginBottom: '20px',
                  fontSize: '20px',
                  fontWeight: '600'
                }}>
                  📈 자산 ({formatWonUnits(totalAssets)})
                </h3>
                
                <AssetInput
                  label="현금 및 예금"
                  value={profile.currentAssets.cash}
                  onChange={(val) => setProfile({
                    ...profile,
                    currentAssets: { ...profile.currentAssets, cash: val }
                  })}
                />
                
                <AssetInput
                  label="적금 및 저축"
                  value={profile.currentAssets.savings}
                  onChange={(val) => setProfile({
                    ...profile,
                    currentAssets: { ...profile.currentAssets, savings: val }
                  })}
                />
                
                <AssetInput
                  label="투자자산 (주식, 펀드 등)"
                  value={profile.currentAssets.investments}
                  onChange={(val) => setProfile({
                    ...profile,
                    currentAssets: { ...profile.currentAssets, investments: val }
                  })}
                />
                
                <AssetInput
                  label="부동산"
                  value={profile.currentAssets.realEstate}
                  onChange={(val) => setProfile({
                    ...profile,
                    currentAssets: { ...profile.currentAssets, realEstate: val }
                  })}
                />
                
                <AssetInput
                  label="기타 자산"
                  value={profile.currentAssets.other}
                  onChange={(val) => setProfile({
                    ...profile,
                    currentAssets: { ...profile.currentAssets, other: val }
                  })}
                />
              </div>

              {/* 부채 */}
              <div>
                <h3 style={{ 
                  color: MomentumTheme.colors.accent, 
                  marginBottom: '20px',
                  fontSize: '20px',
                  fontWeight: '600'
                }}>
                  📉 부채 ({formatWonUnits(totalLiabilities)})
                </h3>
                
                <AssetInput
                  label="신용카드 미결제금"
                  value={profile.currentLiabilities.creditCard}
                  onChange={(val) => setProfile({
                    ...profile,
                    currentLiabilities: { ...profile.currentLiabilities, creditCard: val }
                  })}
                />
                
                <AssetInput
                  label="일반 대출"
                  value={profile.currentLiabilities.loans}
                  onChange={(val) => setProfile({
                    ...profile,
                    currentLiabilities: { ...profile.currentLiabilities, loans: val }
                  })}
                />
                
                <AssetInput
                  label="주택담보대출"
                  value={profile.currentLiabilities.mortgage}
                  onChange={(val) => setProfile({
                    ...profile,
                    currentLiabilities: { ...profile.currentLiabilities, mortgage: val }
                  })}
                />
                
                <AssetInput
                  label="기타 부채"
                  value={profile.currentLiabilities.other}
                  onChange={(val) => setProfile({
                    ...profile,
                    currentLiabilities: { ...profile.currentLiabilities, other: val }
                  })}
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'income' && (
          <div>
            {/* 수입/지출 개요 차트 */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '40px',
              marginBottom: '40px'
            }}>
              <DonutChart
                title="월 수입 분포"
                data={[
                  { 
                    label: '급여소득', 
                    value: profile.monthlyIncome.salary,
                    color: '#5c7ee5'
                  },
                  { 
                    label: '사업소득', 
                    value: profile.monthlyIncome.business,
                    color: '#10b981'
                  },
                  { 
                    label: '투자소득', 
                    value: profile.monthlyIncome.investment,
                    color: '#f59e0b'
                  },
                  { 
                    label: '기타소득', 
                    value: profile.monthlyIncome.other,
                    color: '#8b5cf6'
                  }
                ].filter(item => item.value > 0)}
                centerText="월 총수입"
                centerValue={formatWonUnits(totalMonthlyIncome)}
                width={300}
                height={300}
              />
              
              <DonutChart
                title="월 지출 분포"
                data={[
                  { 
                    label: '생활비', 
                    value: profile.monthlyExpenses.living,
                    color: '#ef4444'
                  },
                  { 
                    label: '주거비', 
                    value: profile.monthlyExpenses.housing,
                    color: '#f97316'
                  },
                  { 
                    label: '보험료', 
                    value: profile.monthlyExpenses.insurance,
                    color: '#ec4899'
                  },
                  { 
                    label: '교육비', 
                    value: profile.monthlyExpenses.education,
                    color: '#06b6d4'
                  },
                  { 
                    label: '기타지출', 
                    value: profile.monthlyExpenses.other,
                    color: '#6b7280'
                  }
                ].filter(item => item.value > 0)}
                centerText="월 총지출"
                centerValue={formatWonUnits(totalMonthlyExpenses)}
                width={300}
                height={300}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              {/* 수입 */}
              <div>
                <h3 style={{ 
                  color: MomentumTheme.colors.primary, 
                  marginBottom: '20px',
                  fontSize: '20px',
                  fontWeight: '600'
                }}>
                  💵 월 수입 ({formatWonUnits(totalMonthlyIncome)})
                </h3>
                
                <AssetInput
                  label="급여 소득"
                  value={profile.monthlyIncome.salary}
                  onChange={(val) => setProfile({
                    ...profile,
                    monthlyIncome: { ...profile.monthlyIncome, salary: val }
                  })}
                />
                
                <AssetInput
                  label="사업 소득"
                  value={profile.monthlyIncome.business}
                  onChange={(val) => setProfile({
                    ...profile,
                    monthlyIncome: { ...profile.monthlyIncome, business: val }
                  })}
                />
                
                <AssetInput
                  label="투자 소득"
                  value={profile.monthlyIncome.investment}
                  onChange={(val) => setProfile({
                    ...profile,
                    monthlyIncome: { ...profile.monthlyIncome, investment: val }
                  })}
                />
                
                <AssetInput
                  label="기타 소득"
                  value={profile.monthlyIncome.other}
                  onChange={(val) => setProfile({
                    ...profile,
                    monthlyIncome: { ...profile.monthlyIncome, other: val }
                  })}
                />
              </div>

              {/* 지출 */}
              <div>
                <h3 style={{ 
                  color: MomentumTheme.colors.accent, 
                  marginBottom: '20px',
                  fontSize: '20px',
                  fontWeight: '600'
                }}>
                  💸 월 지출 ({formatWonUnits(totalMonthlyExpenses)})
                </h3>
                
                <AssetInput
                  label="생활비"
                  value={profile.monthlyExpenses.living}
                  onChange={(val) => setProfile({
                    ...profile,
                    monthlyExpenses: { ...profile.monthlyExpenses, living: val }
                  })}
                />
                
                <AssetInput
                  label="주거비 (월세, 관리비 등)"
                  value={profile.monthlyExpenses.housing}
                  onChange={(val) => setProfile({
                    ...profile,
                    monthlyExpenses: { ...profile.monthlyExpenses, housing: val }
                  })}
                />
                
                <AssetInput
                  label="보험료"
                  value={profile.monthlyExpenses.insurance}
                  onChange={(val) => setProfile({
                    ...profile,
                    monthlyExpenses: { ...profile.monthlyExpenses, insurance: val }
                  })}
                />
                
                <AssetInput
                  label="교육비"
                  value={profile.monthlyExpenses.education}
                  onChange={(val) => setProfile({
                    ...profile,
                    monthlyExpenses: { ...profile.monthlyExpenses, education: val }
                  })}
                />
                
                <AssetInput
                  label="기타 지출"
                  value={profile.monthlyExpenses.other}
                  onChange={(val) => setProfile({
                    ...profile,
                    monthlyExpenses: { ...profile.monthlyExpenses, other: val }
                  })}
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'risk' && (
          <div>
            <h3 style={{ 
              color: MomentumTheme.colors.primary, 
              marginBottom: '24px',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              📈 투자 성향 및 경험
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: MomentumTheme.colors.text.primary
                }}>
                  위험 선호도
                </label>
                
                {[
                  { key: 'conservative', label: '안정형', desc: '원금 보장을 우선시' },
                  { key: 'moderate', label: '적극형', desc: '적정 수준의 위험 감수' },
                  { key: 'aggressive', label: '공격형', desc: '높은 수익을 위해 위험 감수' }
                ].map((option) => (
                  <div
                    key={option.key}
                    onClick={() => !isReadOnly && setProfile({
                      ...profile,
                      riskProfile: option.key as any
                    })}
                    style={{
                      padding: '16px',
                      border: `2px solid ${profile.riskProfile === option.key ? 
                        MomentumTheme.colors.primary : MomentumTheme.colors.gray[300]}`,
                      borderRadius: '8px',
                      marginBottom: '12px',
                      cursor: isReadOnly ? 'default' : 'pointer',
                      background: profile.riskProfile === option.key ? 
                        `rgba(92, 126, 229, 0.1)` : 'white',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      fontWeight: '600',
                      color: profile.riskProfile === option.key ? 
                        MomentumTheme.colors.primary : MomentumTheme.colors.text.primary,
                      marginBottom: '4px'
                    }}>
                      {option.label}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: MomentumTheme.colors.text.secondary
                    }}>
                      {option.desc}
                    </div>
                  </div>
                ))}
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: MomentumTheme.colors.text.primary
                }}>
                  투자 경험
                </label>
                
                {[
                  { key: 'beginner', label: '초보자', desc: '투자 경험이 거의 없음' },
                  { key: 'intermediate', label: '중급자', desc: '몇 년간의 투자 경험' },
                  { key: 'advanced', label: '숙련자', desc: '풍부한 투자 경험과 지식' }
                ].map((option) => (
                  <div
                    key={option.key}
                    onClick={() => !isReadOnly && setProfile({
                      ...profile,
                      investmentExperience: option.key as any
                    })}
                    style={{
                      padding: '16px',
                      border: `2px solid ${profile.investmentExperience === option.key ? 
                        MomentumTheme.colors.accent : MomentumTheme.colors.gray[300]}`,
                      borderRadius: '8px',
                      marginBottom: '12px',
                      cursor: isReadOnly ? 'default' : 'pointer',
                      background: profile.investmentExperience === option.key ? 
                        `rgba(227, 69, 74, 0.1)` : 'white',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      fontWeight: '600',
                      color: profile.investmentExperience === option.key ? 
                        MomentumTheme.colors.accent : MomentumTheme.colors.text.primary,
                      marginBottom: '4px'
                    }}>
                      {option.label}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: MomentumTheme.colors.text.secondary
                    }}>
                      {option.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'goals' && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: MomentumTheme.colors.text.light
          }}>
            <GoalsSection
              goals={profile.financialGoals || []}
              onAddGoal={async (goalData) => {
                try {
                  const token = localStorage.getItem('token');
                  const response = await axios.post(
                    `http://localhost:3000/api/financial-profiles/${userId}/goals`,
                    goalData,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  
                  setProfile(prev => ({
                    ...prev,
                    financialGoals: [...(prev.financialGoals || []), response.data]
                  }));
                } catch (error) {
                  console.error('목표 추가 실패:', error);
                  throw error;
                }
              }}
              onUpdateGoal={async (goalId, updates) => {
                try {
                  const token = localStorage.getItem('token');
                  const response = await axios.put(
                    `http://localhost:3000/api/financial-profiles/${userId}/goals/${goalId}`,
                    updates,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  
                  setProfile(prev => ({
                    ...prev,
                    financialGoals: prev.financialGoals?.map(goal => 
                      goal._id === goalId ? response.data : goal
                    ) || []
                  }));
                } catch (error) {
                  console.error('목표 수정 실패:', error);
                  throw error;
                }
              }}
              onDeleteGoal={async (goalId) => {
                try {
                  const token = localStorage.getItem('token');
                  await axios.delete(
                    `http://localhost:3000/api/financial-profiles/${userId}/goals/${goalId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  
                  setProfile(prev => ({
                    ...prev,
                    financialGoals: prev.financialGoals?.filter(goal => goal._id !== goalId) || []
                  }));
                } catch (error) {
                  console.error('목표 삭제 실패:', error);
                  throw error;
                }
              }}
              isReadOnly={isReadOnly}
            />
          </div>
        )}
      </div>

      {/* 저장 버튼 */}
      {!isReadOnly && (
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button
            onClick={saveProfile}
            disabled={saving}
            style={{
              ...MomentumTheme.button.primary,
              fontSize: '16px',
              padding: '16px 40px',
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? '저장 중...' : '💾 재무 정보 저장'}
          </button>
        </div>
      )}
    </div>
  );
};

export default PortfolioManager;