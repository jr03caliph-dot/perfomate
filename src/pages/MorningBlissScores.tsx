import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Student, MorningBliss } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useClasses } from '../contexts/ClassesContext';
import { retryOperation } from '../lib/utils';

export default function MorningBlissScores() {
  const { activeClasses } = useClasses();
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [topic, setTopic] = useState('');
  const [score, setScore] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [recentScores, setRecentScores] = useState<MorningBliss[]>([]);
  const { mentor } = useAuth();

  useEffect(() => {
    if (activeClasses.length > 0 && !selectedClass) {
      setSelectedClass(activeClasses[0]);
    }
  }, [activeClasses, selectedClass]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
      fetchRecentScores();
    }
  }, [selectedClass]);

  useEffect(() => {
    // Subscribe to realtime updates for morning_bliss
    const channel = supabase
      .channel('morning_bliss_scores_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'morning_bliss' },
        () => {
          if (selectedClass) {
            fetchRecentScores();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClass]);

  async function fetchStudents() {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('class', selectedClass)
      .order('name');

    if (data) {
      setStudents(data);
      if (data.length > 0) setSelectedStudent(data[0].id);
    }
  }

  async function fetchRecentScores() {
    if (!selectedClass) return;
    
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('morning_bliss')
      .select('*, students(name)')
      .eq('class', selectedClass)
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setRecentScores(data as MorningBliss[]);
    }
  }

  function calculateStars(scoreValue: number): number {
    if (scoreValue === 10.0) return 3;
    if (scoreValue >= 9.5) return 2;
    if (scoreValue >= 9.0) return 1;
    return 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await retryOperation(async () => {
        const scoreValue = parseFloat(score);
        if (scoreValue < 0 || scoreValue > 10) {
          throw new Error('Score must be between 0 and 10');
        }

        const photoUrls: string[] = [];

        // Upload photos with retry
        for (const file of photoFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('morning-bliss-photos')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('morning-bliss-photos')
            .getPublicUrl(fileName);

          photoUrls.push(urlData.publicUrl);
        }

        const today = new Date().toISOString().split('T')[0];
        const starsAwarded = calculateStars(scoreValue);
        const isTopper = scoreValue >= 9.5;
        const isDailyWinner = false;

        // Insert Morning Bliss record with stars
        const { error: insertError } = await supabase.from('morning_bliss').insert([{
          student_id: selectedStudent,
          class: selectedClass,
          topic,
          score: scoreValue,
          stars: starsAwarded,
          evaluated_by: mentor?.short_form || '',
          evaluator_id: mentor?.id,
          photo_urls: photoUrls,
          date: today,
          is_daily_winner: isDailyWinner,
          is_topper: isTopper
        }]);

        if (insertError) throw insertError;

        // Update stars table if stars were awarded
        if (starsAwarded > 0) {
          const { data: existingStar } = await supabase
            .from('stars')
            .select('*')
            .eq('student_id', selectedStudent)
            .eq('source', 'morning_bliss')
            .maybeSingle();

          if (existingStar) {
            await supabase
              .from('stars')
              .update({ count: existingStar.count + starsAwarded })
              .eq('id', existingStar.id);
          } else {
            await supabase.from('stars').insert([{
              student_id: selectedStudent,
              count: starsAwarded,
              source: 'morning_bliss',
              added_by: mentor?.id
            }]);
          }
        }

        const starMessage = starsAwarded > 0 
          ? `Score added successfully! ${'⭐'.repeat(starsAwarded)} (${starsAwarded} star${starsAwarded > 1 ? 's' : ''}) awarded automatically.`
          : 'Score added successfully!';
        setMessage(starMessage);
        
        // Fetch recent scores immediately to show new entry with stars
        fetchRecentScores();
      }, 2);

      setTopic('');
      setScore('');
      setPhotoFiles([]);
      const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage('Error: ' + error.message);
      } else {
        setMessage('Error adding score');
      }
      // Retry immediately
      handleSubmit(e).catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
        Morning Bliss Scores
      </h1>

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '700px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{
          background: '#dcfce7',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          border: '2px solid #16a34a'
        }}>
          <p style={{ fontSize: '14px', color: '#166534', fontWeight: '600', marginBottom: '8px' }}>
            Auto Star Logic:
          </p>
          <ul style={{ fontSize: '13px', color: '#166534', marginLeft: '20px' }}>
            <li>Score 9.0 → ⭐ (1 Star)</li>
            <li>Score 9.5 → ⭐⭐ (2 Stars)</li>
            <li>Score 10.0 → ⭐⭐⭐ (3 Stars)</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
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
                width: '100%',
                padding: '12px',
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

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Student
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} (Roll: {student.roll_number})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Score (0-10)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Evaluated By
            </label>
            <input
              type="text"
              value={mentor?.short_form || ''}
              disabled
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                background: '#f9fafb',
                color: '#6b7280'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Upload Photos (Optional, Multiple)
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {message && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '24px',
              background: message.includes('Error') ? '#fee2e2' : '#d1fae5',
              color: message.includes('Error') ? '#991b1b' : '#065f46',
              fontSize: '14px'
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
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
            {loading ? 'Saving...' : 'Add Score'}
          </button>
        </form>
      </div>

      {/* Recent Scores Table */}
      {selectedClass && (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          marginTop: '32px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
            Today's Scores ({selectedClass})
          </h2>
          
          {recentScores.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              No scores added today for {selectedClass}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Student</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Topic</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Score</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Stars</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Evaluated By</th>
                  </tr>
                </thead>
                <tbody>
                  {recentScores.map((score) => (
                    <tr key={score.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#1f2937' }}>
                        {(score as any).students?.name || 'Unknown'}
                      </td>
                      <td style={{ padding: '12px', color: '#6b7280' }}>{score.topic}</td>
                      <td style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: score.score >= 9.5 ? '#16a34a' : score.score >= 9 ? '#fbbf24' : '#6b7280',
                        fontWeight: '600',
                        fontSize: '16px'
                      }}>
                        {score.score}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px' }}>
                        {score.stars ? '⭐'.repeat(score.stars) : '-'}
                      </td>
                      <td style={{ padding: '12px', color: '#6b7280' }}>{score.evaluated_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
