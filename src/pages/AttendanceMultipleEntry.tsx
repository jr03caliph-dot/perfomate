import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Student, ATTENDANCE_STATUS, PRAYERS } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useClasses } from '../contexts/ClassesContext';

export default function AttendanceMultipleEntry() {
  const { activeClasses } = useClasses();
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string>('Present');
  const [prayer, setPrayer] = useState('');
  const [loading, setLoading] = useState(false);
  const { mentor } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (activeClasses.length > 0 && !selectedClass) {
      setSelectedClass(activeClasses[0]);
    }
  }, [activeClasses, selectedClass]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  async function fetchStudents() {
    try {
      const data = await api.students.getAll(selectedClass);
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
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

  function clearAll() {
    setSelectedStudents(new Set());
  }

  async function handleSubmit() {
    if (selectedStudents.size === 0) {
      return;
    }

    setLoading(true);
    try {
      const studentIds = Array.from(selectedStudents);
      const records = studentIds.map(studentId => ({
        student_id: studentId,
        class: selectedClass,
        date: today,
        status,
        prayer: prayer || null,
        marked_by: mentor?.id
      }));

      await api.attendance.createBulk(records);

      setSelectedStudents(new Set());
      setPrayer('');
    } catch (error) {
      console.error('Error marking attendance:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
        Namaz Multiple Entry
      </h1>

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '12px'
          }}>
            Select Class
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {activeClasses.map(cls => (
              <button
                key={cls}
                onClick={() => {
                  setSelectedClass(cls);
                  setSelectedStudents(new Set());
                }}
                style={{
                  padding: '10px 20px',
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
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '12px'
          }}>
            Namaz Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              width: '100%',
              maxWidth: '300px'
            }}
          >
            {ATTENDANCE_STATUS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Prayer (Optional)
          </label>
          <select
            value={prayer}
            onChange={(e) => setPrayer(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
          >
            <option value="">Select Prayer</option>
            {PRAYERS.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={selectAll}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Select All
          </button>
          <button
            onClick={clearAll}
            style={{
              padding: '10px 20px',
              background: '#6b7280',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Clear All
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}>
          {students.map(student => (
            <label
              key={student.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: selectedStudents.has(student.id) ? '#dcfce7' : '#f9fafb',
                border: `2px solid ${selectedStudents.has(student.id) ? '#16a34a' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <input
                type="checkbox"
                checked={selectedStudents.has(student.id)}
                onChange={() => toggleStudent(student.id)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                  {student.name}
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  Roll: {student.roll_number}
                </p>
              </div>
            </label>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || selectedStudents.size === 0}
          style={{
            width: '100%',
            padding: '14px',
            background: '#16a34a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading || selectedStudents.size === 0 ? 'not-allowed' : 'pointer',
            opacity: loading || selectedStudents.size === 0 ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
        >
          {loading ? 'Saving...' : `Mark ${status} for ${selectedStudents.size} student(s)`}
        </button>
      </div>
    </div>
  );
}
