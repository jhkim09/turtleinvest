import React, { useState } from 'react';

interface Counselor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  licenseNumber: string;
  experience: number;
  rates: {
    faceToFace: number;
    phoneVideo: number;
    chat: number;
  };
  maxDailyAppointments: number;
  isActive: boolean;
  totalSessions: number;
  rating: number;
  createdAt: string;
}

interface CounselorManagementProps {
  counselors: Counselor[];
  onCreateCounselor: () => void;
  onToggleStatus: (counselorId: string) => void;
  showAddCounselor: boolean;
  newCounselor: any;
  setNewCounselor: (counselor: any) => void;
  setShowAddCounselor: (show: boolean) => void;
  handleCreateCounselor: () => void;
}

const CounselorManagement: React.FC<CounselorManagementProps> = ({
  counselors,
  onCreateCounselor,
  onToggleStatus,
  showAddCounselor,
  newCounselor,
  setNewCounselor,
  setShowAddCounselor,
  handleCreateCounselor
}) => {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#333', fontSize: '28px', margin: '0' }}>상담사 관리</h2>
        <button
          onClick={() => setShowAddCounselor(true)}
          style={{
            backgroundColor: '#9c27b0',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          + 새 상담사 등록
        </button>
      </div>

      {/* 상담사 목록 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '15px 20px',
          borderBottom: '1px solid #e1e1e1',
          fontWeight: 'bold',
          display: 'grid',
          gridTemplateColumns: '200px 180px 150px 200px 120px 120px 80px 100px',
          gap: '15px',
          alignItems: 'center'
        }}>
          <div>상담사명</div>
          <div>연락처</div>
          <div>경력</div>
          <div>전문분야</div>
          <div>세션수</div>
          <div>평점</div>
          <div>상태</div>
          <div>관리</div>
        </div>
        
        {counselors.map((counselor, index) => (
          <div key={counselor._id} style={{
            padding: '20px',
            borderBottom: index < counselors.length - 1 ? '1px solid #f0f0f0' : 'none',
            display: 'grid',
            gridTemplateColumns: '200px 180px 150px 200px 120px 120px 80px 100px',
            gap: '15px',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{counselor.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{counselor.email}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{counselor.licenseNumber}</div>
            </div>
            <div style={{ fontSize: '14px' }}>{counselor.phone}</div>
            <div style={{ fontSize: '14px' }}>{counselor.experience}년</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {counselor.specialties.slice(0, 2).join(', ')}
              {counselor.specialties.length > 2 && ' 외'}
            </div>
            <div style={{ fontSize: '14px' }}>{counselor.totalSessions}회</div>
            <div style={{ fontSize: '14px' }}>
              ⭐ {counselor.rating.toFixed(1)}
            </div>
            <div>
              <span style={{
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                backgroundColor: counselor.isActive ? '#e8f5e8' : '#ffebee',
                color: counselor.isActive ? '#2e7d32' : '#c62828'
              }}>
                {counselor.isActive ? '활성' : '비활성'}
              </span>
            </div>
            <div>
              <button
                onClick={() => onToggleStatus(counselor._id)}
                style={{
                  backgroundColor: counselor.isActive ? '#f44336' : '#4caf50',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {counselor.isActive ? '비활성화' : '활성화'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 상담사 등록 모달 */}
      {showAddCounselor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ color: '#333', margin: '0 0 20px 0' }}>🧠 새 상담사 등록</h3>
            
            <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>이름</label>
                  <input
                    type="text"
                    value={newCounselor.name}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, name: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>면허번호</label>
                  <input
                    type="text"
                    value={newCounselor.licenseNumber}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, licenseNumber: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>이메일</label>
                  <input
                    type="email"
                    value={newCounselor.email}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, email: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>전화번호</label>
                  <input
                    type="tel"
                    value={newCounselor.phone}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, phone: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>초기 비밀번호</label>
                  <input
                    type="password"
                    value={newCounselor.password}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, password: e.target.value }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>경력 (년)</label>
                  <input
                    type="number"
                    value={newCounselor.experience}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, experience: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>전문 분야</label>
                <input
                  type="text"
                  value={newCounselor.specialties.join(', ')}
                  onChange={(e) => setNewCounselor(prev => ({ ...prev, specialties: e.target.value.split(',').map(s => s.trim()) }))}
                  placeholder="우울증, 불안장애, 스트레스 관리 (쉼표로 구분)"
                  style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>상담 단가 설정</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666' }}>대면 상담</label>
                    <input
                      type="number"
                      value={newCounselor.rates.faceToFace}
                      onChange={(e) => setNewCounselor(prev => ({ 
                        ...prev, 
                        rates: { ...prev.rates, faceToFace: parseInt(e.target.value) || 0 }
                      }))}
                      style={{ width: '100%', padding: '8px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666' }}>전화/화상</label>
                    <input
                      type="number"
                      value={newCounselor.rates.phoneVideo}
                      onChange={(e) => setNewCounselor(prev => ({ 
                        ...prev, 
                        rates: { ...prev.rates, phoneVideo: parseInt(e.target.value) || 0 }
                      }))}
                      style={{ width: '100%', padding: '8px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666' }}>채팅 상담</label>
                    <input
                      type="number"
                      value={newCounselor.rates.chat}
                      onChange={(e) => setNewCounselor(prev => ({ 
                        ...prev, 
                        rates: { ...prev.rates, chat: parseInt(e.target.value) || 0 }
                      }))}
                      style={{ width: '100%', padding: '8px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>일일 최대 상담 수</label>
                <input
                  type="number"
                  value={newCounselor.maxDailyAppointments}
                  onChange={(e) => setNewCounselor(prev => ({ ...prev, maxDailyAppointments: parseInt(e.target.value) || 8 }))}
                  style={{ width: '100%', padding: '10px', border: '2px solid #e1e1e1', borderRadius: '4px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowAddCounselor(false)}
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
              <button
                onClick={handleCreateCounselor}
                disabled={!newCounselor.name || !newCounselor.email || !newCounselor.licenseNumber}
                style={{
                  backgroundColor: !newCounselor.name || !newCounselor.email || !newCounselor.licenseNumber ? '#ccc' : '#9c27b0',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  cursor: !newCounselor.name || !newCounselor.email || !newCounselor.licenseNumber ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🧠 상담사 등록
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CounselorManagement;