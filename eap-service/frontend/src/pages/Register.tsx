import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Company {
  _id: string;
  name: string;
  domain: string;
  industry: string;
}

interface RegisterProps {
  onLogin: (user: any) => void;
}

const Register: React.FC<RegisterProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    department: '',
    employeeId: '',
    companyId: ''
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/companies/public');
      setCompanies(response.data.companies);
    } catch (err) {
      console.error('회사 목록 조회 실패:', err);
      setError('회사 목록을 불러올 수 없습니다.');
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchDepartments = async (companyId: string) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/companies/${companyId}/departments`);
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('부서 목록 조회 실패:', error);
      // 기본 부서 목록 사용
      setDepartments(['경영진', 'IT개발팀', '마케팅팀', '영업팀', '인사팀', '재무팀', '총무팀', '기획팀', '디자인팀', '품질관리팀']);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // 회사 선택 시 해당 회사의 부서 목록 조회
    if (name === 'companyId' && value) {
      fetchDepartments(value);
      // 회사 변경 시 부서 선택 초기화
      setFormData(prev => ({ ...prev, department: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      setLoading(false);
      return;
    }

    // 필수 필드 확인
    if (!formData.companyId) {
      setError('소속 회사를 선택해주세요.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', {
        ...formData,
        role: 'employee'
      });
      
      localStorage.setItem('token', response.data.token);
      onLogin(response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '2px solid #e1e1e1',
    borderRadius: '6px',
    fontSize: '16px',
    boxSizing: 'border-box' as const
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold' as const,
    color: '#333'
  };

  if (loadingCompanies) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#333' }}>회사 정보 로딩 중...</h2>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #1976d2',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '20px auto'
          }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#333', fontSize: '28px', marginBottom: '10px' }}>
            🏢 EAP Service
          </h1>
          <p style={{ color: '#666', fontSize: '16px' }}>
            직원 회원가입
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>소속 회사 *</label>
            <select
              name="companyId"
              required
              value={formData.companyId}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">회사를 선택하세요</option>
              {companies.map((company) => (
                <option key={company._id} value={company._id}>
                  {company.name} ({company.industry})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>이메일 *</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              style={inputStyle}
              placeholder="이메일을 입력하세요"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>이름 *</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              style={inputStyle}
              placeholder="이름을 입력하세요"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>부서 *</label>
            <select
              name="department"
              required
              value={formData.department}
              onChange={handleChange}
              style={inputStyle}
              disabled={!formData.companyId || departments.length === 0}
            >
              <option value="">
                {!formData.companyId ? '먼저 소속 회사를 선택하세요' : 
                 departments.length === 0 ? '부서 목록 로딩 중...' : '부서를 선택하세요'}
              </option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>사원번호</label>
            <input
              type="text"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              style={inputStyle}
              placeholder="사원번호를 입력하세요 (선택사항)"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>비밀번호 *</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              style={inputStyle}
              placeholder="6자 이상 비밀번호를 입력하세요"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>비밀번호 확인 *</label>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={6}
              value={formData.confirmPassword}
              onChange={handleChange}
              style={inputStyle}
              placeholder="비밀번호를 다시 입력하세요"
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#ffebee',
              color: '#c62828',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #ffcdd2'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#ccc' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '20px'
            }}
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#666', margin: '10px 0' }}>
            이미 계정이 있으신가요?
          </p>
          <a
            href="/login"
            style={{
              color: '#1976d2',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            로그인하기
          </a>
        </div>
      </div>
    </div>
  );
};

export default Register;