import React, { useState } from 'react';
import axios from 'axios';
import { MomentumTheme } from '../../styles/MomentumTheme.ts';

interface SessionRatingProps {
  sessionId: string;
  sessionType: 'financial' | 'psychological';
  advisorName: string;
  currentRating?: {
    rating: number;
    comments: string;
    wouldRecommend: boolean;
  };
  onRatingSubmitted: () => void;
  onClose: () => void;
}

const SessionRating: React.FC<SessionRatingProps> = ({
  sessionId,
  sessionType,
  advisorName,
  currentRating,
  onRatingSubmitted,
  onClose
}) => {
  const [rating, setRating] = useState(currentRating?.rating || 0);
  const [comments, setComments] = useState(currentRating?.comments || '');
  const [wouldRecommend, setWouldRecommend] = useState(currentRating?.wouldRecommend || false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      alert('별점을 선택해주세요.');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      // 재무상담만 평점 기능 지원
      if (sessionType !== 'financial') {
        alert('현재 재무상담 평점만 지원됩니다.');
        return;
      }

      await axios.put(`http://localhost:3000/api/financial-sessions/${sessionId}/feedback`, {
        rating,
        comments: comments.trim(),
        wouldRecommend
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('평점이 성공적으로 등록되었습니다!');
      onRatingSubmitted();
      onClose();
    } catch (error: any) {
      console.error('평점 등록 실패:', error);
      alert(error.response?.data?.message || '평점 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStar = (starIndex: number) => {
    const isFilled = starIndex <= (hoveredRating || rating);
    return (
      <button
        key={starIndex}
        type="button"
        onClick={() => setRating(starIndex)}
        onMouseEnter={() => setHoveredRating(starIndex)}
        onMouseLeave={() => setHoveredRating(0)}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '32px',
          cursor: 'pointer',
          color: isFilled ? '#fbbf24' : '#d1d5db',
          transition: 'color 0.2s ease',
          padding: '4px'
        }}
      >
        ★
      </button>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: MomentumTheme.colors.text.secondary,
            padding: '8px',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>

        <div style={{ paddingRight: '50px' }}>
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '24px',
            fontWeight: '700',
            color: MomentumTheme.colors.text.primary
          }}>
            상담 평가하기
          </h2>
          
          <p style={{
            margin: '0 0 24px 0',
            fontSize: '16px',
            color: MomentumTheme.colors.text.secondary,
            lineHeight: '1.5'
          }}>
            <strong>{advisorName}</strong> {sessionType === 'financial' ? '재무상담사' : '상담사'}님과의 상담은 어떠셨나요?
          </p>

          {/* 별점 선택 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              fontSize: '16px',
              fontWeight: '600',
              color: MomentumTheme.colors.text.primary
            }}>
              만족도 평점 <span style={{ color: '#dc2626' }}>*</span>
            </label>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '8px'
            }}>
              {[1, 2, 3, 4, 5].map(renderStar)}
            </div>
            
            <div style={{
              fontSize: '14px',
              color: MomentumTheme.colors.text.secondary
            }}>
              {rating > 0 ? (
                <span>
                  {rating === 1 && '매우 불만족'}
                  {rating === 2 && '불만족'}
                  {rating === 3 && '보통'}
                  {rating === 4 && '만족'}
                  {rating === 5 && '매우 만족'}
                  {' '}({rating}점)
                </span>
              ) : (
                '별점을 선택해주세요'
              )}
            </div>
          </div>

          {/* 추천 여부 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              fontSize: '16px',
              fontWeight: '600',
              color: MomentumTheme.colors.text.primary
            }}>
              추천 여부
            </label>
            
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              color: MomentumTheme.colors.text.primary
            }}>
              <input
                type="checkbox"
                checked={wouldRecommend}
                onChange={(e) => setWouldRecommend(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              다른 직원들에게 이 상담사를 추천하시겠습니까?
            </label>
          </div>

          {/* 상세 의견 */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              fontSize: '16px',
              fontWeight: '600',
              color: MomentumTheme.colors.text.primary
            }}>
              상세 의견 (선택사항)
            </label>
            
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="상담에 대한 구체적인 의견을 남겨주세요..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${MomentumTheme.colors.gray[300]}`,
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: MomentumTheme.typography.fontFamily.primary,
                resize: 'vertical',
                minHeight: '80px'
              }}
            />
          </div>

          {/* 버튼 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '12px 24px',
                border: `1px solid ${MomentumTheme.colors.gray[300]}`,
                borderRadius: '8px',
                background: 'white',
                color: MomentumTheme.colors.text.primary,
                fontSize: '14px',
                fontWeight: '500',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1
              }}
            >
              취소
            </button>
            
            <button
              onClick={handleSubmitRating}
              disabled={rating === 0 || submitting}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                background: rating === 0 || submitting ? MomentumTheme.colors.gray[300] : MomentumTheme.colors.primary,
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: (rating === 0 || submitting) ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? '등록 중...' : currentRating ? '평점 수정' : '평점 등록'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionRating;