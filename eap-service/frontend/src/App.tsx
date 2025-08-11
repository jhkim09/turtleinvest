import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Dashboard from './pages/Dashboard.tsx';
import ManagerDashboard from './pages/ManagerDashboard.tsx';
import CounselorDashboard from './pages/CounselorDashboard.tsx';
import CompanyAdminDashboard from './pages/CompanyAdminDashboard.tsx';
import SuperAdminDashboard from './pages/SuperAdminDashboard.tsx';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    console.log('Checking auth status...');
    const token = localStorage.getItem('token');
    if (token) {
      try {
        console.log('Token found, checking profile...');
        const response = await axios.get('http://localhost:3000/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000  // 10초 timeout으로 증가
        });
        console.log('Profile loaded:', response.data);
        setUser(response.data);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
      }
    } else {
      console.log('No token found');
    }
    console.log('Setting loading to false');
    setLoading(false);
  };

  const handleLogin = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };


  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#333' }}>EAP Service 로딩 중...</h2>
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
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/login"
            element={
              user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />
            }
          />
          <Route
            path="/register"
            element={
              user ? <Navigate to="/dashboard" replace /> : <Register onLogin={handleLogin} />
            }
          />
          <Route
            path="/dashboard"
            element={
              user ? (
                user.role === 'super-admin' ? <Navigate to="/super-admin" replace /> :
                user.role === 'counselor' ? <Navigate to="/counselor" replace /> :
                user.role === 'manager' ? <Navigate to="/manager" replace /> :
                user.role === 'company-admin' ? <Navigate to="/company-admin" replace /> :
                <Dashboard user={user} onLogout={handleLogout} />
              ) : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/manager"
            element={
              user ? <ManagerDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/counselor"
            element={
              user ? <CounselorDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/company-admin"
            element={
              user ? <CompanyAdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/super-admin"
            element={
              user ? <SuperAdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;