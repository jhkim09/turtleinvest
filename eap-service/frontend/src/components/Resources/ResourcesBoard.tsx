import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MomentumTheme, MomentumComponents } from '../../styles/MomentumTheme.ts';

interface Resource {
  _id: string;
  title: string;
  content: string;
  category: string;
  author: {
    name: string;
    role: string;
  };
  isPinned: boolean;
  viewCount: number;
  likesCount: number;
  publishedAt: string;
  links?: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
  tags?: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  likes: Array<{
    user: string;
    likedAt: string;
  }>;
}

interface ResourcesResponse {
  resources: Resource[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  categories: string[];
}

const ResourcesBoard: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 10
  });

  useEffect(() => {
    loadResources();
  }, [selectedCategory, searchQuery, currentPage]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', currentPage.toString());
      params.append('limit', '10');
      params.append('sortBy', 'publishedAt');
      params.append('sortOrder', 'desc');

      const response = await axios.get(`http://localhost:3000/api/resources?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data: ResourcesResponse = response.data;
      setResources(data.resources);
      setCategories(data.categories);
      setPagination(data.pagination);
    } catch (error) {
      console.error('자료 로드 실패:', error);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResourceClick = async (resourceId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/resources/${resourceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedResource(response.data);
    } catch (error) {
      console.error('자료 상세 조회 실패:', error);
    }
  };

  const handleLikeToggle = async (resourceId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:3000/api/resources/${resourceId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 목록과 선택된 자료 모두 새로고침
      loadResources();
      if (selectedResource && selectedResource._id === resourceId) {
        handleResourceClick(resourceId);
      }
    } catch (error) {
      console.error('좋아요 토글 실패:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#ea580c';
      case 'normal': return '#3b82f6';
      case 'low': return '#6b7280';
      default: return '#3b82f6';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return '긴급';
      case 'high': return '높음';
      case 'normal': return '보통';
      case 'low': return '낮음';
      default: return '보통';
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: MomentumTheme.colors.text.secondary }}>자료를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{
          color: MomentumTheme.colors.text.primary,
          margin: '0',
          fontSize: MomentumTheme.typography.fontSize['2xl'],
          fontWeight: MomentumTheme.typography.fontWeight.semibold,
          fontFamily: MomentumTheme.typography.fontFamily.primary
        }}>
          📚 자료실
        </h2>
        <div style={{
          fontSize: '14px',
          color: MomentumTheme.colors.text.secondary
        }}>
          총 {pagination.total}개의 자료
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <input
            type="text"
            placeholder="자료 검색..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: `1px solid ${MomentumTheme.colors.gray[300]}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: MomentumTheme.typography.fontFamily.primary
            }}
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: '12px 16px',
            border: `1px solid ${MomentumTheme.colors.gray[300]}`,
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: MomentumTheme.typography.fontFamily.primary,
            backgroundColor: 'white'
          }}
        >
          <option value="">전체 카테고리</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* 자료 목록 */}
      {resources.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: MomentumTheme.colors.text.secondary
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
          <h3 style={{ color: MomentumTheme.colors.text.primary, marginBottom: '8px' }}>
            자료가 없습니다
          </h3>
          <p>선택한 조건에 맞는 자료가 없습니다.</p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gap: '16px',
            marginBottom: '24px'
          }}>
            {resources.map(resource => (
              <div
                key={resource._id}
                onClick={() => handleResourceClick(resource._id)}
                style={{
                  ...MomentumTheme.card,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}
              >
                {/* 고정 표시 */}
                {resource.isPinned && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: MomentumTheme.colors.primary,
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    📌 고정
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div style={{ flex: 1, paddingRight: resource.isPinned ? '80px' : '0' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <span style={{
                        padding: '4px 12px',
                        background: `${getPriorityColor(resource.priority)}15`,
                        color: getPriorityColor(resource.priority),
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {resource.category}
                      </span>
                      {resource.priority !== 'normal' && (
                        <span style={{
                          padding: '2px 8px',
                          background: getPriorityColor(resource.priority),
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {getPriorityText(resource.priority)}
                        </span>
                      )}
                    </div>
                    
                    <h3 style={{
                      margin: '0 0 8px 0',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: MomentumTheme.colors.text.primary,
                      lineHeight: '1.4'
                    }}>
                      {resource.title}
                    </h3>
                    
                    <p style={{
                      margin: '0 0 12px 0',
                      color: MomentumTheme.colors.text.secondary,
                      fontSize: '14px',
                      lineHeight: '1.5',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {resource.content}
                    </p>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px',
                      color: MomentumTheme.colors.text.secondary
                    }}>
                      <div>
                        작성자: {resource.author.name} | {new Date(resource.publishedAt).toLocaleDateString('ko-KR')}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span>👀 {resource.viewCount}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeToggle(resource._id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: MomentumTheme.colors.text.secondary,
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '13px'
                          }}
                        >
                          ❤️ {resource.likesCount}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 페이지네이션 */}
          {pagination.totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '24px'
            }}>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${MomentumTheme.colors.gray[300]}`,
                  borderRadius: '6px',
                  background: currentPage === 1 ? MomentumTheme.colors.gray[100] : 'white',
                  color: currentPage === 1 ? MomentumTheme.colors.gray[400] : MomentumTheme.colors.text.primary,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                이전
              </button>
              
              <span style={{
                padding: '8px 16px',
                fontSize: '14px',
                color: MomentumTheme.colors.text.secondary
              }}>
                {currentPage} / {pagination.totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${MomentumTheme.colors.gray[300]}`,
                  borderRadius: '6px',
                  background: currentPage === pagination.totalPages ? MomentumTheme.colors.gray[100] : 'white',
                  color: currentPage === pagination.totalPages ? MomentumTheme.colors.gray[400] : MomentumTheme.colors.text.primary,
                  cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {/* 자료 상세 모달 */}
      {selectedResource && (
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
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={() => setSelectedResource(null)}
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

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <span style={{
                padding: '6px 16px',
                background: `${getPriorityColor(selectedResource.priority)}15`,
                color: getPriorityColor(selectedResource.priority),
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {selectedResource.category}
              </span>
              {selectedResource.priority !== 'normal' && (
                <span style={{
                  padding: '4px 12px',
                  background: getPriorityColor(selectedResource.priority),
                  color: 'white',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {getPriorityText(selectedResource.priority)}
                </span>
              )}
              {selectedResource.isPinned && (
                <span style={{
                  padding: '4px 12px',
                  background: MomentumTheme.colors.primary,
                  color: 'white',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  📌 고정
                </span>
              )}
            </div>

            <h1 style={{
              margin: '0 0 16px 0',
              fontSize: '28px',
              fontWeight: '700',
              color: MomentumTheme.colors.text.primary,
              lineHeight: '1.3',
              paddingRight: '50px'
            }}>
              {selectedResource.title}
            </h1>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 0',
              borderBottom: `1px solid ${MomentumTheme.colors.gray[200]}`,
              marginBottom: '24px',
              fontSize: '14px',
              color: MomentumTheme.colors.text.secondary
            }}>
              <div>
                작성자: {selectedResource.author.name} | {new Date(selectedResource.publishedAt).toLocaleDateString('ko-KR')}
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span>👀 {selectedResource.viewCount}</span>
                <button
                  onClick={() => handleLikeToggle(selectedResource._id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: MomentumTheme.colors.text.secondary,
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '14px'
                  }}
                >
                  ❤️ {selectedResource.likesCount}
                </button>
              </div>
            </div>

            <div style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: MomentumTheme.colors.text.primary,
              whiteSpace: 'pre-wrap',
              marginBottom: '24px'
            }}>
              {selectedResource.content}
            </div>

            {/* 링크 첨부 */}
            {selectedResource.links && selectedResource.links.length > 0 && (
              <div style={{
                marginTop: '24px',
                padding: '20px',
                background: MomentumTheme.colors.gray[50],
                borderRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: MomentumTheme.colors.text.primary
                }}>
                  🔗 관련 링크
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedResource.links.map((link, index) => (
                    <div key={index}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: MomentumTheme.colors.primary,
                          textDecoration: 'none',
                          fontWeight: '500'
                        }}
                      >
                        {link.title}
                      </a>
                      {link.description && (
                        <p style={{
                          margin: '4px 0 0 0',
                          fontSize: '13px',
                          color: MomentumTheme.colors.text.secondary
                        }}>
                          {link.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 태그 */}
            {selectedResource.tags && selectedResource.tags.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedResource.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        padding: '4px 12px',
                        background: MomentumTheme.colors.gray[100],
                        color: MomentumTheme.colors.text.secondary,
                        borderRadius: '16px',
                        fontSize: '12px'
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesBoard;