import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface CounselingCenter {
  _id: string;
  name: string;
  description?: string;
  address?: string;
  contact?: {
    phone?: string;
    email?: string;
  };
  businessLicense?: string;
  isActive: boolean;
  totalCounselors?: number;
  activeCounselor?: number;
  adminUser?: {
    name?: string;
    email?: string;
  };
}

const CentersManagement: React.FC = () => {
  const [counselingCenters, setCounselingCenters] = useState<CounselingCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCenter, setEditingCenter] = useState<CounselingCenter | null>(null);
  const [viewingCenterDetail, setViewingCenterDetail] = useState<CounselingCenter | null>(null);
  const [centerForm, setCenterForm] = useState<any>({});

  useEffect(() => {
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/counseling-centers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const centersData = response.data?.centers || response.data || [];
      setCounselingCenters(Array.isArray(centersData) ? centersData : []);
    } catch (error) {
      console.error('상담센터 목록 조회 오류:', error);
      setCounselingCenters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCenter = (center: CounselingCenter) => {
    setEditingCenter(center);
    setCenterForm({
      name: center.name,
      description: center.description || '',
      address: center.address || '',
      contact: center.contact || '',
      businessLicense: center.businessLicense || '',
      isActive: center.isActive !== false
    });
  };

  const handleViewCenterDetail = async (center: CounselingCenter) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/counseling-centers/${center._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewingCenterDetail(response.data.center);
    } catch (error) {
      console.error('상담센터 상세 조회 오류:', error);
      setViewingCenterDetail(center);
    }
  };

  const handleSaveCenterEdit = async () => {
    if (!editingCenter) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3000/api/counseling-centers/${editingCenter._id}`, centerForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCounselingCenters(prev => prev.map(center =>
        center._id === editingCenter._id ? { ...center, ...centerForm } : center
      ));
      
      setEditingCenter(null);
      setCenterForm({});
      alert('상담센터가 성공적으로 수정되었습니다.');
    } catch (error) {
      console.error('상담센터 수정 오류:', error);
      alert('상담센터 수정 중 오류가 발생했습니다.');
    }
  };

  const generateTestData = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/super-admin/generate-test-data', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('테스트 데이터가 생성되었습니다.');
      fetchCenters();
    } catch (error) {
      console.error('테스트 데이터 생성 오류:', error);
      alert('테스트 데이터 생성 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
        상담센터 목록을 불러오는 중...
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#333', fontSize: '28px', margin: '0' }}>상담센터 관리</h2>
        <button
          style={{
            backgroundColor: '#2e7d32',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          + 새 상담센터 등록
        </button>
      </div>

      {/* 상담센터 목록 */}
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
          gridTemplateColumns: '200px 150px 200px 100px 100px 80px 150px',
          gap: '15px',
          alignItems: 'center'
        }}>
          <div>센터명</div>
          <div>위치</div>
          <div>연락처</div>
          <div>상담사수</div>
          <div>활성상담사</div>
          <div>상태</div>
          <div>관리</div>
        </div>
        
        {counselingCenters.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            <p>상담센터가 없습니다.</p>
            <button
              onClick={generateTestData}
              style={{
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              테스트 데이터 생성
            </button>
          </div>
        ) : (
          counselingCenters.map((center, index) => (
            <div key={center._id} style={{
              padding: '20px',
              borderBottom: index < counselingCenters.length - 1 ? '1px solid #f0f0f0' : 'none',
              display: 'grid',
              gridTemplateColumns: '200px 150px 200px 100px 100px 80px 150px',
              gap: '15px',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>{center.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{center.businessLicense}</div>
              </div>
              <div style={{ fontSize: '14px' }}>{center.address || '주소 미등록'}</div>
              <div style={{ fontSize: '14px' }}>
                <div>{center.contact?.phone || '연락처 미등록'}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{center.contact?.email || ''}</div>
              </div>
              <div style={{ fontSize: '14px', textAlign: 'center' }}>{center.totalCounselors || 0}명</div>
              <div style={{ fontSize: '14px', textAlign: 'center' }}>{center.activeCounselor || 0}명</div>
              <div>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: center.isActive !== false ? '#e8f5e8' : '#ffebee',
                  color: center.isActive !== false ? '#4caf50' : '#f44336'
                }}>
                  {center.isActive !== false ? '활성' : '비활성'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleViewCenterDetail(center)}
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
                  상세
                </button>
                <button
                  onClick={() => handleEditCenter(center)}
                  style={{
                    backgroundColor: '#9c27b0',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  편집
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 상담센터 편집 모달 */}
      {editingCenter && (
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
            width: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>상담센터 편집</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>센터명</label>
              <input
                type="text"
                value={centerForm.name || ''}
                onChange={(e) => setCenterForm(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>설명</label>
              <textarea
                value={centerForm.description || ''}
                onChange={(e) => setCenterForm(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minHeight: '80px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>주소</label>
              <input
                type="text"
                value={centerForm.address || ''}
                onChange={(e) => setCenterForm(prev => ({ ...prev, address: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>연락처</label>
              <input
                type="text"
                value={centerForm.contact || ''}
                onChange={(e) => setCenterForm(prev => ({ ...prev, contact: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={centerForm.isActive}
                  onChange={(e) => setCenterForm(prev => ({ ...prev, isActive: e.target.checked }))}
                />
                센터 활성화
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setEditingCenter(null);
                  setCenterForm({});
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
                onClick={handleSaveCenterEdit}
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

      {/* 상담센터 상세 모달 */}
      {viewingCenterDetail && (
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
            <h3 style={{ margin: '0 0 20px 0' }}>{viewingCenterDetail.name} - 상세 정보</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h4 style={{ marginBottom: '10px', color: '#333' }}>기본 정보</h4>
                <div style={{ marginBottom: '10px' }}>
                  <strong>센터명:</strong> {viewingCenterDetail.name}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>사업자등록번호:</strong> {viewingCenterDetail.businessLicense || '미등록'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>주소:</strong> {viewingCenterDetail.address || '주소 미등록'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>연락처:</strong> {viewingCenterDetail.contact?.phone || '연락처 미등록'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>이메일:</strong> {viewingCenterDetail.contact?.email || '이메일 미등록'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>상태:</strong> 
                  <span style={{
                    marginLeft: '8px',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    backgroundColor: viewingCenterDetail.isActive !== false ? '#e8f5e8' : '#ffebee',
                    color: viewingCenterDetail.isActive !== false ? '#4caf50' : '#f44336'
                  }}>
                    {viewingCenterDetail.isActive !== false ? '활성' : '비활성'}
                  </span>
                </div>
              </div>
              
              <div>
                <h4 style={{ marginBottom: '10px', color: '#333' }}>운영 정보</h4>
                <div style={{ marginBottom: '10px' }}>
                  <strong>전체 상담사:</strong> {viewingCenterDetail.totalCounselors || 0}명
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>활성 상담사:</strong> {viewingCenterDetail.activeCounselor || 0}명
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>관리자:</strong> {viewingCenterDetail.adminUser?.name || '미지정'}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>관리자 이메일:</strong> {viewingCenterDetail.adminUser?.email || '미지정'}
                </div>
              </div>
            </div>

            {viewingCenterDetail.description && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '10px', color: '#333' }}>센터 설명</h4>
                <p style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px', margin: '0' }}>
                  {viewingCenterDetail.description}
                </p>
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setViewingCenterDetail(null)}
                style={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CentersManagement;