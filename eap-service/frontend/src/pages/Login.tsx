import React, { useState } from 'react';
import axios from 'axios';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', formData);
      localStorage.setItem('token', response.data.token);
      onLogin(response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(to bottom, #f8fafc 0%, #e3f2fd 50%, #e8f5e8 100%)',
      fontFamily: '"Segoe UI", "Malgun Gothic", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 배경 장식 요소 */}
      <div style={{
        position: 'absolute',
        top: '10%',
        right: '15%',
        width: '300px',
        height: '300px',
        background: 'linear-gradient(135deg, #2196f3 0%, #4caf50 100%)',
        borderRadius: '50%',
        opacity: 0.1,
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '15%',
        left: '10%',
        width: '200px',
        height: '200px',
        background: 'linear-gradient(135deg, #4caf50 0%, #ff9800 100%)',
        borderRadius: '50%',
        opacity: 0.1,
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '5%',
        width: '150px',
        height: '150px',
        background: 'linear-gradient(135deg, #ff9800 0%, #9c27b0 100%)',
        borderRadius: '50%',
        opacity: 0.08,
        zIndex: 0
      }}></div>

      <div style={{
        maxWidth: '420px',
        width: '100%',
        padding: '50px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(33, 150, 243, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ 
            color: '#333', 
            fontSize: '36px', 
            fontWeight: '700',
            marginBottom: '15px',
            background: 'linear-gradient(135deg, #2196f3 0%, #4caf50 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none'
          }}>
            🏢 EAP Service
          </h1>
          <p style={{ 
            color: '#666', 
            fontSize: '18px',
            fontWeight: '300',
            margin: '0'
          }}>
            근로자지원프로그램 로그인
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              color: '#333' 
            }}>
              이메일
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid rgba(33, 150, 243, 0.2)',
                borderRadius: '12px',
                fontSize: '16px',
                boxSizing: 'border-box',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
              placeholder="이메일을 입력하세요"
              onFocus={(e) => {
                e.target.style.border = '2px solid #2196f3';
                e.target.style.boxShadow = '0 4px 20px rgba(33, 150, 243, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.border = '2px solid rgba(33, 150, 243, 0.2)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              color: '#333' 
            }}>
              비밀번호
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid rgba(33, 150, 243, 0.2)',
                borderRadius: '12px',
                fontSize: '16px',
                boxSizing: 'border-box',
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
              placeholder="비밀번호를 입력하세요"
              onFocus={(e) => {
                e.target.style.border = '2px solid #2196f3';
                e.target.style.boxShadow = '0 4px 20px rgba(33, 150, 243, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.border = '2px solid rgba(33, 150, 243, 0.2)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(244, 67, 54, 0.1)',
              color: '#c62828',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '25px',
              border: '1px solid rgba(244, 67, 54, 0.2)',
              backdropFilter: 'blur(10px)',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '18px',
              background: loading ? 'rgba(153, 153, 153, 0.3)' : 'linear-gradient(135deg, #2196f3 0%, #4caf50 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '25px',
              boxShadow: loading ? 'none' : '0 6px 20px rgba(33, 150, 243, 0.3)',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(33, 150, 243, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.3)';
              }
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <p style={{ color: '#666', margin: '10px 0', fontSize: '16px' }}>
            계정이 없으신가요?
          </p>
          <a
            href="/register"
            style={{
              color: '#2196f3',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '16px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#4caf50';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#2196f3';
            }}
          >
            직원 회원가입
          </a>
        </div>

        <div style={{
          background: 'rgba(33, 150, 243, 0.1)',
          backdropFilter: 'blur(10px)',
          padding: '20px',
          borderRadius: '16px',
          fontSize: '14px',
          border: '1px solid rgba(33, 150, 243, 0.2)',
          color: '#1565c0'
        }}>
          <strong>테스트 계정:</strong><br />
          심리상담사: counselor@test.com / password123<br />
          재무상담사: financial@test.com / password123<br />
          관리자: admin@test.com / admin123<br />
          <br />
          <em style={{ color: '#666' }}>백엔드 폴더에서 node create_test_user.js로 생성</em>
        </div>
      </div>
    </div>
  );
};

export default Login;