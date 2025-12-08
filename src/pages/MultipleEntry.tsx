import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Student, ClassReason, PerformanceReason } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useClasses } from '../contexts/ClassesContext';

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
  
  const [showReasonPopup, setShowReasonPopup] = useState<ReasonPopupType>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [classReasons, setClassReasons] = useState<ClassReason[]>([]);
  const [performanceReasons, setPerformanceReasons] = useState<PerformanceReason[]>([]);
  const [reasonSearch, setReasonSearch] = useState('');
  

  useEffect(() => {
    if (activeClasses.length > 0 && !selectedClass) {
      setSelectedClass(activeClasses[0]);
      setLoading(false);
    }
  }, [activeClasses, selectedClass]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassData();
    } else if (activeClasses.length === 0) {
      setLoading(false);
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
    }
  }

  async function fetchClassData() {
    if (!selectedClass) return;
    setLoading(true);
    
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
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleStudentSelection(studentId: string) {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  }

  function selectAll() {
    setSelectedStudents(new Set(students.map(s => s.id)));
  }

  function deselectAll() {
    setSelectedStudents(new Set());
  }

  async function addBulkClassTally(reason: ClassReason) {
    if (!mentor || selectedStudents.size === 0) return;
    
    try {
      for (const studentId of selectedStudents) {
        const student = students.find(s => s.id === studentId);
        if (student) {
          await api.tallies.create({
            student_id: studentId,
            count: reason.tally,
            fine_amount: reason.tally * 10,
            added_by: mentor.id,
            reason: reason.reason,
            class: student.class,
            mentor_short_form: mentor.short_form
          });
        }
      }
      setShowReasonPopup(null);
      setSelectedStudents(new Set());
      fetchClassData();
    } catch (error) {
      console.error('Error adding bulk tally:', error);
    }
  }

  async function addBulkStar() {
    if (!mentor || selectedStudents.size === 0) return;
    
    try {
      for (const studentId of selectedStudents) {
        const student = students.find(s => s.id === studentId);
        if (student) {
          await api.stars.create({
            student_id: studentId,
            count: 1,
            source: 'manual',
            added_by: mentor.id,
            class: student.class,
            mentor_short_form: mentor.short_form
          });
        }
      }
      setSelectedStudents(new Set());
      fetchClassData();
    } catch (error) {
      console.error('Error adding bulk stars:', error);
    }
  }

  async function addBulkPerformanceTally(reason: PerformanceReason) {
    if (!mentor || selectedStudents.size === 0) return;
    
    try {
      for (const studentId of selectedStudents) {
        const student = students.find(s => s.id === studentId);
        if (student) {
          await api.tallies.createOther({
            student_id: studentId,
            count: reason.tally,
            fine_amount: reason.tally * 10,
            added_by: mentor.id,
            reason: reason.reason,
            class: student.class,
            mentor_short_form: mentor.short_form
          });
        }
      }
      setShowReasonPopup(null);
      setSelectedStudents(new Set());
      fetchClassData();
    } catch (error) {
      console.error('Error adding bulk performance tally:', error);
    }
  }

  const filteredClassReasons = classReasons.filter(r =>
    r.reason.toLowerCase().includes(reasonSearch.toLowerCase())
  );

  const filteredPerformanceReasons = performanceReasons.filter(r =>
    r.reason.toLowerCase().includes(reasonSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: '#6b7280', fontSize: '18px' }}>Loading...</p>
      </div>
    );
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
        Multiple Entry
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
            onClick={() => {
              setSelectedClass(cls);
              setSelectedStudents(new Set());
            }}
            style={{
              padding: '12px 24px',
              background: selectedClass === cls ? '#16a34a' : '#ffffff',
              color: selectedClass === cls ? '#ffffff' : '#1f2937',
              border: '2px solid #16a34a',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {cls}
          </button>
        ))}
      </div>

      {selectedStudents.size > 0 && (
        <div style={{
          background: '#16a34a',
          color: '#ffffff',
          padding: '16px 24px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span style={{ fontWeight: '600' }}>
            {selectedStudents.size} student(s) selected
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowReasonPopup('class')}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              + Tally to All
            </button>
            <button
              onClick={addBulkStar}
              style={{
                padding: '8px 16px',
                background: '#fbbf24',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              + Star to All
            </button>
            <button
              onClick={() => setShowReasonPopup('performance')}
              style={{
                padding: '8px 16px',
                background: '#f97316',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              + Other to All
            </button>
            <button
              onClick={deselectAll}
              style={{
                padding: '8px 16px',
                background: '#374151',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={selectAll}
          style={{
            padding: '8px 16px',
            background: '#e5e7eb',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '8px'
          }}
        >
          Select All
        </button>
        <button
          onClick={deselectAll}
          style={{
            padding: '8px 16px',
            background: '#e5e7eb',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Deselect All
        </button>
      </div>

      {students.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '60px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>
            No students in {selectedClass} yet.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {students.map(student => (
            <div
              key={student.id}
              onClick={() => toggleStudentSelection(student.id)}
              style={{
                background: selectedStudents.has(student.id) ? '#d1fae5' : '#ffffff',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                border: selectedStudents.has(student.id) ? '3px solid #16a34a' : '3px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={student.name}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    {student.name.charAt(0)}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {student.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>
                    Roll: {student.roll_number}
                  </p>
                </div>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  border: '2px solid #16a34a',
                  background: selectedStudents.has(student.id) ? '#16a34a' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  {selectedStudents.has(student.id) && '✓'}
                </div>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '12px',
                padding: '8px',
                background: '#f9fafb',
                borderRadius: '6px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', color: '#6b7280' }}>Tally</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444' }}>
                    {tallies[student.id] || 0}
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', color: '#6b7280' }}>Star</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>
                    {stars[student.id] || 0}
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', color: '#6b7280' }}>Other</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#f97316' }}>
                    {performanceTallies[student.id] || 0}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showReasonPopup && (
        <div
          onClick={() => {
            setShowReasonPopup(null);
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
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              Select Reason ({selectedStudents.size} students)
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
                marginBottom: '16px'
              }}
            />

            <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
              {(showReasonPopup === 'class' ? filteredClassReasons : filteredPerformanceReasons).map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => {
                    if (showReasonPopup === 'class') {
                      addBulkClassTally(reason);
                    } else {
                      addBulkPerformanceTally(reason);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#f9fafb',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    marginBottom: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{reason.reason}</span>
                    <span style={{ fontWeight: '600', color: showReasonPopup === 'class' ? '#ef4444' : '#f97316' }}>
                      +{reason.tally}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowReasonPopup(null);
                setReasonSearch('');
              }}
              style={{
                marginTop: '16px',
                padding: '10px 24px',
                background: '#e5e7eb',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
