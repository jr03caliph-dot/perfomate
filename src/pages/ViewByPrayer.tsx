import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PRAYERS } from '../types';
import { useClasses } from '../contexts/ClassesContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PrayerAttendance {
  studentId: string;
  studentName: string;
  rollNumber: string;
  class: string;
  status: string;
  prayer: string;
  date: string;
}

export default function ViewByPrayer() {
  const { activeClasses } = useClasses();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPrayer, setSelectedPrayer] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<PrayerAttendance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedClass, selectedPrayer, selectedDate]);

  async function fetchAttendanceData() {
    if (!selectedPrayer) {
      setAttendanceData([]);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('attendance')
        .select(`
          id,
          status,
          prayer,
          date,
          students!inner(id, name, roll_number, class)
        `)
        .eq('prayer', selectedPrayer)
        .eq('date', selectedDate)
        .in('status', ['Absent', 'Hospital', 'Program', 'Reported']);

      if (selectedClass) {
        query = query.eq('class', selectedClass);
      }

      const { data: records, error } = await query.order('students(name)');

      if (error) {
        console.error('Error fetching data:', error);
        return;
      }

      if (records) {
        const data = records.map((record: any) => ({
          studentId: record.students.id,
          studentName: record.students.name,
          rollNumber: record.students.roll_number,
          class: record.students.class,
          status: record.status,
          prayer: record.prayer,
          date: record.date
        }));

        setAttendanceData(data);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
    if (attendanceData.length === 0) {
      alert('No data to download');
      return;
    }

    const doc = new jsPDF();
    const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    doc.setFontSize(18);
    doc.text('Prayer Attendance Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`Prayer: ${selectedPrayer}`, 14, 30);
    doc.text(`Date: ${formattedDate}`, 14, 37);

    const tableData = attendanceData.map(data => [
      data.studentName,
      data.class,
      data.rollNumber,
      data.status,
      selectedPrayer,
      formattedDate
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Student', 'Class', 'Roll Number', 'Status', 'Prayer', 'Date']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] }
    });

    doc.save(`Prayer_Attendance_${selectedPrayer}_${selectedDate}.pdf`);
  }

  const filteredData = selectedClass
    ? attendanceData.filter(data => data.class === selectedClass)
    : attendanceData;

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
        Namaz View by Prayer
      </h1>

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Prayer *
              </label>
              <select
                value={selectedPrayer}
                onChange={(e) => setSelectedPrayer(e.target.value)}
                style={{
                  padding: '10px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  minWidth: '150px'
                }}
              >
                <option value="">Select Prayer</option>
                {PRAYERS.map(prayer => (
                  <option key={prayer} value={prayer}>{prayer}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '10px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Class (Optional)
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{
                  padding: '10px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  minWidth: '120px'
                }}
              >
                <option value="">All Classes</option>
                {activeClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={downloadPDF}
            disabled={filteredData.length === 0}
            style={{
              padding: '12px 24px',
              background: filteredData.length === 0 ? '#9ca3af' : '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: filteredData.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: filteredData.length === 0 ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (filteredData.length > 0) {
                e.currentTarget.style.background = '#15803d';
              }
            }}
            onMouseLeave={(e) => {
              if (filteredData.length > 0) {
                e.currentTarget.style.background = '#16a34a';
              }
            }}
          >
            📥 Download Report
          </button>
        </div>

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Loading...
          </div>
        )}

        {!loading && selectedPrayer && (
          <>
            <div style={{ marginBottom: '16px', fontSize: '14px', color: '#374151', fontWeight: '500' }}>
              Showing {filteredData.length} student{filteredData.length !== 1 ? 's' : ''} who were Absent or Late
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Student</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Class</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Roll Number</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Status</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Prayer</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((data, index) => (
                    <tr key={`${data.studentId}-${index}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '16px', fontWeight: '600', color: '#1f2937' }}>{data.studentName}</td>
                      <td style={{ padding: '16px', color: '#6b7280' }}>{data.class}</td>
                      <td style={{ padding: '16px', color: '#6b7280' }}>{data.rollNumber}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: data.status === 'Absent' ? '#dc2626' : data.status === 'Hospital' ? '#2563eb' : data.status === 'Program' ? '#9333ea' : '#f97316',
                          background: data.status === 'Absent' ? '#fee2e2' : data.status === 'Hospital' ? '#dbeafe' : data.status === 'Program' ? '#f3e8ff' : '#fed7aa'
                        }}>
                          {data.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280' }}>{data.prayer}</td>
                      <td style={{ padding: '16px', color: '#6b7280' }}>{new Date(data.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredData.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                No students found for the selected prayer and date
              </div>
            )}
          </>
        )}

        {!selectedPrayer && !loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Please select a prayer to view attendance
          </div>
        )}
      </div>
    </div>
  );
}

