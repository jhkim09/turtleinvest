import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MomentumTheme } from '../../styles/MomentumTheme.ts';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionType: 'psychological' | 'financial';
  onSuccess?: () => void;
}

interface Counselor {
  _id: string;
  name: string;
  email: string;
  specialties?: string[];
  experience?: number;
  rating?: number;
  customRate?: number;
}

interface BookingData {
  counselorId: string;
  scheduledDate: string;
  duration: number;
  sessionType: string;
  format: 'in-person' | 'video-call' | 'phone-call';
  reason: string;
  notes: string;
}

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, sessionType, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<BookingData>({
    counselorId: '',
    scheduledDate: '',
    duration: 60,
    sessionType: sessionType === 'psychological' ? '개인상담' : 'goal-planning',
    format: 'video-call',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadCounselors();
    }
  }, [isOpen, sessionType]);

  const loadCounselors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const endpoint = sessionType === 'psychological' 
        ? '/api/users/counselors' 
        : '/api/users?role=financial-advisor';
      
      const response = await axios.get(`http://localhost:3000${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCounselors(response.data);
    } catch (error) {
      console.error('상담사 목록 로드 실패:', error);
      setCounselors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      console.log('=== BookingModal Debug ===');
      console.log('sessionType prop:', sessionType);
      console.log('formData.sessionType:', formData.sessionType);
      
      const endpoint = sessionType === 'psychological' 
        ? '/api/appointments'
        : '/api/financial-sessions';
      
      const submitData = sessionType === 'psychological' 
        ? {
            counselorId: formData.counselorId,
            scheduledDate: formData.scheduledDate,
            duration: formData.duration,
            type: 'individual',
            reason: formData.reason,
            notes: formData.notes
          }
        : {
            financialAdvisorId: formData.counselorId,
            scheduledDate: formData.scheduledDate,
            duration: formData.duration,
            sessionType: 'goal-planning', // 재무상담은 항상 goal-planning 사용
            format: formData.format,
            preparation: {
              reason: formData.reason,
              notes: formData.notes
            }
          };

      await axios.post(`http://localhost:3000${endpoint}`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('상담 예약이 완료되었습니다!');
      if (onSuccess) onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('예약 실패:', error);
      
      let errorMessage = '예약에 실패했습니다. 다시 시도해주세요.';
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      counselorId: '',
      scheduledDate: '',
      duration: 60,
      sessionType: sessionType === 'psychological' ? '개인상담' : 'goal-planning',
      format: 'video-call',
      reason: '',
      notes: ''
    });
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* 헤더 */}
        <div style={{
          background: sessionType === 'psychological' 
            ? MomentumTheme.gradients.primary 
            : MomentumTheme.gradients.accent,
          color: 'white',
          padding: '24px',
          borderRadius: '16px 16px 0 0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>
                {sessionType === 'psychological' ? '🧠 심리상담 예약' : '💰 재무상담 예약'}
              </h2>
              <p style={{ margin: '0', opacity: 0.9 }}>
                단계 {step}/3
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: '24px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div style={{ padding: '32px' }}>
          {step === 1 && (
            <div>
              <h3 style={{ color: MomentumTheme.colors.text.primary, marginBottom: '20px' }}>
                상담사 선택
              </h3>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div>상담사 목록을 불러오는 중...</div>
                </div>
              ) : counselors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍⚕️</div>
                  <p>현재 이용 가능한 상담사가 없습니다.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {counselors.map((counselor) => (
                    <div
                      key={counselor._id}
                      onClick={() => setFormData({ ...formData, counselorId: counselor._id })}
                      style={{
                        padding: '16px',
                        border: `2px solid ${formData.counselorId === counselor._id 
                          ? MomentumTheme.colors.primary 
                          : MomentumTheme.colors.gray[300]}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: formData.counselorId === counselor._id 
                          ? `rgba(92, 126, 229, 0.1)` 
                          : 'white',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <h4 style={{ 
                              margin: '0',
                              color: MomentumTheme.colors.text.primary,
                              fontWeight: '600'
                            }}>
                              {counselor.name}
                            </h4>
                            <span style={{
                              background: sessionType === 'psychological' 
                                ? MomentumTheme.gradients.primary 
                                : MomentumTheme.gradients.accent,
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {sessionType === 'psychological' ? '심리상담사' : '재무상담사'}
                            </span>
                          </div>
                          {counselor.specialties && counselor.specialties.length > 0 && (
                            <p style={{ 
                              margin: '0 0 4px 0',
                              fontSize: '14px',
                              color: MomentumTheme.colors.text.secondary
                            }}>
                              전문분야: {counselor.specialties.join(', ')}
                            </p>
                          )}
                          {counselor.experience && (
                            <p style={{ 
                              margin: '0',
                              fontSize: '14px',
                              color: MomentumTheme.colors.text.secondary
                            }}>
                              경력: {counselor.experience}년
                            </p>
                          )}
                        </div>
                        {counselor.customRate && (
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: MomentumTheme.colors.primary }}>
                              {counselor.customRate.toLocaleString()}원
                            </p>
                            <p style={{ margin: '0', fontSize: '12px', color: MomentumTheme.colors.text.light }}>
                              60분 기준
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ color: MomentumTheme.colors.text.primary, marginBottom: '20px' }}>
                예약 정보 입력
              </h3>
              
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ 
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: MomentumTheme.colors.text.primary
                  }}>
                    희망 날짜 및 시간
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    min={new Date().toISOString().slice(0, 16)}
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
                    상담 시간
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `2px solid ${MomentumTheme.colors.gray[300]}`,
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  >
                    <option value={50}>50분</option>
                    <option value={60}>60분</option>
                    <option value={90}>90분</option>
                  </select>
                </div>

                <div>
                  <label style={{ 
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: MomentumTheme.colors.text.primary
                  }}>
                    상담 방식
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {[
                      { key: 'in-person', label: '대면상담', icon: '👥' },
                      { key: 'video-call', label: '화상통화', icon: '📹' },
                      { key: 'phone-call', label: '전화상담', icon: '📞' }
                    ].map((format) => (
                      <button
                        key={format.key}
                        type="button"
                        onClick={() => setFormData({ ...formData, format: format.key })}
                        style={{
                          padding: '12px',
                          border: `2px solid ${formData.format === format.key 
                            ? MomentumTheme.colors.primary 
                            : MomentumTheme.colors.gray[300]}`,
                          borderRadius: '8px',
                          background: formData.format === format.key 
                            ? `rgba(92, 126, 229, 0.1)` 
                            : 'white',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: formData.format === format.key ? '600' : '500'
                        }}
                      >
                        {format.icon} {format.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: MomentumTheme.colors.text.primary
                  }}>
                    상담 사유
                  </label>
                  <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder={sessionType === 'psychological' 
                      ? "예: 직장 스트레스, 대인관계 등" 
                      : "예: 재무계획 수립, 투자상담 등"}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `2px solid ${MomentumTheme.colors.gray[300]}`,
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ color: MomentumTheme.colors.text.primary, marginBottom: '20px' }}>
                추가 요청사항
              </h3>
              
              <div>
                <label style={{ 
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: MomentumTheme.colors.text.primary
                }}>
                  상담사에게 전달할 메시지 (선택)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="상담사에게 미리 알리고 싶은 내용이나 특별한 요청사항을 입력해주세요."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `2px solid ${MomentumTheme.colors.gray[300]}`,
                    borderRadius: '8px',
                    fontSize: '16px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* 예약 확인 정보 */}
              <div style={{
                marginTop: '24px',
                padding: '20px',
                background: MomentumTheme.colors.gray[50],
                borderRadius: '12px'
              }}>
                <h4 style={{ margin: '0 0 16px 0', color: MomentumTheme.colors.text.primary }}>
                  📋 예약 정보 확인
                </h4>
                <div style={{ fontSize: '14px', color: MomentumTheme.colors.text.secondary }}>
                  <p style={{ margin: '4px 0' }}>
                    <strong>상담사:</strong> {counselors.find(c => c._id === formData.counselorId)?.name}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>날짜:</strong> {formData.scheduledDate && new Date(formData.scheduledDate).toLocaleString('ko-KR')}
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>시간:</strong> {formData.duration}분
                  </p>
                  <p style={{ margin: '4px 0' }}>
                    <strong>방식:</strong> {
                      formData.format === 'in-person' ? '대면상담' :
                      formData.format === 'video-call' ? '화상통화' : '전화상담'
                    }
                  </p>
                  {formData.reason && (
                    <p style={{ margin: '4px 0' }}>
                      <strong>사유:</strong> {formData.reason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div style={{
          padding: '24px',
          borderTop: `1px solid ${MomentumTheme.colors.gray[200]}`,
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                padding: '12px 24px',
                border: `2px solid ${MomentumTheme.colors.gray[300]}`,
                background: 'white',
                color: MomentumTheme.colors.text.secondary,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              이전
            </button>
          )}
          
          <div style={{ flex: 1 }}></div>
          
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !formData.counselorId) ||
                (step === 2 && (!formData.scheduledDate || !formData.reason))
              }
              style={{
                padding: '12px 24px',
                background: sessionType === 'psychological' 
                  ? MomentumTheme.gradients.primary 
                  : MomentumTheme.gradients.accent,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                opacity: (
                  (step === 1 && !formData.counselorId) ||
                  (step === 2 && (!formData.scheduledDate || !formData.reason))
                ) ? 0.5 : 1
              }}
            >
              다음
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: '12px 24px',
                background: sessionType === 'psychological' 
                  ? MomentumTheme.gradients.primary 
                  : MomentumTheme.gradients.accent,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? '예약 중...' : '🎉 예약 완료'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;