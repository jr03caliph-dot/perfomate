import { useEffect, useState, useRef } from 'react';
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const { mentor } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage('Error: Photo must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function removePhoto() {
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function downloadPhoto(photoUrl: string, studentName: string) {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = `morning-bliss-${studentName}-${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      const photoUrls = photoPreview ? [photoPreview] : [];

      await api.morningBliss.create({
        student_id: selectedStudent,
        class: selectedClass,
        date: today,
        topic,
        score: scoreValue,
        evaluated_by: mentor.short_form,
        photo_urls: photoUrls,
        is_topper: isTopper,
        is_daily_winner: false,
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
      setPhotoPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Photo (Optional)
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  background: '#f9fafb'
                }}
              />
              {photoPreview && (
                <div style={{ marginTop: '12px', position: 'relative', display: 'inline-block' }}>
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    style={{ 
                      width: '120px', 
                      height: '120px', 
                      objectFit: 'cover', 
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb'
                    }} 
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    x
                  </button>
                </div>
              )}
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
              {recentScores.map((scoreItem, index) => {
                const student = students.find(s => s.id === scoreItem.student_id) || students.find(s => s.id === (scoreItem as any).studentId);
                const studentName = student?.name || (scoreItem as any).students?.name || 'Student';
                const photoUrls = scoreItem.photo_urls || (scoreItem as any).photoUrls || [];
                
                return (
                  <div
                    key={scoreItem.id || index}
                    style={{
                      padding: '12px 16px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: photoUrls.length > 0 ? '12px' : '0'
                    }}>
                      <div>
                        <p style={{ fontWeight: '600' }}>{studentName}</p>
                        <p style={{ fontSize: '12px', color: '#6b7280' }}>{scoreItem.topic}</p>
                        <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                          Evaluated by: {scoreItem.evaluated_by || (scoreItem as any).evaluatedBy || 'N/A'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>
                          {scoreItem.score}
                        </p>
                        {scoreItem.is_topper && (
                          <p style={{ fontSize: '12px', color: '#fbbf24' }}>
                            Topper
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {photoUrls.length > 0 && (
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        flexWrap: 'wrap',
                        paddingTop: '8px',
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        {photoUrls.map((photoUrl, photoIndex) => (
                          <div key={photoIndex} style={{ position: 'relative' }}>
                            <img 
                              src={photoUrl} 
                              alt={`Score photo ${photoIndex + 1}`}
                              onClick={() => setExpandedPhoto(photoUrl)}
                              style={{ 
                                width: '60px', 
                                height: '60px', 
                                objectFit: 'cover', 
                                borderRadius: '6px',
                                cursor: 'pointer',
                                border: '1px solid #d1d5db'
                              }} 
                            />
                            <button
                              onClick={() => downloadPhoto(photoUrl, studentName)}
                              style={{
                                position: 'absolute',
                                bottom: '2px',
                                right: '2px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '4px',
                                background: 'rgba(0,0,0,0.6)',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px'
                              }}
                              title="Download"
                            >
                              ↓
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {expandedPhoto && (
        <div 
          onClick={() => setExpandedPhoto(null)}
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
            padding: '20px'
          }}
        >
          <div style={{ 
            position: 'relative', 
            maxWidth: '90%', 
            maxHeight: '90%' 
          }}>
            <img 
              src={expandedPhoto} 
              alt="Expanded view"
              style={{ 
                maxWidth: '100%', 
                maxHeight: '80vh', 
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }} 
            />
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              marginTop: '16px'
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadPhoto(expandedPhoto, 'morning-bliss');
                }}
                style={{
                  padding: '10px 20px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Download Image
              </button>
              <button
                onClick={() => setExpandedPhoto(null)}
                style={{
                  padding: '10px 20px',
                  background: '#6b7280',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
