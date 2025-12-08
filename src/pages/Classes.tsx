import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Student, ClassReason, PerformanceReason } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useClasses } from '../contexts/ClassesContext';

type ReasonPopupType = 'class' | 'performance' | null;

export default function Classes() {
  const { activeClasses } = useClasses();
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [tallies, setTallies] = useState<Record<string, number>>({});
  const [stars, setStars] = useState<Record<string, number>>({});
  const [performanceTallies, setPerformanceTallies] = useState<Record<string, number>>({});
  const { mentor } = useAuth();
  
  const [showReasonPopup, setShowReasonPopup] = useState<ReasonPopupType>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [classReasons, setClassReasons] = useState<ClassReason[]>([]);
  const [performanceReasons, setPerformanceReasons] = useState<PerformanceReason[]>([]);
  const [reasonSearch, setReasonSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  
  const [successAnimation, setSuccessAnimation] = useState<Record<string, 'class' | 'star' | 'performance' | null>>({});

  useEffect(() => {
    if (activeClasses.length > 0 && !selectedClass) {
      setSelectedClass(activeClasses[0]);
    }
  }, [activeClasses, selectedClass]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassData();
    }
  }, [selectedClass]);

  useEffect(() => {
    fetchReasons();
  }, []);

  async function fetchReasons() {
    try {
      const [classData, performanceData] = await Promise.all([
        api.tallies.getClassReasons(),
        api.tallies.getPerformanceReasons()
      ]);
      
      setClassReasons(classData.map(r => ({
        id: r.id,
        reason: r.reason,
        tally: r.tally,
        created_at: r.createdAt,
        updated_at: r.updatedAt || r.createdAt
      })));
      
      setPerformanceReasons(performanceData.map(r => ({
        id: r.id,
        reason: r.reason,
        tally: r.tally,
        created_at: r.createdAt,
        updated_at: r.updatedAt || r.createdAt
      })));
    } catch (error) {
      console.error('Error fetching reasons:', error);
      setClassReasons([]);
      setPerformanceReasons([]);
    }
  }

  async function fetchClassData() {
    if (!selectedClass) return;
    
    try {
      const studentsData = await api.students.getAll(selectedClass);
      setStudents(studentsData);

      if (studentsData.length > 0) {
        const [talliesData, starsData, otherTalliesData] = await Promise.all([
          api.tallies.getAll(),
          api.stars.getAll(),
          api.tallies.getOther()
        ]);

        const studentIds = new Set(studentsData.map(s => s.id));
        
        const talliesMap: Record<string, number> = {};
        const starsMap: Record<string, number> = {};
        const performanceTalliesMap: Record<string, number> = {};

        talliesData.filter(t => studentIds.has(t.studentId)).forEach(t => {
          talliesMap[t.studentId] = (talliesMap[t.studentId] || 0) + t.count;
        });

        starsData.filter(s => studentIds.has(s.studentId)).forEach(s => {
          starsMap[s.studentId] = (starsMap[s.studentId] || 0) + s.count;
        });

        otherTalliesData.filter(o => studentIds.has(o.studentId)).forEach(o => {
          performanceTalliesMap[o.studentId] = (performanceTalliesMap[o.studentId] || 0) + o.count;
        });

        setTallies(talliesMap);
        setStars(starsMap);
        setPerformanceTallies(performanceTalliesMap);
      } else {
        setTallies({});
        setStars({});
        setPerformanceTallies({});
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
      setStudents([]);
    }
  }

  function triggerSuccessAnimation(studentId: string, type: 'class' | 'star' | 'performance') {
    setSuccessAnimation(prev => ({ ...prev, [studentId]: type }));
    setTimeout(() => {
      setSuccessAnimation(prev => ({ ...prev, [studentId]: null }));
    }, 1000);
  }

  async function addClassTally(studentId: string, reason: ClassReason) {
    try {
      const student = students.find(s => s.id === studentId);
      if (!student || !mentor) return;

      const currentCount = tallies[studentId] || 0;
      const newCount = currentCount + reason.tally;
      
      setTallies(prev => ({ ...prev, [studentId]: newCount }));
      triggerSuccessAnimation(studentId, 'class');
      setShowReasonPopup(null);
      setSelectedStudentId(null);
      setReasonSearch('');

      await api.tallies.create({
        student_id: studentId,
        count: reason.tally,
        fine_amount: reason.tally * 10,
        added_by: mentor.id,
        reason: reason.reason,
        class: student.class,
        mentor_short_form: mentor.short_form
      });
      
      fetchClassData();
    } catch (error) {
      console.error('Error adding class tally:', error);
      const currentCount = tallies[studentId] || 0;
      setTallies(prev => ({ ...prev, [studentId]: Math.max(0, currentCount - reason.tally) }));
    }
  }

  async function addStar(studentId: string) {
    try {
      const student = students.find(s => s.id === studentId);
      if (!student || !mentor) return;

      const currentCount = stars[studentId] || 0;
      const newCount = currentCount + 1;
      
      setStars(prev => ({ ...prev, [studentId]: newCount }));
      triggerSuccessAnimation(studentId, 'star');

      await api.stars.create({
        student_id: studentId,
        count: 1,
        source: 'manual',
        added_by: mentor.id,
        class: student.class,
        mentor_short_form: mentor.short_form
      });
      
      fetchClassData();
    } catch (error) {
      console.error('Error adding star:', error);
      const currentCount = stars[studentId] || 0;
      setStars(prev => ({ ...prev, [studentId]: Math.max(0, currentCount - 1) }));
    }
  }

  async function addPerformanceTally(studentId: string, reason: PerformanceReason) {
    try {
      const student = students.find(s => s.id === studentId);
      if (!student || !mentor) return;

      const currentCount = performanceTallies[studentId] || 0;
      const newCount = currentCount + reason.tally;
      
      setPerformanceTallies(prev => ({ ...prev, [studentId]: newCount }));
      triggerSuccessAnimation(studentId, 'performance');
      setShowReasonPopup(null);
      setSelectedStudentId(null);
      setReasonSearch('');

      await api.tallies.createOther({
        student_id: studentId,
        count: reason.tally,
        fine_amount: reason.tally * 10,
        added_by: mentor.id,
        reason: reason.reason,
        class: student.class,
        mentor_short_form: mentor.short_form
      });
      
      fetchClassData();
    } catch (error) {
      console.error('Error adding performance tally:', error);
      const currentCount = performanceTallies[studentId] || 0;
      setPerformanceTallies(prev => ({ ...prev, [studentId]: Math.max(0, currentCount - reason.tally) }));
    }
  }

  function openReasonPopup(studentId: string, type: 'class' | 'performance') {
    setSelectedStudentId(studentId);
    setShowReasonPopup(type);
    setReasonSearch('');
    fetchReasons();
  }

  const filteredClassReasons = classReasons.filter(r =>
    r.reason.toLowerCase().includes(reasonSearch.toLowerCase())
  );

  const filteredPerformanceReasons = performanceReasons.filter(r =>
    r.reason.toLowerCase().includes(reasonSearch.toLowerCase())
  );

  if (!selectedClass && activeClasses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ fontSize: '18px', color: '#6b7280' }}>
          No classes available. Please add classes in Admin Panel.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
        Classes
      </h1>

      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
        flexWrap: 'wrap'
      }}>
        {activeClasses.map(cls => (
          <button
            key={cls}
            onClick={() => setSelectedClass(cls)}
            style={{
              padding: '12px 24px',
              background: selectedClass === cls ? '#16a34a' : '#ffffff',
              color: selectedClass === cls ? '#ffffff' : '#1f2937',
              border: '2px solid #16a34a',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {cls}
          </button>
        ))}
      </div>

      {selectedClass && students.length > 0 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px 24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search students by name or roll number..."
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#16a34a'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>
      )}

      {students.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '60px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>
            No students in {selectedClass} yet. Add students from the Add Students page.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {students
            .filter(student => {
              if (!studentSearch.trim()) return true;
              const searchLower = studentSearch.toLowerCase();
              return student.name.toLowerCase().includes(searchLower) ||
                     student.roll_number.toLowerCase().includes(searchLower);
            })
            .map(student => {
            const isAnimating = successAnimation[student.id];
            const animClass = isAnimating === 'class' ? 'class' : isAnimating === 'star' ? 'star' : isAnimating === 'performance' ? 'performance' : null;
            
            return (
              <div
                key={student.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  transform: isAnimating ? 'scale(1.05)' : 'scale(1)',
                  animation: isAnimating ? 'successPulse 0.5s ease-in-out' : 'none',
                  position: 'relative'
                }}
              >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={student.name}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '24px',
                    fontWeight: 'bold'
                  }}>
                    {student.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                    {student.name}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Roll: {student.roll_number}
                  </p>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '16px',
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Tally</p>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>
                    {tallies[student.id] || 0}
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Star</p>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>
                    {stars[student.id] || 0}
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Other</p>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#f97316' }}>
                    {performanceTallies[student.id] || 0}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  onClick={() => openReasonPopup(student.id, 'class')}
                  style={{
                    padding: '10px',
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                >
                  + Tally
                </button>
                <button
                  onClick={() => addStar(student.id)}
                  style={{
                    padding: '10px',
                    background: '#fbbf24',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f59e0b'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fbbf24'}
                >
                  + Star
                </button>
                <button
                  onClick={() => openReasonPopup(student.id, 'performance')}
                  style={{
                    padding: '10px',
                    background: '#f97316',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#ea580c'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f97316'}
                >
                  + Other
                </button>
              </div>
              
              {isAnimating && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '48px',
                  fontWeight: 'bold',
                  pointerEvents: 'none',
                  zIndex: 10,
                  animation: 'fadeInOut 1s ease-in-out'
                }}>
                  {animClass === 'class' && '✓'}
                  {animClass === 'star' && '⭐'}
                  {animClass === 'performance' && '✓'}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {showReasonPopup && selectedStudentId && (
        <div
          onClick={() => {
            setShowReasonPopup(null);
            setSelectedStudentId(null);
            setReasonSearch('');
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
              Select {showReasonPopup === 'class' ? 'Tally' : 'Other'} Reason
            </h2>
            
            <input
              type="text"
              placeholder="Search reasons..."
              value={reasonSearch}
              onChange={(e) => setReasonSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                marginBottom: '16px'
              }}
            />

            <div style={{
              overflowY: 'auto',
              maxHeight: '400px',
              marginBottom: '16px'
            }}>
              {(() => {
                const currentReasons = showReasonPopup === 'class' ? classReasons : performanceReasons;
                const filteredReasons = showReasonPopup === 'class' ? filteredClassReasons : filteredPerformanceReasons;
                
                if (filteredReasons.length === 0) {
                  if (currentReasons.length === 0) {
                    return (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                        No {showReasonPopup === 'class' ? 'tally' : 'other'} reasons available yet. Please add them in Admin Panel.
                      </div>
                    );
                  } else {
                    return (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                        No reasons found matching "{reasonSearch}".
                      </div>
                    );
                  }
                }
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredReasons.map((reason) => (
                      <button
                        key={reason.id}
                        onClick={() => {
                          if (showReasonPopup === 'class') {
                            addClassTally(selectedStudentId, reason);
                          } else {
                            addPerformanceTally(selectedStudentId, reason);
                          }
                        }}
                        style={{
                          padding: '12px 16px',
                          background: '#f9fafb',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#16a34a';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f9fafb';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                            {reason.reason}
                          </span>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: showReasonPopup === 'class' ? '#ef4444' : '#f97316',
                            padding: '4px 8px',
                            background: showReasonPopup === 'class' ? '#fee2e2' : '#ffedd5',
                            borderRadius: '4px'
                          }}>
                            +{reason.tally}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            <button
              onClick={() => {
                setShowReasonPopup(null);
                setSelectedStudentId(null);
                setReasonSearch('');
              }}
              style={{
                padding: '10px 24px',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes successPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
