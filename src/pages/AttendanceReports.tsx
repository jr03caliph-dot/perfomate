import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useClasses } from '../contexts/ClassesContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentAttendance {
  studentId: string;
  studentName: string;
  rollNumber: string;
  present: number;
  absent: number;
  hospital: number;
  program: number;
  reported: number;
  totalAbsences: number;
  sheetStatus: string;
}

export default function AttendanceReports() {
  const { activeClasses } = useClasses();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [attendanceData, setAttendanceData] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeClasses.length > 0 && !selectedClass) {
      setSelectedClass(activeClasses[0]);
    }
  }, [activeClasses, selectedClass]);

  useEffect(() => {
    if (selectedClass) {
      fetchAttendanceData();
    }
    
    // Subscribe to realtime updates for attendance
    const channel = supabase
      .channel('attendance_reports')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        () => {
          if (selectedClass) {
            fetchAttendanceData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClass, selectedMonth]);

  async function fetchAttendanceData() {
    setLoading(true);
    try {
      const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('class', selectedClass);

      if (!students) return;

      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;

      const { data: attendanceRecords } = await supabase
        .from('attendance')
        .select('*')
        .eq('class', selectedClass)
        .gte('date', startDate)
        .lte('date', endDate);

      const attendanceMap: Record<string, StudentAttendance> = {};

      students.forEach(student => {
        attendanceMap[student.id] = {
          studentId: student.id,
          studentName: student.name,
          rollNumber: student.roll_number,
          present: 0,
          absent: 0,
          hospital: 0,
          program: 0,
          reported: 0,
          totalAbsences: 0,
          sheetStatus: 'None'
        };
      });

      attendanceRecords?.forEach(record => {
        const studentData = attendanceMap[record.student_id];
        if (studentData) {
          switch (record.status) {
            case 'Present':
              studentData.present++;
              break;
            case 'Absent':
              studentData.absent++;
              break;
            case 'Hospital':
              studentData.hospital++;
              break;
            case 'Program':
              studentData.program++;
              break;
            case 'Reported':
              studentData.reported++;
              break;
          }
        }
      });

      Object.values(attendanceMap).forEach(data => {
        data.totalAbsences = data.absent + data.hospital + data.program + data.reported;
        if (data.totalAbsences >= 6) {
          data.sheetStatus = 'Black Sheet';
        } else if (data.totalAbsences >= 4) {
          data.sheetStatus = 'Yellow Sheet';
        }
      });

      setAttendanceData(Object.values(attendanceMap));
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPDF() {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Namaz Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`Class: ${selectedClass}`, 14, 30);
    doc.text(`Month: ${new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, 14, 37);

    const startDate = `${selectedMonth}-01`;
    const endDate = `${selectedMonth}-31`;
    
    const { data: attendanceRecords } = await supabase
      .from('attendance')
      .select('*')
      .eq('class', selectedClass)
      .gte('date', startDate)
      .lte('date', endDate);

    // Calculate prayer-wise summary
    const prayerCounts = {
      Fajr: { present: 0, absent: 0, hospital: 0, program: 0, reported: 0 },
      Dhuhr: { present: 0, absent: 0, hospital: 0, program: 0, reported: 0 },
      Asr: { present: 0, absent: 0, hospital: 0, program: 0, reported: 0 },
      Maghrib: { present: 0, absent: 0, hospital: 0, program: 0, reported: 0 },
      Isha: { present: 0, absent: 0, hospital: 0, program: 0, reported: 0 }
    };

    attendanceRecords?.forEach(record => {
      if (record.prayer && prayerCounts[record.prayer as keyof typeof prayerCounts]) {
        const prayer = prayerCounts[record.prayer as keyof typeof prayerCounts];
        switch (record.status) {
          case 'Present':
            prayer.present++;
            break;
          case 'Absent':
            prayer.absent++;
            break;
          case 'Hospital':
            prayer.hospital++;
            break;
          case 'Program':
            prayer.program++;
            break;
          case 'Reported':
            prayer.reported++;
            break;
        }
      }
    });

    const tableData = attendanceData.map(data => [
      data.studentName,
      data.rollNumber,
      data.present.toString(),
      data.absent.toString(),
      data.hospital.toString(),
      data.program.toString(),
      data.reported.toString(),
      data.sheetStatus
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Student', 'Roll', 'Present', 'Absent', 'Hospital', 'Program', 'Reported', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] }
    });

    // Add prayer-wise summary
    let yPos = (doc as any).lastAutoTable.finalY + 20;
    
    doc.setFontSize(14);
    doc.text('Prayer-wise Summary', 14, yPos);
    yPos += 10;

    const prayerSummaryData = Object.entries(prayerCounts).map(([prayer, counts]) => [
      prayer,
      counts.present.toString(),
      counts.absent.toString(),
      counts.hospital.toString(),
      counts.program.toString(),
      counts.reported.toString()
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Prayer', 'Present', 'Absent', 'Hospital', 'Program', 'Reported']],
      body: prayerSummaryData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Namaz_Report_${selectedClass}_${selectedMonth}.pdf`);
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Loading reports...</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
        Namaz Reports
      </h1>

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{
                  padding: '10px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                {activeClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
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
                Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '10px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            onClick={downloadPDF}
            style={{
              padding: '12px 24px',
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#15803d'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#16a34a'}
          >
            📥 Download PDF
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Student</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Roll</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Present</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Absent</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Hospital</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Program</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Reported</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((data) => (
                <tr key={data.studentId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px', fontWeight: '600', color: '#1f2937' }}>{data.studentName}</td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>{data.rollNumber}</td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#16a34a', fontWeight: '600' }}>{data.present}</td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#ef4444', fontWeight: '600' }}>{data.absent}</td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#3b82f6', fontWeight: '600' }}>{data.hospital}</td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#8b5cf6', fontWeight: '600' }}>{data.program}</td>
                  <td style={{ padding: '16px', textAlign: 'center', color: '#f97316', fontWeight: '600' }}>{data.reported}</td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: data.sheetStatus === 'Black Sheet' ? '#ffffff' : data.sheetStatus === 'Yellow Sheet' ? '#000000' : '#6b7280',
                    background: data.sheetStatus === 'Black Sheet' ? '#000000' : data.sheetStatus === 'Yellow Sheet' ? '#fbbf24' : 'transparent'
                  }}>
                    {data.sheetStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {attendanceData.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No attendance data available for the selected period
          </div>
        )}
      </div>
    </div>
  );
}
