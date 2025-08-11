import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

const CounselorsManagement: React.FC = () => {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCounselor, setShowAddCounselor] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedCounselorId, setSelectedCounselorId] = useState('');
  const [rateSettings, setRateSettings] = useState({
    useSystemRate: true,
    customRate: 50000
  });
  const [newCounselor, setNewCounselor] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    specialties: [''],
    licenseNumber: '',
    experience: 0,
    rates: {
      faceToFace: 80000,
      phoneVideo: 60000,
      chat: 40000
    },
    maxDailyAppointments: 8
  });

  useEffect(() => {
    fetchCounselors();
  }, []);

  const fetchCounselors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/counselors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const counselorsData = response.data?.counselors || response.data || [];
      setCounselors(Array.isArray(counselorsData) ? counselorsData : []);
    } catch (error) {
      console.error('상담사 목록 조회 오류:', error);
      setCounselors([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCounselorStatus = async (counselorId: string) => {
    try {
      const token = localStorage.getItem('token');
      const counselor = counselors.find(c => c._id === counselorId);
      if (!counselor) return;

      await axios.put(`http://localhost:3000/api/counselors/${counselorId}/status`, {
        isActive: !counselor.isActive
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCounselors(prev => prev.map(c =>
        c._id === counselorId ? { ...c, isActive: !c.isActive } : c
      ));

      alert(`상담사가 ${counselor.isActive ? '비활성화' : '활성화'}되었습니다.`);
    } catch (error) {
      console.error('상담사 상태 변경 오류:', error);
      alert('상담사 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const openRateModal = async (counselorId: string) => {
    setSelectedCounselorId(counselorId);
    setShowRateModal(true);
  };

  const saveRateSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3000/api/counselors/${selectedCounselorId}/rates`, {
        useSystemRate: rateSettings.useSystemRate,
        customRate: rateSettings.customRate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('단가 설정이 저장되었습니다.');
      setShowRateModal(false);
      setSelectedCounselorId('');
    } catch (error) {
      console.error('단가 설정 저장 오류:', error);
      alert('단가 설정 저장 중 오류가 발생했습니다.');
    }
  };

  const createCounselor = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/counselors', newCounselor, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('새 상담사가 성공적으로 등록되었습니다.');
      setShowAddCounselor(false);
      setNewCounselor({
        name: '',
        email: '',
        phone: '',
        password: '',
        specialties: [''],
        licenseNumber: '',
        experience: 0,
        rates: {
          faceToFace: 80000,
          phoneVideo: 60000,
          chat: 40000
        },
        maxDailyAppointments: 8
      });
      fetchCounselors();
    } catch (error) {
      console.error('상담사 등록 오류:', error);
      alert('상담사 등록 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        상담사 목록을 불러오는 중...
      </div>
    );
  }

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
          gridTemplateColumns: '180px 160px 100px 180px 100px 100px 100px 80px 120px',
          gap: '15px',
          alignItems: 'center'
        }}>
          <div>상담사명</div>
          <div>연락처</div>
          <div>경력</div>
          <div>전문분야</div>
          <div>세션수</div>
          <div>평점</div>
          <div>단가설정</div>
          <div>상태</div>
          <div>관리</div>
        </div>
        
        {counselors.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            등록된 상담사가 없습니다.
          </div>
        ) : (
          counselors.map((counselor, index) => (
            <div key={counselor._id} style={{
              padding: '20px',
              borderBottom: index < counselors.length - 1 ? '1px solid #f0f0f0' : 'none',
              display: 'grid',
              gridTemplateColumns: '180px 160px 100px 180px 100px 100px 100px 80px 120px',
              gap: '15px',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{counselor.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{counselor.email}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{counselor.licenseNumber}</div>
              </div>
              <div style={{ fontSize: '14px' }}>{counselor.phone}</div>
              <div style={{ fontSize: '14px' }}>{counselor.experience || 0}년</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {(counselor.specialties || []).slice(0, 2).join(', ')}
                {(counselor.specialties || []).length > 2 && ' 외'}
              </div>
              <div style={{ fontSize: '14px' }}>{counselor.totalSessions || 0}회</div>
              <div style={{ fontSize: '14px' }}>
                ⭐ {(counselor.rating || 0).toFixed(1)}
              </div>
              <div>
                <button
                  onClick={() => openRateModal(counselor._id)}
                  style={{
                    backgroundColor: '#2196f3',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  단가설정
                </button>
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
                  onClick={() => toggleCounselorStatus(counselor._id)}
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
          ))
        )}
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
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '600px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>새 상담사 등록</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>상담사명</label>
                <input
                  type="text"
                  value={newCounselor.name}
                  onChange={(e) => setNewCounselor(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>이메일</label>
                <input
                  type="email"
                  value={newCounselor.email}
                  onChange={(e) => setNewCounselor(prev => ({ ...prev, email: e.target.value }))}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>전화번호</label>
                <input
                  type="text"
                  value={newCounselor.phone}
                  onChange={(e) => setNewCounselor(prev => ({ ...prev, phone: e.target.value }))}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>자격증 번호</label>
                <input
                  type="text"
                  value={newCounselor.licenseNumber}
                  onChange={(e) => setNewCounselor(prev => ({ ...prev, licenseNumber: e.target.value }))}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={() => setShowAddCounselor(false)}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={createCounselor}
                style={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 단가 설정 모달 */}
      {showRateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '500px'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>상담사 단가 설정</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <input
                  type="radio"
                  checked={rateSettings.useSystemRate}
                  onChange={() => setRateSettings(prev => ({ ...prev, useSystemRate: true }))}
                />
                시스템 기본 단가 사용
              </label>
              
              <div style={{ marginLeft: '26px', color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                <div>• 대면상담: ₩80,000 / 60분</div>
                <div>• 화상상담: ₩60,000 / 60분</div>
                <div>• 채팅상담: ₩40,000 / 60분</div>
              </div>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="radio"
                  checked={!rateSettings.useSystemRate}
                  onChange={() => setRateSettings(prev => ({ ...prev, useSystemRate: false }))}
                />
                개별 단가 설정
              </label>
              
              {!rateSettings.useSystemRate && (
                <div style={{ marginLeft: '26px', marginTop: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                    사용자 정의 단가
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>₩</span>
                    <input
                      type="number"
                      value={rateSettings.customRate}
                      onChange={(e) => setRateSettings(prev => ({ 
                        ...prev, 
                        customRate: parseInt(e.target.value) || 0 
                      }))}
                      style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        width: '120px'
                      }}
                    />
                    <span>원 / 60분</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRateModal(false);
                  setSelectedCounselorId('');
                }}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={saveRateSettings}
                style={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CounselorsManagement;