import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Student, ClassReason, PerformanceReason } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useClasses } from '../contexts/ClassesContext';
import { preventDuplicateOperation, retryOperation, generateOperationId } from '../lib/utils';

type ReasonPopupType = 'class' | 'performance' | null;

export default function MultipleEntry() {
  const { activeClasses } = useClasses();
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [tallies, setTallies] = useState<Record<string, number>>({});
  const [stars, setStars] = useState<Record<string, number>>({});
  const [performanceTallies, setPerformanceTallies] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const { mentor } = useAuth();
  
  // Reason popup state
  const [showReasonPopup, setShowReasonPopup] = useState<ReasonPopupType>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [classReasons, setClassReasons] = useState<ClassReason[]>([]);
  const [performanceReasons, setPerformanceReasons] = useState<PerformanceReason[]>([]);
  const [reasonSearch, setReasonSearch] = useState('');
  
  // Success animation state
  const [successAnimation, setSuccessAnimation] = useState<Record<string, 'class' | 'star' | 'performance' | null>>({});

  useEffect(() => {
    if (activeClasses.length > 0 && !selectedClass) {
      setSelectedClass(activeClasses[0]);
      setLoading(false); // Ensure loading is false when class is selected
    }
  }, [activeClasses, selectedClass]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassData();
      
      // Subscribe to realtime updates for students
      const channel = supabase
        .channel('students_multiple_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'students' },
          () => {
            fetchClassData();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    } else if (activeClasses.length === 0) {
      setLoading(false); // No classes available
    }
  }, [selectedClass]);

  useEffect(() => {
    fetchReasons();
    
    // Subscribe to realtime updates for reasons
    const channel1 = supabase
      .channel('class_reasons_multiple_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'class_reasons' },
        () => {
          fetchReasons();
        }
      )
      .subscribe();
    
    const channel2 = supabase
      .channel('performance_reasons_multiple_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'performance_reasons' },
        () => {
          fetchReasons();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, []);

  useEffect(() => {
    if (selectedClass) {
      // Subscribe to realtime updates for tallies, stars, and performance
      const channel1 = supabase
        .channel('tallies_multiple_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'tallies' },
          () => {
            fetchClassData();
          }
        )
        .subscribe();
      
      const channel2 = supabase
        .channel('stars_multiple_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'stars' },
          () => {
            fetchClassData();
          }
        )
        .subscribe();
      
      const channel3 = supabase
        .channel('other_tallies_multiple_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'other_tallies' },
          () => {
            fetchClassData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel1);
        supabase.removeChannel(channel2);
        supabase.removeChannel(channel3);
      };
    }
  }, [selectedClass]);

  async function fetchReasons() {
    try {
      console.log('Fetching reasons...');
      const [classData, performanceData] = await Promise.all([
        supabase.from('class_reasons').select('*').order('reason'),
        supabase.from('performance_reasons').select('*').order('reason')
      ]);
      
      console.log('Class reasons response:', classData);
      console.log('Performance reasons response:', performanceData);
      
      if (classData.error) {
        console.error('Error fetching class reasons:', classData.error);
        setClassReasons([]);
      } else {
        console.log('Setting class reasons:', classData.data);
        setClassReasons(classData.data || []);
      }
      
      if (performanceData.error) {
        console.error('Error fetching performance reasons:', performanceData.error);
        setPerformanceReasons([]);
      } else {
        console.log('Setting performance reasons:', performanceData.data);
        setPerformanceReasons(performanceData.data || []);
      }
    } catch (error) {
      console.error('Error fetching reasons:', error);
      setClassReasons([]);
      setPerformanceReasons([]);
    }
  }

  async function fetchClassData() {
    if (!selectedClass) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('class', selectedClass)
        .order('name');

      if (studentsError) throw studentsError;

      if (studentsData) {
        setStudents(studentsData);

        if (studentsData.length > 0) {
          const studentIds = studentsData.map(s => s.id);

          const [talliesData, starsData, otherTalliesData] = await Promise.all([
            supabase.from('tallies').select('*').in('student_id', studentIds),
            supabase.from('stars').select('*').in('student_id', studentIds),
            supabase.from('other_tallies').select('*').in('student_id', studentIds)
          ]);

          const talliesMap: Record<string, number> = {};
          const starsMap: Record<string, number> = {};
          const performanceTalliesMap: Record<string, number> = {};

          talliesData.data?.forEach(t => {
            talliesMap[t.student_id] = (talliesMap[t.student_id] || 0) + t.count;
          });

          starsData.data?.forEach(s => {
            starsMap[s.student_id] = (starsMap[s.student_id] || 0) + s.count;
          });

          otherTalliesData.data?.forEach(o => {
            performanceTalliesMap[o.student_id] = (performanceTalliesMap[o.student_id] || 0) + o.count;
          });

          setTallies(talliesMap);
          setStars(starsMap);
          setPerformanceTallies(performanceTalliesMap);
        } else {
          // No students in this class
          setTallies({});
          setStars({});
          setPerformanceTallies({});
        }
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  function triggerSuccessAnimation(studentId: string, type: 'class' | 'star' | 'performance') {
    setSuccessAnimation(prev => ({ ...prev, [studentId]: type }));
    setTimeout(() => {
      setSuccessAnimation(prev => ({ ...prev, [studentId]: null }));
    }, 1000);
  }

  async function addClassTally(studentId: string, reason: ClassReason) {
    const operationId = generateOperationId(studentId, 'class', reason.id);
    
    try {
      await preventDuplicateOperation(operationId, async () => {
        const student = students.find(s => s.id === studentId);
        if (!student || !mentor) return;

        const currentCount = tallies[studentId] || 0;
        const newCount = currentCount + reason.tally;
        
        // Optimistic update - update UI immediately
        setTallies(prev => ({ ...prev, [studentId]: newCount }));
        triggerSuccessAnimation(studentId, 'class');
        setShowReasonPopup(null);
        setSelectedStudentId(null);
        setReasonSearch('');
        
        await retryOperation(async () => {
          const { data: existingTally } = await supabase
            .from('tallies')
            .select('*')
            .eq('student_id', studentId)
            .maybeSingle();

          const finalCount = (existingTally?.count || 0) + reason.tally;

          if (existingTally) {
            const { error } = await supabase
              .from('tallies')
              .update({
                count: finalCount,
                fine_amount: finalCount * 10,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingTally.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('tallies').insert([{
              student_id: studentId,
              count: reason.tally,
              fine_amount: reason.tally * 10,
              added_by: mentor.id
            }]);
            if (error) throw error;
          }

          // Record in history
          await supabase.from('tally_history').insert([{
            student_id: studentId,
            class: student.class,
            mentor_id: mentor.id,
            mentor_short_form: mentor.short_form,
            type: 'class',
            reason: reason.reason,
            tally_value: reason.tally
          }]);
        });
      });
    } catch (error) {
      console.error('Error adding class tally:', error);
      // Revert optimistic update on error
      const currentCount = tallies[studentId] || 0;
      setTallies(prev => ({ ...prev, [studentId]: Math.max(0, currentCount - reason.tally) }));
      // Retry immediately without delay
      addClassTally(studentId, reason).catch(() => {});
    }
  }

  async function addStar(studentId: string) {
    const operationId = generateOperationId(studentId, 'star');
    
    try {
      await preventDuplicateOperation(operationId, async () => {
        const student = students.find(s => s.id === studentId);
        if (!student || !mentor) return;

        const currentCount = stars[studentId] || 0;
        const newCount = currentCount + 1;
        
        // Optimistic update - update UI immediately
        setStars(prev => ({ ...prev, [studentId]: newCount }));
        triggerSuccessAnimation(studentId, 'star');
        
        await retryOperation(async () => {
          const { data: existingStar } = await supabase
            .from('stars')
            .select('*')
            .eq('student_id', studentId)
            .eq('source', 'manual')
            .maybeSingle();

          if (existingStar) {
            const { error } = await supabase
              .from('stars')
              .update({ count: existingStar.count + 1 })
              .eq('id', existingStar.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('stars').insert([{
              student_id: studentId,
              count: 1,
              source: 'manual',
              added_by: mentor.id
            }]);
            if (error) throw error;
          }

          // Record in history
          await supabase.from('tally_history').insert([{
            student_id: studentId,
            class: student.class,
            mentor_id: mentor.id,
            mentor_short_form: mentor.short_form,
            type: 'star',
            tally_value: 1
          }]);
        });
      });
    } catch (error) {
      console.error('Error adding star:', error);
      // Revert optimistic update on error
      const currentCount = stars[studentId] || 0;
      setStars(prev => ({ ...prev, [studentId]: Math.max(0, currentCount - 1) }));
      // Retry immediately without delay
      addStar(studentId).catch(() => {});
    }
  }

  async function addPerformanceTally(studentId: string, reason: PerformanceReason) {
    const operationId = generateOperationId(studentId, 'performance', reason.id);
    
    try {
      await preventDuplicateOperation(operationId, async () => {
        const student = students.find(s => s.id === studentId);
        if (!student || !mentor) return;

        const currentCount = performanceTallies[studentId] || 0;
        const newCount = currentCount + reason.tally;
        
        // Optimistic update - update UI immediately
        setPerformanceTallies(prev => ({ ...prev, [studentId]: newCount }));
        triggerSuccessAnimation(studentId, 'performance');
        setShowReasonPopup(null);
        setSelectedStudentId(null);
        setReasonSearch('');
        
        await retryOperation(async () => {
          const { data: existingPerformanceTally } = await supabase
            .from('other_tallies')
            .select('*')
            .eq('student_id', studentId)
            .maybeSingle();

          const finalCount = (existingPerformanceTally?.count || 0) + reason.tally;

          if (existingPerformanceTally) {
            const { error } = await supabase
              .from('other_tallies')
              .update({
                count: finalCount,
                fine_amount: finalCount * 10,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingPerformanceTally.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from('other_tallies').insert([{
              student_id: studentId,
              count: reason.tally,
              fine_amount: reason.tally * 10,
              added_by: mentor.id
            }]);
            if (error) throw error;
          }

          // Record in history
          await supabase.from('tally_history').insert([{
            student_id: studentId,
            class: student.class,
            mentor_id: mentor.id,
            mentor_short_form: mentor.short_form,
            type: 'performance',
            reason: reason.reason,
            tally_value: reason.tally
          }]);
        });
      });
    } catch (error) {
      console.error('Error adding performance tally:', error);
      // Revert optimistic update on error
      const currentCount = performanceTallies[studentId] || 0;
      setPerformanceTallies(prev => ({ ...prev, [studentId]: Math.max(0, currentCount - reason.tally) }));
      // Retry immediately without delay
      addPerformanceTally(studentId, reason).catch(() => {});
    }
  }

  function openReasonPopup(studentId: string, type: 'class' | 'performance') {
    setSelectedStudentId(studentId);
    setShowReasonPopup(type);
    setReasonSearch('');
    // Force fetch reasons when popup opens to ensure latest data
    fetchReasons();
  }

  function openBulkReasonPopup(type: 'class' | 'performance') {
    if (selectedStudents.size === 0) {
      alert('Please select at least one student');
      return;
    }
    setSelectedStudentId(null);
    setShowReasonPopup(type);
    setReasonSearch('');
    // Force fetch reasons when popup opens to ensure latest data
    fetchReasons();
  }

  function toggleStudent(studentId: string) {
    const newSet = new Set(selectedStudents);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setSelectedStudents(newSet);
  }

  function selectAll() {
    setSelectedStudents(new Set(students.map(s => s.id)));
  }

  function clearSelection() {
    setSelectedStudents(new Set());
  }

  async function applyReasonToSelected(reason: ClassReason | PerformanceReason, type: 'class' | 'performance') {
    if (selectedStudents.size === 0) return;
    
    const studentIds = Array.from(selectedStudents);
    setShowReasonPopup(null);
    setReasonSearch('');
    
    // Apply to all selected students
    for (const studentId of studentIds) {
      if (type === 'class') {
        await addClassTally(studentId, reason as ClassReason);
      } else {
        await addPerformanceTally(studentId, reason as PerformanceReason);
      }
    }
    
    clearSelection();
  }

  const filteredClassReasons = classReasons.filter(r =>
    r.reason.toLowerCase().includes(reasonSearch.toLowerCase())
  );

  const filteredPerformanceReasons = performanceReasons.filter(r =>
    r.reason.toLowerCase().includes(reasonSearch.toLowerCase())
  );

  if (loading && students.length === 0 && selectedClass) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>;
  }

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
        Multiple Entry (Tally + Star + Other)
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

      {/* Bulk Selection Controls */}
      {students.length > 0 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px 24px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              {selectedStudents.size} selected
            </span>
            <button
              onClick={selectAll}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              style={{
                padding: '8px 16px',
                background: '#6b7280',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          </div>
          {selectedStudents.size > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => openBulkReasonPopup('class')}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Apply Tally Reason ({selectedStudents.size})
              </button>
              <button
                onClick={() => openBulkReasonPopup('performance')}
                style={{
                  padding: '8px 16px',
                  background: '#f97316',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Apply Other Reason ({selectedStudents.size})
              </button>
            </div>
          )}
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
          {students.map(student => {
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
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer'
                    }}
                  />
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

                {/* Success Animation Overlay */}
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

      {/* Reason Popup */}
      {showReasonPopup && (
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
              {selectedStudentId 
                ? (showReasonPopup === 'class' ? 'Select Tally Reason' : 'Select Other Reason')
                : (showReasonPopup === 'class' 
                    ? `Select Tally Reason (${selectedStudents.size} students)` 
                    : `Select Other Reason (${selectedStudents.size} students)`)}
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
                
                console.log('Popup type:', showReasonPopup);
                console.log('Current reasons:', currentReasons);
                console.log('Filtered reasons:', filteredReasons);
                console.log('Search term:', reasonSearch);
                
                if (filteredReasons.length === 0) {
                  if (currentReasons.length === 0) {
                    return (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                        No {showReasonPopup === 'class' ? 'tally' : 'other'} reasons available yet. Please add them in Admin Panel → Manage Reasons.
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
                          if (selectedStudentId) {
                            if (showReasonPopup === 'class') {
                              addClassTally(selectedStudentId, reason);
                            } else {
                              addPerformanceTally(selectedStudentId, reason);
                            }
                          } else {
                            // Bulk apply
                            applyReasonToSelected(reason, showReasonPopup);
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
                width: '100%',
                padding: '12px',
                background: '#6b7280',
                color: '#ffffff',
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
