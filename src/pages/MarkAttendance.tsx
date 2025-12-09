import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Student } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useClasses } from '../contexts/ClassesContext';

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
  }, [selectedClass, today]);

  async function fetchStudents() {
    try {
      const studentsData = await api.students.getAll(selectedClass);

      if (studentsData) {
        setStudents(studentsData);

        const attendanceData = await api.attendance.getAll({
          class: selectedClass,
          date: today
        });

        const attendanceMap: Record<string, {status: string; prayer: string}> = {};
        attendanceData?.forEach(a => {
          attendanceMap[a.student_id] = {
            status: a.status,
            prayer: a.prayer || ''
          };
        });

        setAttendance(attendanceMap);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
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
      await api.attendance.create({
        student_id: studentId,
        class: selectedClass,
        date: today,
        status: record.status,
        prayer: record.prayer || null,
        marked_by: mentor?.id
      });
    } catch (error) {
      console.error('Error saving attendance:', error);
    }
  }

  async function saveAllAttendance() {
    setLoading(true);
    try {
      const records = students
        .filter(student => attendance[student.id])
        .map(student => ({
          student_id: student.id,
          class: selectedClass,
          date: today,
          status: attendance[student.id].status,
          prayer: attendance[student.id].prayer || null,
          marked_by: mentor?.id
        }));

      if (records.length > 0) {
        await api.attendance.createBulk(records);
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
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
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Namaz</th>
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
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
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
