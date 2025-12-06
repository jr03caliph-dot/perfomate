import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TallyHistory, Mentor } from '../types';
import { useClasses } from '../contexts/ClassesContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface HistoryRecord extends TallyHistory {
  students?: { name: string };
  mentors?: { short_form: string; full_name: string };
}

export default function ViewHistory() {
  const { activeClasses } = useClasses();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedMentor, setSelectedMentor] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mentor list for filter
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchMentors();
    checkAdminAccess();
  }, []);

  useEffect(() => {
    fetchHistory();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('tally_history_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tally_history' },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClass, selectedMentor, fromDate, toDate]);

  async function checkAdminAccess() {
    // For now, allow all mentors to view history
    // Only admin can delete (checked via password in AdminPanel)
    // You can enhance this with proper role-based access control
    setIsAdmin(false); // Set to false by default - only true admins can delete via AdminPanel
  }

  async function fetchMentors() {
    try {
      const { data } = await supabase.from('mentors').select('*').order('short_form');
      setMentors(data || []);
    } catch (error) {
      console.error('Error fetching mentors:', error);
    }
  }

  async function fetchHistory() {
    setLoading(true);
    try {
      let query = supabase
        .from('tally_history')
        .select('*, students(name), mentors(short_form, full_name)')
        .order('created_at', { ascending: false });

      if (selectedClass !== 'ALL') {
        query = query.eq('class', selectedClass);
      }

      if (selectedMentor !== 'ALL') {
        query = query.eq('mentor_id', selectedMentor);
      }

      if (fromDate) {
        query = query.gte('created_at', fromDate + 'T00:00:00');
      }

      if (toDate) {
        query = query.lte('created_at', toDate + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterHistory() {
    if (!searchQuery.trim()) return history;

    const query = searchQuery.toLowerCase();
    return history.filter(record => 
      record.students?.name.toLowerCase().includes(query) ||
      record.reason?.toLowerCase().includes(query) ||
      record.mentor_short_form.toLowerCase().includes(query)
    );
  }

  async function deleteHistoryRecord(id: string) {
    if (!confirm('Are you sure you want to delete this history record?')) return;

    try {
      const { error } = await supabase
        .from('tally_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('History record deleted successfully');
    } catch (error) {
      console.error('Error deleting history record:', error);
      alert('Failed to delete history record');
    }
  }

  async function deleteAllFiltered() {
    if (!confirm('Are you sure you want to delete all filtered history records? This action cannot be undone.')) return;

    try {
      let query = supabase.from('tally_history').delete();

      if (selectedClass !== 'ALL') {
        query = query.eq('class', selectedClass);
      }

      if (selectedMentor !== 'ALL') {
        query = query.eq('mentor_id', selectedMentor);
      }

      if (fromDate) {
        query = query.gte('created_at', fromDate + 'T00:00:00');
      }

      if (toDate) {
        query = query.lte('created_at', toDate + 'T23:59:59');
      }

      const { error } = await query;

      if (error) throw error;
      alert('Filtered history records deleted successfully');
    } catch (error) {
      console.error('Error deleting history records:', error);
      alert('Failed to delete history records');
    }
  }

  function exportHistory() {
    const filteredData = filterHistory();
    
    if (filteredData.length === 0) {
      alert('No history records to export');
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Tally History Report', 14, 20);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
    
    if (selectedClass !== 'ALL') {
      doc.text(`Class: ${selectedClass}`, 14, 37);
    }
    if (selectedMentor !== 'ALL') {
      const mentor = mentors.find(m => m.id === selectedMentor);
      doc.text(`Mentor: ${mentor?.short_form || ''}`, 14, selectedClass !== 'ALL' ? 44 : 37);
    }
    if (fromDate || toDate) {
      doc.text(`Date Range: ${fromDate || 'Beginning'} to ${toDate || 'Today'}`, 14, (selectedClass !== 'ALL' || selectedMentor !== 'ALL') ? 51 : 44);
    }

    const tableData = filteredData.map(record => [
      record.students?.name || 'Unknown',
      record.class,
      record.mentor_short_form,
      record.type === 'class' ? 'Class' : record.type === 'performance' ? 'Performance' : 'Star',
      record.reason || '-',
      record.tally_value > 0 ? `+${record.tally_value}` : record.tally_value.toString(),
      new Date(record.created_at).toLocaleString()
    ]);

    autoTable(doc, {
      startY: (selectedClass !== 'ALL' || selectedMentor !== 'ALL' || fromDate || toDate) ? 58 : 40,
      head: [['Student', 'Class', 'Short Form', 'Type', 'Reason', 'Tally', 'Date & Time']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] },
      styles: { fontSize: 8 }
    });

    doc.save(`TallyHistory_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  const filteredHistory = filterHistory();

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
        View History
      </h1>

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        marginBottom: '24px'
      }}>
        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              Filter by Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{
                width: '100%',
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
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              Filter by Mentor
            </label>
            <select
              value={selectedMentor}
              onChange={(e) => setSelectedMentor(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              <option value="ALL">All Mentors</option>
              {mentors.map(m => (
                <option key={m.id} value={m.id}>{m.short_form} - {m.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
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

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
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
        </div>

        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
            Search by Student Name or Reason
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
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

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={exportHistory}
            style={{
              padding: '10px 24px',
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            📥 Export PDF
          </button>
          {isAdmin && (
            <button
              onClick={deleteAllFiltered}
              style={{
                padding: '10px 24px',
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🗑️ Delete Filtered
            </button>
          )}
        </div>
      </div>

      {/* History Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
          History Records ({filteredHistory.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading...</div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No history records found for the selected filters.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Student</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Class</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Short Form</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Reason</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Tally</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Date & Time</th>
                  {isAdmin && (
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((record) => (
                  <tr key={record.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: '600', color: '#1f2937' }}>{record.students?.name || 'Unknown'}</td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>{record.class}</td>
                    <td style={{ padding: '12px', color: '#16a34a', fontWeight: '600' }}>{record.mentor_short_form}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: record.type === 'class' ? '#fee2e2' : record.type === 'performance' ? '#ffedd5' : '#fef3c7',
                        color: record.type === 'class' ? '#991b1b' : record.type === 'performance' ? '#92400e' : '#78350f'
                      }}>
                        {record.type === 'class' ? 'Class' : record.type === 'performance' ? 'Performance' : 'Star'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>{record.reason || '-'}</td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: record.tally_value > 0 ? '#ef4444' : '#16a34a',
                      fontSize: '16px'
                    }}>
                      {record.tally_value > 0 ? `+${record.tally_value}` : record.tally_value}
                    </td>
                    <td style={{ padding: '12px', color: '#6b7280', fontSize: '14px' }}>
                      {new Date(record.created_at).toLocaleString()}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => deleteHistoryRecord(record.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

