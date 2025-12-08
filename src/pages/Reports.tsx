import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useClasses } from '../contexts/ClassesContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentReport {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  photoUrl?: string;
  tallies: number;
  stars: number;
  otherTallies: number;
  netFine: number;
}

interface ClassReport {
  class: string;
  totalTallies: number;
  totalStars: number;
  totalOtherTallies: number;
  netFine: number;
}

export default function Reports() {
  const { activeClasses } = useClasses();
  const [reports, setReports] = useState<ClassReport[]>([]);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [viewMode, setViewMode] = useState<'class' | 'student'>('class');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeClasses.length > 0) {
      fetchReports();
    }
  }, [activeClasses]);

  async function fetchReports() {
    setLoading(true);
    try {
      const classReports: ClassReport[] = [];
      const allStudentReports: StudentReport[] = [];

      for (const className of activeClasses) {
        const students = await api.students.getAll(className);

        if (!students || students.length === 0) continue;

        const studentIds = students.map(s => s.id);

        const [talliesData, starsData, otherTalliesData] = await Promise.all([
          api.tallies.getAll(),
          api.stars.getAll(),
          api.tallies.getOther()
        ]);

        const filteredTallies = talliesData.filter(t => studentIds.includes(t.student_id));
        const filteredStars = starsData.filter(s => studentIds.includes(s.student_id));
        const filteredOtherTallies = otherTalliesData.filter(o => studentIds.includes(o.student_id));

        const totalTallies = filteredTallies.reduce((sum, t) => sum + t.count, 0) || 0;
        const totalStars = filteredStars.reduce((sum, s) => sum + s.count, 0) || 0;
        const totalOtherTallies = filteredOtherTallies.reduce((sum, o) => sum + o.count, 0) || 0;

        const adjustedTallies = Math.max(0, totalTallies - (totalStars * 2));
        const netFine = (adjustedTallies * 10) + (totalOtherTallies * 10);

        classReports.push({
          class: className,
          totalTallies,
          totalStars,
          totalOtherTallies,
          netFine
        });

        for (const student of students) {
          const studentTallies = filteredTallies
            .filter(t => t.student_id === student.id)
            .reduce((sum, t) => sum + t.count, 0);
          const studentStars = filteredStars
            .filter(s => s.student_id === student.id)
            .reduce((sum, s) => sum + s.count, 0);
          const studentOtherTallies = filteredOtherTallies
            .filter(o => o.student_id === student.id)
            .reduce((sum, o) => sum + o.count, 0);
          
          const adjustedStudentTallies = Math.max(0, studentTallies - (studentStars * 2));
          const studentNetFine = (adjustedStudentTallies * 10) + (studentOtherTallies * 10);

          allStudentReports.push({
            id: student.id,
            name: student.name,
            rollNumber: student.roll_number,
            class: className,
            photoUrl: student.photo_url,
            tallies: studentTallies,
            stars: studentStars,
            otherTallies: studentOtherTallies,
            netFine: studentNetFine
          });
        }
      }

      setReports(classReports);
      setStudentReports(allStudentReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
    const doc = new jsPDF();
    const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    doc.setFontSize(18);
    doc.text('Performance Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`Class: ${selectedClass}`, 14, 30);
    doc.text(`Month: ${month}`, 14, 37);

    if (viewMode === 'class') {
      const filteredReports = selectedClass === 'ALL'
        ? reports
        : reports.filter(r => r.class === selectedClass);

      const tableData = filteredReports.map(report => [
        report.class,
        report.totalTallies.toString(),
        report.totalStars.toString(),
        report.totalOtherTallies.toString(),
        `₹${report.netFine}`
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Class', 'Tallies', 'Stars', 'Other Tallies', 'Net Fine']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] }
      });
    } else {
      const filteredStudents = selectedClass === 'ALL'
        ? studentReports
        : studentReports.filter(s => s.class === selectedClass);

      const tableData = filteredStudents.map(student => [
        student.name,
        student.rollNumber,
        student.class,
        student.tallies.toString(),
        student.stars.toString(),
        student.otherTallies.toString(),
        `₹${student.netFine}`
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Name', 'Roll No', 'Class', 'Tallies', 'Stars', 'Other', 'Fine']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] }
      });
    }

    doc.save(`Performance_Report_${selectedClass}_${month}.pdf`);
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Loading reports...</div>;
  }

  const filteredReports = selectedClass === 'ALL'
    ? reports
    : reports.filter(r => r.class === selectedClass);

  const filteredStudents = selectedClass === 'ALL'
    ? studentReports
    : studentReports.filter(s => s.class === selectedClass);

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
        Performance Reports
      </h1>

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Filter by Class
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
                <option value="ALL">All Classes</option>
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
                View Mode
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setViewMode('class')}
                  style={{
                    padding: '10px 16px',
                    background: viewMode === 'class' ? '#16a34a' : '#e5e7eb',
                    color: viewMode === 'class' ? '#ffffff' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  By Class
                </button>
                <button
                  onClick={() => setViewMode('student')}
                  style={{
                    padding: '10px 16px',
                    background: viewMode === 'student' ? '#16a34a' : '#e5e7eb',
                    color: viewMode === 'student' ? '#ffffff' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  By Student
                </button>
              </div>
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
            Download PDF
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {viewMode === 'class' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Class</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Tallies</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stars</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Other Tallies</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Net Fine</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.class} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px', fontWeight: '600', color: '#1f2937' }}>{report.class}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#ef4444', fontWeight: '600' }}>{report.totalTallies}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#fbbf24', fontWeight: '600' }}>{report.totalStars}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#f97316', fontWeight: '600' }}>{report.totalOtherTallies}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#16a34a', fontWeight: '600' }}>₹{report.netFine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Student</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Roll No</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Class</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Tallies</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stars</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Other Tallies</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Net Fine</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {student.photoUrl ? (
                          <img
                            src={student.photoUrl}
                            alt={student.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600',
                            color: '#6b7280'
                          }}>
                            {student.name.charAt(0)}
                          </div>
                        )}
                        <span style={{ fontWeight: '600', color: '#1f2937' }}>{student.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>{student.rollNumber}</td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>{student.class}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#ef4444', fontWeight: '600' }}>{student.tallies}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#fbbf24', fontWeight: '600' }}>{student.stars}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#f97316', fontWeight: '600' }}>{student.otherTallies}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: '#16a34a', fontWeight: '600' }}>₹{student.netFine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {((viewMode === 'class' && filteredReports.length === 0) || (viewMode === 'student' && filteredStudents.length === 0)) && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No data available for the selected filter
          </div>
        )}
      </div>
    </div>
  );
}
