import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { VoiceOfDirector, Class, ClassReason, PerformanceReason } from '../types';
import { useClasses } from '../contexts/ClassesContext';

type TabType = 'voice' | 'classes' | 'reasons' | 'mentors' | 'reset';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('voice');
  const [confirmText, setConfirmText] = useState('');
  const [resetType, setResetType] = useState<'classes' | 'morning_bliss' | 'attendance' | null>(null);
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const ADMIN_PASSWORD = 'performate@123';

  useEffect(() => {
    if (isAuthenticated) {
      fetchMentors();
    }
  }, [isAuthenticated]);

  async function fetchMentors() {
    try {
      const data = await api.admin.getMentors();
      setMentors(data || []);
    } catch (error) {
      console.error('Error fetching mentors:', error);
      setMentors([]);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword('');
    }
  }

  async function handleReset() {
    if (confirmText !== 'RESET' || !resetType) return;

    setLoading(true);
    try {
      await api.admin.resetMonthly();
      alert('Reset completed successfully!');
      setConfirmText('');
      setResetType(null);
    } catch (error) {
      console.error('Error resetting:', error);
      alert('Error during reset. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '40px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            Admin Panel
          </h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '16px'
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
        Admin Panel
      </h1>

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {(['voice', 'classes', 'reasons', 'mentors', 'reset'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab ? '#16a34a' : '#ffffff',
              color: activeTab === tab ? '#ffffff' : '#1f2937',
              border: '2px solid #16a34a',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'voice' ? 'Voice of Director' : tab}
          </button>
        ))}
      </div>

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        {activeTab === 'voice' && <VoiceOfDirectorTab />}
        {activeTab === 'classes' && <ClassesTab />}
        {activeTab === 'reasons' && <ReasonsTab />}
        {activeTab === 'mentors' && <MentorsTab mentors={mentors} onRefresh={fetchMentors} />}
        {activeTab === 'reset' && (
          <ResetTab
            resetType={resetType}
            setResetType={setResetType}
            confirmText={confirmText}
            setConfirmText={setConfirmText}
            loading={loading}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}

function VoiceOfDirectorTab() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchMessage();
  }, []);

  async function fetchMessage() {
    try {
      const data = await api.admin.getVoiceOfDirector();
      if (data) {
        setTitle(data.title || '');
        setMessage(data.message || '');
      }
    } catch (error) {
      console.error('Error fetching message:', error);
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      await api.admin.updateVoiceOfDirector({ title, message });
      setStatus('Message saved successfully!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error saving message:', error);
      setStatus('Error saving message');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
        Voice of Director
      </h2>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            resize: 'vertical'
          }}
        />
      </div>
      {status && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          background: status.includes('Error') ? '#fee2e2' : '#d1fae5',
          color: status.includes('Error') ? '#991b1b' : '#065f46'
        }}>
          {status}
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={loading}
        style={{
          padding: '12px 24px',
          background: '#16a34a',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: '600',
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? 'Saving...' : 'Save Message'}
      </button>
    </div>
  );
}

