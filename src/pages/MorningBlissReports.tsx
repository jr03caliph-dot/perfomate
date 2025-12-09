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
      const params: any = { start_date: fromDate, end_date: toDate };
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

  function formatDateForTitle(dateStr: string): string {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  function generatePDF() {
    const doc = new jsPDF();
    const scores = viewMode === 'daily' ? dailyScores : customRangeScores;
    
    const dateTitle = viewMode === 'daily' 
      ? formatDateForTitle(selectedDate)
      : `${formatDateForTitle(fromDate)} - ${formatDateForTitle(toDate)}`;
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text(`MORNING BLISS - ${dateTitle}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    const tableData = scores.map((score) => [
      score.class,
      (score as any).students?.name || 'N/A',
      score.topic,
      score.score,
      score.evaluated_by || (score as any).evaluatedBy || 'N/A'
    ]);

    autoTable(doc, {
      head: [['Class', 'Name of Students', 'Topic', 'Score (10)', 'Evaluated by']],
      body: tableData,
      startY: 32,
      styles: { 
        fontSize: 10,
        cellPadding: 6,
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      headStyles: { 
        fillColor: [70, 130, 180],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [220, 235, 250]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { fontStyle: 'bold' },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'center', fontStyle: 'bold', cellWidth: 30 }
      }
    });

    doc.save(`morning-bliss-${viewMode === 'daily' ? selectedDate : `${fromDate}-to-${toDate}`}.pdf`);
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
              <tr style={{ background: '#4682B4', color: '#ffffff' }}>
                <th style={{ padding: '12px', textAlign: 'center' }}>Class</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Name of Students</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Topic</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Score (10)</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Evaluated by</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Winner</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score, index) => (
                <tr
                  key={score.id || index}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    background: score.is_daily_winner ? '#fef3c7' : index % 2 === 0 ? '#ffffff' : '#dceafa'
                  }}
                >
                  <td style={{ padding: '12px', textAlign: 'center' }}>{score.class}</td>
                  <td style={{ padding: '12px', fontWeight: '600' }}>
                    {(score as any).students?.name || 'N/A'}
                  </td>
                  <td style={{ padding: '12px' }}>{score.topic}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                    {score.score}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                    {score.evaluated_by || (score as any).evaluatedBy || 'N/A'}
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
