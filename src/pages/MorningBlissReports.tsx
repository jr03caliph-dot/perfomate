import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { MorningBliss } from '../types';
import { useClasses } from '../contexts/ClassesContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ViewMode = 'daily' | 'custom';

export default function MorningBlissReports() {
  const { activeClasses, loading: classesLoading } = useClasses();
  
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
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
  
  const [dailyScores, setDailyScores] = useState<MorningBliss[]>([]);
  const [customRangeScores, setCustomRangeScores] = useState<MorningBliss[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (classesLoading) return;
    
    if (viewMode === 'daily') {
      fetchDailyScores();
    } else if (viewMode === 'custom') {
      fetchCustomRangeScores();
    }
  }, [viewMode, selectedDate, fromDate, toDate, selectedClass, classesLoading]);

  async function fetchDailyScores() {
    setLoading(true);
    try {
      const params: any = { date: selectedDate };
      if (selectedClass !== 'ALL') {
        params.class = selectedClass;
      }
      const data = await api.morningBliss.getAll(params);
      setDailyScores(data);
    } catch (error) {
      console.error('Error fetching daily scores:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomRangeScores() {
    setLoading(true);
    try {
      const params: any = { from_date: fromDate, to_date: toDate };
      if (selectedClass !== 'ALL') {
        params.class = selectedClass;
      }
      const data = await api.morningBliss.getAll(params);
      setCustomRangeScores(data);
    } catch (error) {
      console.error('Error fetching custom range scores:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleDailyWinner(scoreId: string, currentValue: boolean) {
    try {
      await api.morningBliss.setWinner(scoreId, !currentValue);
      if (viewMode === 'daily') {
        fetchDailyScores();
      } else {
        fetchCustomRangeScores();
      }
    } catch (error) {
      console.error('Error toggling winner:', error);
    }
  }

  function generatePDF() {
    const doc = new jsPDF();
    const scores = viewMode === 'daily' ? dailyScores : customRangeScores;
    
    doc.setFontSize(18);
    doc.text('Morning Bliss Report', 14, 22);
    
    doc.setFontSize(12);
    if (viewMode === 'daily') {
      doc.text(`Date: ${selectedDate}`, 14, 32);
    } else {
      doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, 32);
    }
    if (selectedClass !== 'ALL') {
      doc.text(`Class: ${selectedClass}`, 14, 40);
    }

    const tableData = scores.map((score, index) => [
      index + 1,
      (score as any).students?.name || 'N/A',
      score.class,
      score.topic,
      score.score,
      score.stars_awarded || 0,
      score.is_daily_winner ? 'Yes' : 'No'
    ]);

    autoTable(doc, {
      head: [['#', 'Student', 'Class', 'Topic', 'Score', 'Stars', 'Winner']],
      body: tableData,
      startY: selectedClass !== 'ALL' ? 48 : 40,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [22, 163, 74] }
    });

    doc.save(`morning-bliss-report-${viewMode === 'daily' ? selectedDate : `${fromDate}-to-${toDate}`}.pdf`);
  }

  const scores = viewMode === 'daily' ? dailyScores : customRangeScores;

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
        Morning Bliss Reports
      </h1>

      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setViewMode('daily')}
          style={{
            padding: '12px 24px',
            background: viewMode === 'daily' ? '#16a34a' : '#ffffff',
            color: viewMode === 'daily' ? '#ffffff' : '#1f2937',
            border: '2px solid #16a34a',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Daily View
        </button>
        <button
          onClick={() => setViewMode('custom')}
          style={{
            padding: '12px 24px',
            background: viewMode === 'custom' ? '#16a34a' : '#ffffff',
            color: viewMode === 'custom' ? '#ffffff' : '#1f2937',
            border: '2px solid #16a34a',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Custom Range
        </button>
      </div>

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {viewMode === 'daily' ? (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  padding: '10px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </div>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    padding: '10px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    padding: '10px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{
                padding: '10px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                minWidth: '120px'
              }}
            >
              <option value="ALL">All Classes</option>
              {activeClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <button
            onClick={generatePDF}
            disabled={scores.length === 0}
            style={{
              padding: '10px 20px',
              background: scores.length === 0 ? '#e5e7eb' : '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: scores.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            Download PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: '#6b7280' }}>Loading...</p>
        </div>
      ) : scores.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '60px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <p style={{ color: '#6b7280' }}>No scores found for the selected criteria</p>
        </div>
      ) : (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#16a34a', color: '#ffffff' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>#</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Student</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Class</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Topic</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Score</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Stars</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Winner</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score, index) => (
                <tr
                  key={score.id || index}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    background: score.is_daily_winner ? '#fef3c7' : index % 2 === 0 ? '#ffffff' : '#f9fafb'
                  }}
                >
                  <td style={{ padding: '12px' }}>{index + 1}</td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>
                    {(score as any).students?.name || 'N/A'}
                  </td>
                  <td style={{ padding: '12px' }}>{score.class}</td>
                  <td style={{ padding: '12px' }}>{score.topic}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                    {score.score}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {score.stars_awarded > 0 ? '⭐'.repeat(score.stars_awarded) : '-'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => toggleDailyWinner(score.id, score.is_daily_winner)}
                      style={{
                        padding: '4px 12px',
                        background: score.is_daily_winner ? '#fbbf24' : '#e5e7eb',
                        color: score.is_daily_winner ? '#1f2937' : '#6b7280',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      {score.is_daily_winner ? '🏆 Winner' : 'Set Winner'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'pointer'
          }}
        >
          <img
            src={selectedPhoto}
            alt="Photo"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '8px'
            }}
          />
        </div>
      )}
    </div>
  );
}
