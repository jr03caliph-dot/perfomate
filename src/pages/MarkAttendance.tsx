import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Student, ATTENDANCE_STATUS, PRAYERS } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useClasses } from '../contexts/ClassesContext';
import { retryOperation } from '../lib/utils';

export default function MarkAttendance() {
  const { activeClasses } = useClasses();
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, {status: string; prayer: string}>>({});
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
    
    // Subscribe to realtime updates for attendance
    const channel = supabase
      .channel('mark_attendance')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        () => {
          if (selectedClass) {
            fetchStudents();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClass, today]);

  async function fetchStudents() {
    const { data: studentsData } = await supabase
      .from('students')
      .select('*')
      .eq('class', selectedClass)
      .order('name');

    if (studentsData) {
      setStudents(studentsData);

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('class', selectedClass)
        .eq('date', today);

      const attendanceMap: Record<string, {status: string; prayer: string}> = {};
      attendanceData?.forEach(a => {
        attendanceMap[a.student_id] = {
          status: a.status,
          prayer: a.prayer || ''
        };
      });

      setAttendance(attendanceMap);
    }
  }

  function updateAttendance(studentId: string, field: 'status' | 'prayer', value: string) {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        status: field === 'status' ? value : (prev[studentId]?.status || 'Present'),
        prayer: field === 'prayer' ? value : (prev[studentId]?.prayer || '')
      }
    }));
  }

  async function saveAttendance(studentId: string) {
    const record = attendance[studentId];
    if (!record) return;

    try {
      await retryOperation(async () => {
        const { data: existing } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', studentId)
          .eq('date', today)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('attendance')
            .update({
              status: record.status,
              prayer: record.prayer,
              marked_by: mentor?.id
            })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('attendance').insert([{
            student_id: studentId,
            class: selectedClass,
            date: today,
            status: record.status,
            prayer: record.prayer,
            marked_by: mentor?.id
          }]);
          if (error) throw error;
        }
      }, 5);
    } catch (error) {
      console.error('Error saving attendance:', error);
      // Silently retry
      setTimeout(() => saveAttendance(studentId), 2000);
    }
  }

  async function saveAllAttendance() {
    setLoading(true);
    try {
      for (const student of students) {
        if (attendance[student.id]) {
          await saveAttendance(student.id);
        }
      }
      // Success - no alert needed
    } catch (error) {
      console.error('Error saving attendance:', error);
      // Silently retry
      setTimeout(() => saveAllAttendance(), 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
        Mark Namaz
      </h1>

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Select Class
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {activeClasses.map(cls => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
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

          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            Date: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Student</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Roll Number</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Prayer</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px', fontWeight: '600', color: '#1f2937' }}>{student.name}</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>{student.roll_number}</td>
                  <td style={{ padding: '16px' }}>
                    <select
                      value={attendance[student.id]?.status || 'Present'}
                      onChange={(e) => {
                        updateAttendance(student.id, 'status', e.target.value);
                        setTimeout(() => saveAttendance(student.id), 100);
                      }}
                      style={{
                        padding: '8px 12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    >
                      {ATTENDANCE_STATUS.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <select
                      value={attendance[student.id]?.prayer || ''}
                      onChange={(e) => {
                        updateAttendance(student.id, 'prayer', e.target.value);
                        setTimeout(() => saveAttendance(student.id), 100);
                      }}
                      style={{
                        padding: '8px 12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none',
                        minWidth: '120px'
                      }}
                    >
                      <option value="">Select Prayer</option>
                      {PRAYERS.map(prayer => (
                        <option key={prayer} value={prayer}>{prayer}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={saveAllAttendance}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: '#16a34a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
        >
          {loading ? 'Saving...' : 'Save All Namaz'}
        </button>
      </div>
    </div>
  );
}
