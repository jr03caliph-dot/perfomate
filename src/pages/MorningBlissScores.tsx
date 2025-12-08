import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Student, MorningBliss } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useClasses } from '../contexts/ClassesContext';

export default function MorningBlissScores() {
  const { activeClasses } = useClasses();
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [topic, setTopic] = useState('');
  const [score, setScore] = useState('');
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

  async function fetchStudents() {
    try {
      const data = await api.students.getAll(selectedClass);
      setStudents(data);
      if (data.length > 0) setSelectedStudent(data[0].id);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  }

  async function fetchRecentScores() {
    if (!selectedClass) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await api.morningBliss.getAll({ date: today, class: selectedClass });
      setRecentScores(data.slice(0, 10));
    } catch (error) {
      console.error('Error fetching recent scores:', error);
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
      const scoreValue = parseFloat(score);
      if (scoreValue < 0 || scoreValue > 10) {
        throw new Error('Score must be between 0 and 10');
      }

      const today = new Date().toISOString().split('T')[0];
      const starsAwarded = calculateStars(scoreValue);
      const isTopper = scoreValue >= 9.5;

      const student = students.find(s => s.id === selectedStudent);
      if (!student || !mentor) {
        throw new Error('Invalid student or mentor');
      }

      await api.morningBliss.create({
        student_id: selectedStudent,
        class: selectedClass,
        date: today,
        topic,
        score: scoreValue,
        stars_awarded: starsAwarded,
        is_topper: isTopper,
        is_daily_winner: false,
        added_by: mentor.id
      });

      if (starsAwarded > 0) {
        await api.stars.create({
          student_id: selectedStudent,
          count: starsAwarded,
          source: 'morning_bliss',
          added_by: mentor.id,
          class: selectedClass,
          mentor_short_form: mentor.short_form
        });
      }

      setMessage('Score added successfully!');
      setTopic('');
      setScore('');
      fetchRecentScores();
    } catch (error: unknown) {
      console.error('Error adding score:', error);
      if (error instanceof Error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage('Error adding score');
      }
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
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
        flexWrap: 'wrap'
      }}>
        {activeClasses.map(cls => (
          <button
            key={cls}
            onClick={() => setSelectedClass(cls)}
            style={{
              padding: '12px 24px',
              background: selectedClass === cls ? '#16a34a' : '#ffffff',
              color: selectedClass === cls ? '#ffffff' : '#1f2937',
              border: '2px solid #16a34a',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {cls}
          </button>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
            Add Score
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
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
                  borderRadius: '8px'
                }}
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                placeholder="Enter topic..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Score (0-10)
              </label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                required
                min="0"
                max="10"
                step="0.5"
                placeholder="Enter score..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </div>

            {message && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                background: message.includes('Error') ? '#fee2e2' : '#d1fae5',
                color: message.includes('Error') ? '#991b1b' : '#065f46'
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
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Adding...' : 'Add Score'}
            </button>
          </form>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
            Today's Scores
          </h2>

          {recentScores.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
              No scores recorded today
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentScores.map((score, index) => (
                <div
                  key={score.id || index}
                  style={{
                    padding: '12px 16px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <p style={{ fontWeight: '600' }}>{(score as any).students?.name || 'Student'}</p>
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>{score.topic}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>
                      {score.score}
                    </p>
                    {score.stars_awarded > 0 && (
                      <p style={{ fontSize: '12px', color: '#fbbf24' }}>
                        {'⭐'.repeat(score.stars_awarded)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
