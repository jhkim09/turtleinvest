import React, { memo, useCallback } from 'react';

interface PendingAssignment {
  _id: string;
  employee: {
    name: string;
    email: string;
    company: string;
    department: string;
  };
  topic: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  counselingMethod: 'faceToFace' | 'phoneVideo' | 'chat';
  sessionType: string;
  requestedDate: string;
  assignmentStatus: 'pending' | 'assigned' | 'confirmed';
  createdAt: string;
}

interface PendingAssignmentsProps {
  assignments: PendingAssignment[];
  loading: boolean;
  onAssign?: (assignment: PendingAssignment) => void;
}

export const PendingAssignments: React.FC<PendingAssignmentsProps> = memo(({ 
  assignments, 
  loading,
  onAssign 
}) => {
  const getUrgencyColor = useCallback((urgency: string) => {
    switch (urgency) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getMethodLabel = useCallback((method: string) => {
    switch (method) {
      case 'faceToFace': return '대면 상담';
      case 'phoneVideo': return '화상 상담';
      case 'chat': return '채팅 상담';
      default: return method;
    }
  }, []);

  const sortedAssignments = React.useMemo(() => {
    return [...assignments].sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aUrgency = urgencyOrder[a.urgencyLevel] || 0;
      const bUrgency = urgencyOrder[b.urgencyLevel] || 0;
      
      if (aUrgency !== bUrgency) {
        return bUrgency - aUrgency; // 높은 긴급도 먼저
      }
      
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // 오래된 것 먼저
    });
  }, [assignments]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-300 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="px-6 py-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2 animate-pulse"></div>
                <div className="h-3 bg-gray-300 rounded w-1/4 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          배정 대기 ({assignments.length})
        </h3>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {sortedAssignments.map((assignment) => (
          <div key={assignment._id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(assignment.urgencyLevel)}`}>
                    {assignment.urgencyLevel.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500">
                    {getMethodLabel(assignment.counselingMethod)}
                  </span>
                </div>
                
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {assignment.employee.name} ({assignment.employee.company})
                </h4>
                
                <p className="text-sm text-gray-600 mb-1">
                  주제: {assignment.topic}
                </p>
                
                <div className="flex items-center text-xs text-gray-500 space-x-4">
                  <span>{assignment.employee.department}</span>
                  <span>요청일: {new Date(assignment.requestedDate).toLocaleDateString()}</span>
                  <span>등록: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => onAssign?.(assignment)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  배정
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {assignments.length === 0 && !loading && (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-500">배정 대기 중인 상담이 없습니다.</p>
        </div>
      )}
    </div>
  );
});