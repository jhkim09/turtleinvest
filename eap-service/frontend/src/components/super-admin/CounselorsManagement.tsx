import React, { memo, useState, useCallback, useMemo } from 'react';

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

interface CounselorsManagementProps {
  counselors: Counselor[];
  loading: boolean;
  refreshCounselors: () => void;
}

export const CounselorsManagement: React.FC<CounselorsManagementProps> = memo(({ 
  counselors, 
  loading, 
  refreshCounselors 
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  
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

  const filteredCounselors = useMemo(() => {
    return counselors.filter(counselor => {
      const matchesSearch = !searchTerm || 
        counselor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        counselor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        counselor.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter = filterActive === 'all' || 
        (filterActive === 'active' && counselor.isActive) ||
        (filterActive === 'inactive' && !counselor.isActive);
      
      return matchesSearch && matchesFilter;
    });
  }, [counselors, searchTerm, filterActive]);

  const handleEdit = useCallback((counselor: Counselor) => {
    setSelectedCounselor(counselor);
    setNewCounselor({
      name: counselor.name,
      email: counselor.email,
      phone: counselor.phone,
      password: '',
      specialties: counselor.specialties,
      licenseNumber: counselor.licenseNumber,
      experience: counselor.experience,
      rates: counselor.rates,
      maxDailyAppointments: counselor.maxDailyAppointments
    });
    setShowEditModal(true);
  }, []);

  const handleCreate = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/counselors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCounselor)
      });

      if (response.ok) {
        setShowAddModal(false);
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
        refreshCounselors();
        alert('상담사가 성공적으로 등록되었습니다.');
      } else {
        const error = await response.json();
        alert(`등록 실패: ${error.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('상담사 등록 오류:', error);
      alert('상담사 등록 중 오류가 발생했습니다.');
    }
  }, [newCounselor, refreshCounselors]);

  const handleUpdate = useCallback(async () => {
    if (!selectedCounselor) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/counselors/${selectedCounselor._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCounselor)
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedCounselor(null);
        refreshCounselors();
        alert('상담사 정보가 성공적으로 수정되었습니다.');
      } else {
        const error = await response.json();
        alert(`수정 실패: ${error.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('상담사 수정 오류:', error);
      alert('상담사 수정 중 오류가 발생했습니다.');
    }
  }, [selectedCounselor, newCounselor, refreshCounselors]);

  const handleToggleActive = useCallback(async (counselorId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/counselors/${counselorId}/toggle-active`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        refreshCounselors();
        alert(`상담사가 ${!currentStatus ? '활성화' : '비활성화'}되었습니다.`);
      } else {
        alert('상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('상담사 상태 변경 오류:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  }, [refreshCounselors]);

  const closeModal = useCallback(() => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedCounselor(null);
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
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-300 rounded w-1/4"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">상담사 관리</h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
            >
              + 상담사 추가
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="이름, 이메일, 전문분야로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">전체</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
            <button
              onClick={refreshCounselors}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* Counselor List */}
        <div className="divide-y divide-gray-200">
          {filteredCounselors.length > 0 ? (
            filteredCounselors.map((counselor) => (
              <div key={counselor._id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{counselor.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        counselor.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {counselor.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>📧 {counselor.email}</div>
                      <div>📞 {counselor.phone}</div>
                      <div>📜 면허번호: {counselor.licenseNumber}</div>
                      <div>⏱️ 경력: {counselor.experience}년</div>
                      <div className="md:col-span-2">
                        🎯 전문분야: {counselor.specialties?.join(', ') || '없음'}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        대면: ₩{counselor.rates.faceToFace.toLocaleString()}
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        화상: ₩{counselor.rates.phoneVideo.toLocaleString()}
                      </span>
                      <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        채팅: ₩{counselor.rates.chat.toLocaleString()}
                      </span>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        일일 최대: {counselor.maxDailyAppointments}회
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => handleEdit(counselor)}
                      className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                    >
                      편집
                    </button>
                    <button
                      onClick={() => handleToggleActive(counselor._id, counselor.isActive)}
                      className={`px-3 py-1 text-sm rounded ${
                        counselor.isActive
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-green-600 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      {counselor.isActive ? '비활성화' : '활성화'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              {searchTerm || filterActive !== 'all' 
                ? '검색 조건에 맞는 상담사가 없습니다.'
                : '등록된 상담사가 없습니다.'
              }
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {showEditModal ? '상담사 편집' : '새 상담사 등록'}
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                    <input
                      type="text"
                      value={newCounselor.name}
                      onChange={(e) => setNewCounselor(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                    <input
                      type="email"
                      value={newCounselor.email}
                      onChange={(e) => setNewCounselor(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                    <input
                      type="text"
                      value={newCounselor.phone}
                      onChange={(e) => setNewCounselor(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">면허번호 *</label>
                    <input
                      type="text"
                      value={newCounselor.licenseNumber}
                      onChange={(e) => setNewCounselor(prev => ({ ...prev, licenseNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">경력 (년)</label>
                  <input
                    type="number"
                    value={newCounselor.experience}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, experience: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">전문분야</label>
                  {newCounselor.specialties.map((specialty, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={specialty}
                        onChange={(e) => {
                          const newSpecialties = [...newCounselor.specialties];
                          newSpecialties[index] = e.target.value;
                          setNewCounselor(prev => ({ ...prev, specialties: newSpecialties }));
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="전문분야를 입력하세요"
                      />
                      {newCounselor.specialties.length > 1 && (
                        <button
                          onClick={() => {
                            const newSpecialties = newCounselor.specialties.filter((_, i) => i !== index);
                            setNewCounselor(prev => ({ ...prev, specialties: newSpecialties }));
                          }}
                          className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setNewCounselor(prev => ({ ...prev, specialties: [...prev.specialties, ''] }))}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    + 전문분야 추가
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">상담 단가</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">대면 상담</label>
                      <input
                        type="number"
                        value={newCounselor.rates.faceToFace}
                        onChange={(e) => setNewCounselor(prev => ({ 
                          ...prev, 
                          rates: { ...prev.rates, faceToFace: parseInt(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">화상 상담</label>
                      <input
                        type="number"
                        value={newCounselor.rates.phoneVideo}
                        onChange={(e) => setNewCounselor(prev => ({ 
                          ...prev, 
                          rates: { ...prev.rates, phoneVideo: parseInt(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">채팅 상담</label>
                      <input
                        type="number"
                        value={newCounselor.rates.chat}
                        onChange={(e) => setNewCounselor(prev => ({ 
                          ...prev, 
                          rates: { ...prev.rates, chat: parseInt(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">일일 최대 상담 수</label>
                  <input
                    type="number"
                    value={newCounselor.maxDailyAppointments}
                    onChange={(e) => setNewCounselor(prev => ({ ...prev, maxDailyAppointments: parseInt(e.target.value) || 8 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {showAddModal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">임시 비밀번호 *</label>
                    <input
                      type="password"
                      value={newCounselor.password}
                      onChange={(e) => setNewCounselor(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="상담사가 처음 로그인할 때 사용할 비밀번호"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  onClick={showEditModal ? handleUpdate : handleCreate}
                  disabled={!newCounselor.name || !newCounselor.email || !newCounselor.licenseNumber || (showAddModal && !newCounselor.password)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {showEditModal ? '수정' : '등록'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default CounselorsManagement;