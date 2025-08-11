import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    name: string;
    role: string;
  };
  data?: any;
}

interface NotificationBellProps {
  userRole: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userRole }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userRole === 'counselor' || userRole === 'super-admin') {
      fetchUnreadCount();
      // 30초마다 읽지 않은 알림 수 확인
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('읽지 않은 알림 수 조회 오류:', error);
    }
  };

  const fetchNotifications = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/notifications?limit=10', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('알림 목록 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3000/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(notif =>
        notif._id === notificationId ? { ...notif, isRead: true } : notif
      ));
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('알림 읽음 처리 오류:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:3000/api/notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('모든 알림 읽음 처리 오류:', error);
    }
  };

  const handleBellClick = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown) {
      fetchNotifications();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'dispute_submitted':
        return '⚠️';
      case 'dispute_resolved':
        return '✅';
      case 'assignment_new':
        return '📋';
      case 'payment_processed':
        return '💰';
      case 'system_announcement':
        return '📢';
      default:
        return '🔔';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return `${Math.floor(diffInMinutes / 1440)}일 전`;
  };

  // 상담사나 Super Admin이 아니면 알림 벨 표시하지 않음
  if (userRole !== 'counselor' && userRole !== 'super-admin') {
    return null;
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* 알림 벨 */}
      <button
        onClick={handleBellClick}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: '8px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            backgroundColor: '#f44336',
            color: 'white',
            borderRadius: '50%',
            fontSize: '11px',
            padding: '2px 6px',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 */}
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          width: '350px',
          maxHeight: '400px',
          overflowY: 'auto',
          zIndex: 1000
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '15px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h4 style={{ margin: 0, fontSize: '16px', color: '#333' }}>알림</h4>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1976d2',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                모두 읽음
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                로딩 중...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                새로운 알림이 없습니다.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => !notification.isRead && markAsRead(notification._id)}
                  style={{
                    padding: '12px 15px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: notification.isRead ? 'default' : 'pointer',
                    backgroundColor: notification.isRead ? 'white' : '#f8f9ff',
                    ':hover': {
                      backgroundColor: notification.isRead ? '#f8f9fa' : '#f0f2ff'
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: notification.isRead ? 'normal' : 'bold',
                        fontSize: '13px',
                        color: '#333',
                        marginBottom: '4px'
                      }}>
                        {notification.title}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666',
                        lineHeight: '1.3',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {notification.message}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#999',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>{formatTimeAgo(notification.createdAt)}</span>
                        {notification.sender && (
                          <span>by {notification.sender.name}</span>
                        )}
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#1976d2',
                        flexShrink: 0
                      }} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 푸터 */}
          {notifications.length > 0 && (
            <div style={{
              padding: '10px 15px',
              textAlign: 'center',
              borderTop: '1px solid #eee'
            }}>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // 전체 알림 페이지로 이동하는 로직 추가 가능
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1976d2',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                모든 알림 보기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 드롭다운 외부 클릭 시 닫기 */}
      {showDropdown && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;