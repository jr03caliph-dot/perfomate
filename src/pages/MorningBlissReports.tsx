import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MorningBliss, MagazineScore, Student } from '../types';
import { useClasses } from '../contexts/ClassesContext';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ViewMode = 'daily' | 'custom' | 'magazine';

interface StudentReport {
  studentId: string;
  studentName: string;
  className: string;
  totalScore: number;
  totalEntries: number;
  percentage: number;
  magazineScore: number;
  magazineEntries: number;
  combinedTotal: number;
  combinedPercentage: number;
}

export default function MorningBlissReports() {
  const { activeClasses, loading: classesLoading } = useClasses();
  const { mentor } = useAuth();
  
  // View mode and filters
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Custom Range View filters
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  
  // Magazine Score filters
  const [magazineFromDate, setMagazineFromDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [magazineToDate, setMagazineToDate] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });
  const [magazineSelectedClass, setMagazineSelectedClass] = useState<string>('ALL');
  
  // Data states
  const [dailyScores, setDailyScores] = useState<MorningBliss[]>([]);
  const [customRangeScores, setCustomRangeScores] = useState<MorningBliss[]>([]);
  const [magazineScores, setMagazineScores] = useState<MagazineScore[]>([]);
  const [magazineBlissScores, setMagazineBlissScores] = useState<MorningBliss[]>([]);
  const [customRangeReports, setCustomRangeReports] = useState<StudentReport[]>([]);
  const [magazineReports, setMagazineReports] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Magazine score popup
  const [showMagazinePopup, setShowMagazinePopup] = useState(false);
  const [magazineStudentId, setMagazineStudentId] = useState('');
  const [magazineScore, setMagazineScore] = useState('');
  const [magazineMaxScore, setMagazineMaxScore] = useState('20');
  const [magazineScoreDate, setMagazineScoreDate] = useState(new Date().toISOString().split('T')[0]);
  const [magazineStudents, setMagazineStudents] = useState<Student[]>([]);
  const [editingMagazineScore, setEditingMagazineScore] = useState<MagazineScore | null>(null);
  
  // Photo popup state
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Fetch data based on view mode
  useEffect(() => {
    if (classesLoading) return;
    
    if (viewMode === 'daily') {
      fetchDailyScores();
    } else if (viewMode === 'custom') {
      fetchCustomRangeScores();
    } else if (viewMode === 'magazine') {
      fetchMagazineScores();
      fetchMagazineBlissScores();
      if (magazineSelectedClass !== 'ALL') {
        fetchMagazineStudents();
      }
    }
    
    // Subscribe to realtime updates
    const channel1 = supabase
      .channel('morning_bliss_reports')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'morning_bliss' },
        () => {
          if (viewMode === 'daily') fetchDailyScores();
          if (viewMode === 'custom') fetchCustomRangeScores();
          if (viewMode === 'magazine') {
            fetchMagazineBlissScores();
            calculateMagazineReports();
          }
        }
      )
      .subscribe();
    
    const channel2 = supabase
      .channel('magazine_scores_reports')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'magazine_scores' },
        () => {
          if (viewMode === 'magazine') {
            fetchMagazineScores();
            fetchMagazineBlissScores();
            calculateMagazineReports();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [viewMode, selectedDate, fromDate, toDate, selectedClass, magazineFromDate, magazineToDate, magazineSelectedClass, classesLoading]);

  useEffect(() => {
    if (viewMode === 'custom') {
      calculateCustomRangeReports();
    }
  }, [customRangeScores]);

  useEffect(() => {
    if (viewMode === 'magazine') {
      calculateMagazineReports();
    }
  }, [magazineScores, magazineBlissScores]);

  async function fetchDailyScores() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('morning_bliss')
        .select('*, students(name)')
        .eq('date', selectedDate)
        .order('score', { ascending: false });
      setDailyScores(data || []);
    } catch (error) {
      console.error('Error fetching daily scores:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomRangeScores() {
    setLoading(true);
    try {
      let query = supabase
        .from('morning_bliss')
        .select('*, students(name)')
        .gte('date', fromDate)
        .lte('date', toDate);
      
      if (selectedClass !== 'ALL') {
        query = query.eq('class', selectedClass);
      }
      
      const { data } = await query.order('date', { ascending: false });
      setCustomRangeScores(data || []);
    } catch (error) {
      console.error('Error fetching custom range scores:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMagazineScores() {
    try {
      let query = supabase
        .from('magazine_scores')
        .select('*, students(name)')
        .gte('date', magazineFromDate)
        .lte('date', magazineToDate);
      
      if (magazineSelectedClass !== 'ALL') {
        query = query.eq('class', magazineSelectedClass);
      }
      
      const { data } = await query.order('date', { ascending: false });
      setMagazineScores(data || []);
    } catch (error) {
      console.error('Error fetching magazine scores:', error);
    }
  }

  async function fetchMagazineBlissScores() {
    try {
      let query = supabase
        .from('morning_bliss')
        .select('*, students(name)')
        .gte('date', magazineFromDate)
        .lte('date', magazineToDate);
      
      if (magazineSelectedClass !== 'ALL') {
        query = query.eq('class', magazineSelectedClass);
      }
      
      const { data } = await query.order('date', { ascending: false });
      setMagazineBlissScores(data || []);
    } catch (error) {
      console.error('Error fetching magazine bliss scores:', error);
    }
  }

  async function fetchMagazineStudents() {
    if (magazineSelectedClass === 'ALL') {
      setMagazineStudents([]);
      return;
    }
    
    try {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('class', magazineSelectedClass)
        .order('name');
      setMagazineStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  }

  function calculateCustomRangeReports() {
    const reports: Record<string, StudentReport> = {};
    
    customRangeScores.forEach((score: any) => {
      const studentId = score.student_id;
      const studentName = score.students?.name || 'Unknown';
      const className = score.class;
      
      if (!reports[studentId]) {
        reports[studentId] = {
          studentId,
          studentName,
          className,
          totalScore: 0,
          totalEntries: 0,
          percentage: 0,
          magazineScore: 0,
          magazineEntries: 0,
          combinedTotal: 0,
          combinedPercentage: 0
        };
      }
      
      reports[studentId].totalScore += score.score;
      reports[studentId].totalEntries += 1;
    });
    
    // Calculate percentages
    Object.values(reports).forEach(report => {
      report.percentage = report.totalEntries > 0 
        ? (report.totalScore / (report.totalEntries * 10)) * 100 
        : 0;
    });
    
    const sortedReports = Object.values(reports)
      .sort((a, b) => b.percentage - a.percentage);
    
    setCustomRangeReports(sortedReports);
  }

  function calculateMagazineReports() {
    const reports: Record<string, StudentReport> = {};
    
    // Process Morning Bliss scores
    magazineBlissScores.forEach((score: any) => {
      const studentId = score.student_id;
      const studentName = score.students?.name || 'Unknown';
      const className = score.class;
      
      if (!reports[studentId]) {
        reports[studentId] = {
          studentId,
          studentName,
          className,
          totalScore: 0,
          totalEntries: 0,
          percentage: 0,
          magazineScore: 0,
          magazineEntries: 0,
          combinedTotal: 0,
          combinedPercentage: 0
        };
      }
      
      reports[studentId].totalScore += score.score;
      reports[studentId].totalEntries += 1;
    });
    
    // Process Magazine scores
    magazineScores.forEach((score: any) => {
      const studentId = score.student_id;
      const studentName = score.students?.name || 'Unknown';
      const className = score.class;
      
      if (!reports[studentId]) {
        reports[studentId] = {
          studentId,
          studentName,
          className,
          totalScore: 0,
          totalEntries: 0,
          percentage: 0,
          magazineScore: 0,
          magazineEntries: 0,
          combinedTotal: 0,
          combinedPercentage: 0
        };
      }
      
      reports[studentId].magazineScore += score.score;
      reports[studentId].magazineEntries += 1;
    });
    
    // Calculate percentages and combined totals
    Object.values(reports).forEach(report => {
      report.percentage = report.totalEntries > 0 
        ? (report.totalScore / (report.totalEntries * 10)) * 100 
        : 0;
      
      // Calculate magazine percentage based on actual max scores
      let magazineMaxTotal = 0;
      magazineScores.forEach((s: any) => {
        if (s.student_id === report.studentId) {
          magazineMaxTotal += s.max_score;
        }
      });
      
      report.combinedTotal = report.totalScore + report.magazineScore;
      const combinedMaxTotal = (report.totalEntries * 10) + magazineMaxTotal;
      report.combinedPercentage = combinedMaxTotal > 0 
        ? (report.combinedTotal / combinedMaxTotal) * 100 
        : 0;
    });
    
    const sortedReports = Object.values(reports)
      .sort((a, b) => b.combinedPercentage - a.combinedPercentage);
    
    setMagazineReports(sortedReports);
  }

  async function saveMagazineScore() {
    if (!magazineStudentId || !magazineScore) {
      alert('Please fill all fields');
      return;
    }
    
    setLoading(true);
    try {
      const scoreValue = parseFloat(magazineScore);
      const maxScoreValue = parseFloat(magazineMaxScore);
      
      if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > maxScoreValue) {
        alert(`Score must be between 0 and ${maxScoreValue}`);
        return;
      }
      
      if (editingMagazineScore) {
        // Update existing score
        const { error } = await supabase
          .from('magazine_scores')
          .update({
            score: scoreValue,
            max_score: maxScoreValue,
            date: magazineScoreDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMagazineScore.id);
        
        if (error) throw error;
      } else {
        // Insert new score
        const student = magazineStudents.find(s => s.id === magazineStudentId);
        if (!student) {
          alert('Student not found');
          return;
        }
        
        const { error } = await supabase
          .from('magazine_scores')
          .insert({
            student_id: magazineStudentId,
            class: student.class,
            score: scoreValue,
            max_score: maxScoreValue,
            date: magazineScoreDate,
            added_by: mentor?.id
          });
        
        if (error) throw error;
      }
      
      // Reset form
      setShowMagazinePopup(false);
      setMagazineStudentId('');
      setMagazineScore('');
      setMagazineMaxScore('20');
      setMagazineScoreDate(new Date().toISOString().split('T')[0]);
      setEditingMagazineScore(null);
    } catch (error) {
      console.error('Error saving magazine score:', error);
      alert('Error saving magazine score');
    } finally {
      setLoading(false);
    }
  }

  async function deleteMagazineScore(id: string) {
    if (!confirm('Are you sure you want to delete this magazine score?')) return;
    
    try {
      const { error } = await supabase
        .from('magazine_scores')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting magazine score:', error);
      alert('Error deleting magazine score');
    }
  }

  function openMagazinePopup(score?: MagazineScore) {
    if (score) {
      setEditingMagazineScore(score);
      setMagazineStudentId(score.student_id);
      setMagazineScore(score.score.toString());
      setMagazineMaxScore(score.max_score.toString());
      setMagazineScoreDate(score.date);
    } else {
      setEditingMagazineScore(null);
      setMagazineStudentId('');
      setMagazineScore('');
      setMagazineMaxScore('20');
      setMagazineScoreDate(new Date().toISOString().split('T')[0]);
    }
    setShowMagazinePopup(true);
  }

  function downloadCustomRangePDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Morning Bliss Custom Range Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`From: ${new Date(fromDate).toLocaleDateString()}`, 14, 30);
    doc.text(`To: ${new Date(toDate).toLocaleDateString()}`, 14, 37);
    doc.text(`Class: ${selectedClass === 'ALL' ? 'All Classes' : selectedClass}`, 14, 44);
    
    const tableData = customRangeReports.map(report => [
      report.studentName,
      report.className,
      report.totalScore.toFixed(2),
      report.totalEntries.toString(),
      report.percentage.toFixed(2) + '%'
    ]);
    
    autoTable(doc, {
      startY: 50,
      head: [['Student Name', 'Class', 'Total Score', 'Total Entries', 'Total Percentage']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] }
    });
    
    // Class totals
    const classTotals: Record<string, { total: number; count: number; avgPercentage: number }> = {};
    customRangeReports.forEach(report => {
      if (!classTotals[report.className]) {
        classTotals[report.className] = { total: 0, count: 0, avgPercentage: 0 };
      }
      classTotals[report.className].total += report.totalScore;
      classTotals[report.className].count += report.totalEntries;
      classTotals[report.className].avgPercentage += report.percentage;
    });
    
    let yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('Class Totals:', 14, yPos);
    yPos += 8;
    
    Object.entries(classTotals).forEach(([className, totals]) => {
      const avgPct = totals.avgPercentage / customRangeReports.filter(r => r.className === className).length;
      doc.setFontSize(10);
      doc.text(`${className}: Total Score: ${totals.total.toFixed(2)}, Avg Percentage: ${avgPct.toFixed(2)}%`, 14, yPos);
      yPos += 7;
    });
    
    doc.save(`MorningBliss_${fromDate}_to_${toDate}.pdf`);
  }

  function downloadMagazinePDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Magazine Score Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`From: ${new Date(magazineFromDate).toLocaleDateString()}`, 14, 30);
    doc.text(`To: ${new Date(magazineToDate).toLocaleDateString()}`, 14, 37);
    doc.text(`Class: ${magazineSelectedClass === 'ALL' ? 'All Classes' : magazineSelectedClass}`, 14, 44);
    
    const tableData = magazineReports.map((report, index) => {
      const rank = index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`;
      return [
        rank,
        report.studentName,
        report.className,
        report.totalScore.toFixed(2),
        report.magazineScore.toFixed(2),
        report.combinedTotal.toFixed(2),
        report.combinedPercentage.toFixed(2) + '%'
      ];
    });
    
    autoTable(doc, {
      startY: 50,
      head: [['Rank', 'Student Name', 'Class', 'Morning Bliss', 'Magazine', 'Combined Total', 'Combined %']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] }
    });
    
    doc.save(`MagazineScore_${magazineFromDate}_to_${magazineToDate}.pdf`);
  }

  if (loading && dailyScores.length === 0 && customRangeReports.length === 0 && magazineReports.length === 0) {
    return <div style={{ textAlign: 'center', padding: '60px' }}>Loading reports...</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
        Morning Bliss Reports
      </h1>

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setViewMode('daily')}
            style={{
              padding: '10px 24px',
              background: viewMode === 'daily' ? '#16a34a' : '#ffffff',
              color: viewMode === 'daily' ? '#ffffff' : '#1f2937',
              border: '2px solid #16a34a',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Daily View
          </button>
          <button
            onClick={() => setViewMode('custom')}
            style={{
              padding: '10px 24px',
              background: viewMode === 'custom' ? '#16a34a' : '#ffffff',
              color: viewMode === 'custom' ? '#ffffff' : '#1f2937',
              border: '2px solid #16a34a',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Custom Range View
          </button>
          <button
            onClick={() => {
              setViewMode('magazine');
              if (magazineSelectedClass !== 'ALL') {
                fetchMagazineStudents();
              }
            }}
            style={{
              padding: '10px 24px',
              background: viewMode === 'magazine' ? '#16a34a' : '#ffffff',
              color: viewMode === 'magazine' ? '#ffffff' : '#1f2937',
              border: '2px solid #16a34a',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Magazine Score
          </button>
        </div>

        {/* Daily View */}
        {viewMode === 'daily' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Select Date
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
              <button
                onClick={() => {
                  const doc = new jsPDF();
                  doc.setFontSize(18);
                  doc.text('Morning Bliss Daily Report', 14, 20);
                  doc.setFontSize(12);
                  doc.text(`Date: ${new Date(selectedDate).toLocaleDateString()}`, 14, 30);
                  
                  const dailyWinner = dailyScores.length > 0 ? dailyScores[0] : null;
                  const toppers = dailyScores.filter(s => s.score >= 9.5);
                  
                  if (dailyWinner) {
                    doc.text(`Daily Winner: ${(dailyWinner as any).students?.name} (Score: ${dailyWinner.score})`, 14, 40);
                  }
                  
                  if (toppers.length > 0) {
                    doc.text(`Toppers (≥9.5): ${toppers.length} students`, 14, 47);
                  }
                  
                  const tableData = dailyScores.map(score => [
                    (score as any).students?.name || 'Unknown',
                    score.class,
                    score.date,
                    score.topic || '-',
                    score.score.toString(),
                    score.stars ? '⭐'.repeat(score.stars) : '-',
                    score.evaluated_by
                  ]);
                  
                  autoTable(doc, {
                    startY: 55,
                    head: [['Student Name', 'Class', 'Date', 'Topic', 'Score', 'Stars', 'Evaluated By']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [22, 163, 74] }
                  });
                  
                  const month = new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  const classForFilename = dailyScores.length > 0 ? dailyScores[0].class : 'All';
                  doc.save(`MorningBliss_Report_${classForFilename}_${month.replace(' ', '_')}.pdf`);
                }}
                style={{
                  padding: '12px 24px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                📥 Download PDF
              </button>
            </div>

            {dailyScores.length > 0 && (
              <div style={{ marginBottom: '24px', padding: '16px', background: '#dcfce7', borderRadius: '8px' }}>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#166534', marginBottom: '8px' }}>
                  Daily Winner: {(dailyScores[0] as any).students?.name} (Score: {dailyScores[0].score})
                </p>
                <p style={{ fontSize: '14px', color: '#166534' }}>
                  Toppers (≥9.5): {dailyScores.filter(s => s.score >= 9.5).length} students
                </p>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Student</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Class</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Topic</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Score</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stars</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Evaluated By</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Photos</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyScores.map((score) => (
                    <tr key={score.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '16px', fontWeight: '600', color: '#1f2937' }}>{(score as any).students?.name || 'Unknown'}</td>
                      <td style={{ padding: '16px', color: '#6b7280' }}>{score.class}</td>
                      <td style={{ padding: '16px', color: '#6b7280' }}>{score.topic}</td>
                      <td style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: score.score >= 9.5 ? '#16a34a' : score.score >= 9 ? '#fbbf24' : '#6b7280',
                        fontWeight: '600',
                        fontSize: '18px'
                      }}>
                        {score.score}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {score.stars ? '⭐'.repeat(score.stars) : '-'}
                      </td>
                      <td style={{ padding: '16px', color: '#6b7280' }}>{score.evaluated_by}</td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {score.photo_urls && score.photo_urls.length > 0 ? (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {score.photo_urls.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Photo ${idx + 1}`}
                                onClick={() => setSelectedPhoto(url)}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  objectFit: 'cover',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  border: '2px solid #e5e7eb',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = '#16a34a';
                                  e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {score.is_topper && (
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            background: '#fbbf24',
                            color: '#ffffff',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            Topper
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {dailyScores.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                No scores available for the selected date
              </div>
            )}
          </>
        )}

        {/* Custom Range View */}
        {viewMode === 'custom' && (
          <>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
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
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
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
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Select Class
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
                    minWidth: '150px'
                  }}
                >
                  <option value="ALL">All Classes</option>
                  {activeClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={downloadCustomRangePDF}
                style={{
                  padding: '12px 24px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  height: 'fit-content'
                }}
              >
                📥 Download PDF
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Student Name</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Class</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Total Score</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Total Entries</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Total Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {customRangeReports.map((report) => (
                    <tr key={report.studentId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '16px', fontWeight: '600', color: '#1f2937' }}>{report.studentName}</td>
                      <td style={{ padding: '16px', color: '#6b7280' }}>{report.className}</td>
                      <td style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#1f2937' }}>{report.totalScore.toFixed(2)}</td>
                      <td style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>{report.totalEntries}</td>
                      <td style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#16a34a', fontSize: '16px' }}>
                        {report.percentage.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Class Totals */}
            {customRangeReports.length > 0 && (
              <div style={{ marginTop: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>Class Totals</h3>
                {Object.entries(
                  customRangeReports.reduce((acc, report) => {
                    if (!acc[report.className]) {
                      acc[report.className] = { total: 0, count: 0, percentages: [] };
                    }
                    acc[report.className].total += report.totalScore;
                    acc[report.className].count += report.totalEntries;
                    acc[report.className].percentages.push(report.percentage);
                    return acc;
                  }, {} as Record<string, { total: number; count: number; percentages: number[] }>)
                ).map(([className, totals]) => {
                  const avgPercentage = totals.percentages.reduce((a, b) => a + b, 0) / totals.percentages.length;
                  return (
                    <div key={className} style={{ marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                      <strong>{className}:</strong> Total Score: {totals.total.toFixed(2)}, Total Entries: {totals.count}, Average Percentage: {avgPercentage.toFixed(2)}%
                    </div>
                  );
                })}
              </div>
            )}

            {customRangeReports.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                No scores available for the selected range
              </div>
            )}
          </>
        )}

        {/* Magazine Score View */}
        {viewMode === 'magazine' && (
          <>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={magazineFromDate}
                  onChange={(e) => setMagazineFromDate(e.target.value)}
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
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={magazineToDate}
                  onChange={(e) => setMagazineToDate(e.target.value)}
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
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Select Class
                </label>
                <select
                  value={magazineSelectedClass}
                  onChange={(e) => {
                    setMagazineSelectedClass(e.target.value);
                    if (e.target.value !== 'ALL') {
                      fetchMagazineStudents();
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    minWidth: '150px'
                  }}
                >
                  <option value="ALL">All Classes</option>
                  {activeClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              {magazineSelectedClass !== 'ALL' && (
                <button
                  onClick={() => openMagazinePopup()}
                  style={{
                    padding: '12px 24px',
                    background: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    height: 'fit-content'
                  }}
                >
                  ➕ Add Magazine Score
                </button>
              )}
              <button
                onClick={downloadMagazinePDF}
                style={{
                  padding: '12px 24px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  height: 'fit-content'
                }}
              >
                📥 Download PDF
              </button>
            </div>

            {/* Magazine Scores List (for selected class) */}
            {magazineSelectedClass !== 'ALL' && (
              <div style={{ marginBottom: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                  Magazine Scores for {magazineSelectedClass}
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#ffffff' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Student</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Score</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Max Score</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Date</th>
                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {magazineScores.filter((s: any) => s.class === magazineSelectedClass).map((score: any) => (
                        <tr key={score.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '12px', fontWeight: '600', color: '#1f2937' }}>{score.students?.name || 'Unknown'}</td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#1f2937' }}>{score.score}</td>
                          <td style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>{score.max_score}</td>
                          <td style={{ padding: '12px', color: '#6b7280' }}>{new Date(score.date).toLocaleDateString()}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <button
                              onClick={() => openMagazinePopup(score)}
                              style={{
                                padding: '4px 12px',
                                background: '#3b82f6',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                marginRight: '8px'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteMagazineScore(score.id)}
                              style={{
                                padding: '4px 12px',
                                background: '#ef4444',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Combined Total View */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Rank</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Student Name</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Class</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Morning Bliss</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Magazine</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Combined Total</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Combined %</th>
                  </tr>
                </thead>
                <tbody>
                  {magazineReports.map((report, index) => {
                    const rank = index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`;
                    return (
                      <tr key={report.studentId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{
                          padding: '16px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: index < 3 ? '#fbbf24' : '#6b7280',
                          fontSize: index < 3 ? '18px' : '14px'
                        }}>
                          {rank}
                        </td>
                        <td style={{ padding: '16px', fontWeight: '600', color: '#1f2937' }}>{report.studentName}</td>
                        <td style={{ padding: '16px', color: '#6b7280' }}>{report.className}</td>
                        <td style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                          {report.totalScore.toFixed(2)} ({report.totalEntries})
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                          {report.magazineScore.toFixed(2)} ({report.magazineEntries})
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#1f2937', fontSize: '16px' }}>
                          {report.combinedTotal.toFixed(2)}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#16a34a', fontSize: '16px' }}>
                          {report.combinedPercentage.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {magazineReports.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                No scores available for the selected range
              </div>
            )}
          </>
        )}
      </div>

      {/* Magazine Score Popup */}
      {showMagazinePopup && (
        <div
          onClick={() => setShowMagazinePopup(false)}
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
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
              {editingMagazineScore ? 'Edit Magazine Score' : 'Add Magazine Score'}
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Student
              </label>
              <select
                value={magazineStudentId}
                onChange={(e) => setMagazineStudentId(e.target.value)}
                disabled={!!editingMagazineScore}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="">Select Student</option>
                {magazineStudents.map(student => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Score
              </label>
              <input
                type="number"
                value={magazineScore}
                onChange={(e) => setMagazineScore(e.target.value)}
                min="0"
                max={magazineMaxScore}
                step="0.01"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Max Score (out of)
              </label>
              <input
                type="number"
                value={magazineMaxScore}
                onChange={(e) => setMagazineMaxScore(e.target.value)}
                min="1"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Date
              </label>
              <input
                type="date"
                value={magazineScoreDate}
                onChange={(e) => setMagazineScoreDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowMagazinePopup(false);
                  setEditingMagazineScore(null);
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
              <button
                onClick={saveMagazineScore}
                disabled={loading}
                style={{
                  padding: '10px 24px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Photo Popup Viewer */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'pointer'
          }}
        >
          <img
            src={selectedPhoto}
            alt="Full size"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
          <button
            onClick={() => setSelectedPhoto(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '12px 24px',
              background: '#ffffff',
              color: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ✕ Close
          </button>
        </div>
      )}
    </div>
  );
}