function ClassesTab() {
  const { classes, refreshClasses } = useClasses();
  const [newClassName, setNewClassName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAddClass() {
    if (!newClassName.trim()) return;
    setLoading(true);
    try {
      await api.classes.create({ name: newClassName.toUpperCase() });
      setNewClassName('');
      refreshClasses();
    } catch (error) {
      console.error('Error adding class:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleClass(classId: string, currentActive: boolean) {
    try {
      await api.classes.update(classId, { is_active: !currentActive });
      refreshClasses();
    } catch (error) {
      console.error('Error toggling class:', error);
    }
  }

  async function handleDeleteClass(classId: string) {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      await api.classes.delete(classId);
      refreshClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
        Manage Classes
      </h2>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          placeholder="New class name..."
          style={{
            flex: 1,
            padding: '12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <button
          onClick={handleAddClass}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: '#16a34a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Add Class
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {classes.map(cls => (
          <div
            key={cls.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: cls.is_active ? '#d1fae5' : '#f3f4f6',
              borderRadius: '8px'
            }}
          >
            <span style={{ fontWeight: '600' }}>{cls.name}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleToggleClass(cls.id, cls.is_active)}
                style={{
                  padding: '6px 12px',
                  background: cls.is_active ? '#fbbf24' : '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {cls.is_active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => handleDeleteClass(cls.id)}
                style={{
                  padding: '6px 12px',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReasonsTab() {
  const [classReasons, setClassReasons] = useState<ClassReason[]>([]);
  const [performanceReasons, setPerformanceReasons] = useState<PerformanceReason[]>([]);
  const [newReason, setNewReason] = useState('');
  const [newTally, setNewTally] = useState('1');
  const [reasonType, setReasonType] = useState<'class' | 'performance'>('class');

  useEffect(() => {
    fetchReasons();
  }, []);

  async function fetchReasons() {
    try {
      const [classData, perfData] = await Promise.all([
        api.admin.getClassReasons(),
        api.admin.getPerformanceReasons()
      ]);
      setClassReasons(classData.map(r => ({
        id: r.id,
        reason: r.reason,
        tally: r.tally,
        created_at: r.createdAt
      })));
      setPerformanceReasons(perfData.map(r => ({
        id: r.id,
        reason: r.reason,
        tally: r.tally,
        created_at: r.createdAt
      })));
    } catch (error) {
      console.error('Error fetching reasons:', error);
    }
  }

  async function handleAddReason() {
    if (!newReason.trim()) return;
    try {
      if (reasonType === 'class') {
        await api.admin.createClassReason({ reason: newReason, tally: parseInt(newTally) });
      } else {
        await api.admin.createPerformanceReason({ reason: newReason, tally: parseInt(newTally) });
      }
      setNewReason('');
      setNewTally('1');
      fetchReasons();
    } catch (error) {
      console.error('Error adding reason:', error);
    }
  }

  async function handleDeleteReason(id: string, type: 'class' | 'performance') {
    try {
      if (type === 'class') {
        await api.admin.deleteClassReason(id);
      } else {
        await api.admin.deletePerformanceReason(id);
      }
      fetchReasons();
    } catch (error) {
      console.error('Error deleting reason:', error);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
        Manage Reasons
      </h2>
      
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => setReasonType('class')}
            style={{
              padding: '8px 16px',
              background: reasonType === 'class' ? '#ef4444' : '#e5e7eb',
              color: reasonType === 'class' ? '#ffffff' : '#1f2937',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Class Tally
          </button>
          <button
            onClick={() => setReasonType('performance')}
            style={{
              padding: '8px 16px',
              background: reasonType === 'performance' ? '#f97316' : '#e5e7eb',
              color: reasonType === 'performance' ? '#ffffff' : '#1f2937',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Performance
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="Reason..."
            style={{
              flex: 1,
              padding: '10px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <input
            type="number"
            value={newTally}
            onChange={(e) => setNewTally(e.target.value)}
            min="1"
            style={{
              width: '80px',
              padding: '10px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <button
            onClick={handleAddReason}
            style={{
              padding: '10px 20px',
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div>
          <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#ef4444' }}>Class Tally Reasons</h3>
          {classReasons.map(r => (
            <div key={r.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              background: '#fee2e2',
              borderRadius: '6px',
              marginBottom: '8px'
            }}>
              <span>{r.reason} (+{r.tally})</span>
              <button
                onClick={() => handleDeleteReason(r.id, 'class')}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        
        <div>
          <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#f97316' }}>Performance Reasons</h3>
          {performanceReasons.map(r => (
            <div key={r.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              background: '#ffedd5',
              borderRadius: '6px',
              marginBottom: '8px'
            }}>
              <span>{r.reason} (+{r.tally})</span>
              <button
                onClick={() => handleDeleteReason(r.id, 'performance')}
                style={{
                  background: '#f97316',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MentorsTab({ mentors, onRefresh }: { mentors: any[]; onRefresh: () => void }) {
  async function handleRemoveMentor(mentorId: string) {
    if (!confirm('Are you sure you want to remove this mentor?')) return;
    try {
      await api.admin.deleteMentor(mentorId);
      onRefresh();
    } catch (error) {
      console.error('Error removing mentor:', error);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
        Manage Mentors
      </h2>
      {mentors.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No mentors found</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {mentors.map(mentor => (
            <div
              key={mentor.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#f9fafb',
                borderRadius: '8px'
              }}
            >
              <div>
                <p style={{ fontWeight: '600' }}>{mentor.fullName || mentor.full_name}</p>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>{mentor.email}</p>
              </div>
              <button
                onClick={() => handleRemoveMentor(mentor.id)}
                style={{
                  padding: '6px 12px',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResetTab({
  resetType,
  setResetType,
  confirmText,
  setConfirmText,
  loading,
  onReset
}: {
  resetType: 'classes' | 'morning_bliss' | 'attendance' | null;
  setResetType: (type: 'classes' | 'morning_bliss' | 'attendance' | null) => void;
  confirmText: string;
  setConfirmText: (text: string) => void;
  loading: boolean;
  onReset: () => void;
}) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#ef4444' }}>
        Monthly Reset
      </h2>
      <p style={{ marginBottom: '20px', color: '#6b7280' }}>
        This will reset all performance data (tallies, stars, attendance) for the new month. This action cannot be undone.
      </p>
      
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontWeight: '500', marginBottom: '8px' }}>Type "RESET" to confirm:</p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type RESET..."
          style={{
            width: '200px',
            padding: '10px',
            border: '2px solid #ef4444',
            borderRadius: '8px'
          }}
        />
      </div>

      <button
        onClick={onReset}
        disabled={confirmText !== 'RESET' || loading}
        style={{
          padding: '12px 24px',
          background: confirmText === 'RESET' ? '#ef4444' : '#e5e7eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          cursor: confirmText === 'RESET' ? 'pointer' : 'not-allowed',
          fontWeight: '600'
        }}
      >
        {loading ? 'Resetting...' : 'Reset All Data'}
      </button>
    </div>
  );
}
