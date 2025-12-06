import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useClasses } from '../contexts/ClassesContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [selectedClass, setSelectedClass] = useState('ALL');
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

      for (const className of activeClasses) {
        const { data: students } = await supabase
          .from('students')
          .select('id')
          .eq('class', className);

        if (!students || students.length === 0) continue;

        const studentIds = students.map(s => s.id);

        const [talliesRes, starsRes, otherTalliesRes] = await Promise.all([
          supabase.from('tallies').select('count').in('student_id', studentIds),
          supabase.from('stars').select('count').in('student_id', studentIds),
          supabase.from('other_tallies').select('count').in('student_id', studentIds)
        ]);

        const totalTallies = talliesRes.data?.reduce((sum, t) => sum + t.count, 0) || 0;
        const totalStars = starsRes.data?.reduce((sum, s) => sum + s.count, 0) || 0;
        const totalOtherTallies = otherTalliesRes.data?.reduce((sum, o) => sum + o.count, 0) || 0;

        const adjustedTallies = Math.max(0, totalTallies - (totalStars * 2));
        const netFine = (adjustedTallies * 10) + (totalOtherTallies * 10);

        classReports.push({
          class: className,
          totalTallies,
          totalStars,
          totalOtherTallies,
          netFine
        });
      }

      setReports(classReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
    const doc = new jsPDF();
    const filteredReports = selectedClass === 'ALL'
      ? reports
      : reports.filter(r => r.class === selectedClass);

    const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    doc.setFontSize(18);
    doc.text('Performance Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`Class: ${selectedClass}`, 14, 30);
    doc.text(`Month: ${month}`, 14, 37);

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

    doc.save(`Performance_Report_${selectedClass}_${month}.pdf`);
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Loading reports...</div>;
  }

  const filteredReports = selectedClass === 'ALL'
    ? reports
    : reports.filter(r => r.class === selectedClass);

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
        </div>

        {filteredReports.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No data available for the selected filter
          </div>
        )}
      </div>
    </div>
  );
}
