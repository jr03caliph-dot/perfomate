import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { VoiceOfDirector, Class, ClassReason, PerformanceReason, Student } from '../types';
import { useClasses } from '../contexts/ClassesContext';
import { retryOperation, preventDuplicateOperation } from '../lib/utils';

type TabType = 'voice' | 'classes' | 'reasons' | 'mentors' | 'students' | 'reset';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('voice');
  const [confirmText, setConfirmText] = useState('');
  const [resetType, setResetType] = useState<'classes' | 'morning_bliss' | 'attendance' | null>(null);
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingMentor, setRemovingMentor] = useState<string | null>(null);

  const ADMIN_PASSWORD = 'performate@123';

  useEffect(() => {
    if (isAuthenticated) {
      fetchMentors();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      // Subscribe to realtime updates for mentors
      const channel = supabase
        .channel('mentors_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'mentors' },
          () => {
            fetchMentors();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  async function fetchMentors() {
    try {
      const { data, error } = await supabase.from('mentors').select('*').order('created_at');
      if (error) {
        console.error('Error fetching mentors:', error);
        setMentors([]);
        return;
      }
      setMentors(data || []);
    } catch (error) {
      console.error('Error fetching mentors:', error);
      setMentors([]);
    }
  }

  async function handleRemoveMentor(mentorId: string) {
    if (!confirm('Are you sure you want to remove this mentor? They will lose login access immediately.')) {
      return;
    }

    setRemovingMentor(mentorId);
    try {
      await retryOperation(async () => {
        // Delete from mentors table (this will prevent login since AuthContext checks mentors table)
        const { error: mentorError } = await supabase.from('mentors').delete().eq('id', mentorId);
        if (mentorError) throw mentorError;

        // Note: Auth user deletion requires server-side implementation
        // The mentor will not be able to log in since they're removed from mentors table
        fetchMentors();
      }, 5);
    } catch (error) {
      console.error('Error removing mentor:', error);
      // Silently retry
      setTimeout(() => handleRemoveMentor(mentorId), 2000);
    } finally {
      setRemovingMentor(null);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword('');
    }
    // Silently fail if password incorrect
  }

  async function handleReset() {
    if (confirmText !== 'RESET') {
      return; // Silently skip if not confirmed
    }

    if (!resetType) return;

    setLoading(true);
    try {
      await retryOperation(async () => {
        if (resetType === 'classes') {
          await supabase.from('tallies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabase.from('stars').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabase.from('other_tallies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } else if (resetType === 'morning_bliss') {
          await supabase.from('morning_bliss').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } else if (resetType === 'attendance') {
          const currentMonth = new Date().toISOString().slice(0, 7);
          const { data: attendanceToArchive } = await supabase
            .from('attendance')
            .select('*')
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (attendanceToArchive && attendanceToArchive.length > 0) {
            const archiveRecords = attendanceToArchive.map(record => ({
              student_id: record.student_id,
              class: record.class,
              date: record.date,
              status: record.status,
              prayer: record.prayer,
              marked_by: record.marked_by,
              original_month: currentMonth
            }));

            await supabase.from('attendance_archive').insert(archiveRecords);
          }

          await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }

        setConfirmText('');
        setResetType(null);
      }, 5);
    } catch (error) {
      console.error('Error resetting data:', error);
      // Silently retry
      setTimeout(() => handleReset(), 2000);
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '500px', margin: '80px auto' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px', textAlign: 'center' }}>
            Admin Panel
          </h1>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Enter Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  const sectionOrder: ReasonSection[] = ['class', 'star', 'performance'];
  const activeConfig = sectionConfig[activeSection];
  const currentReasons = activeSection === 'class' ? classReasons : activeSection === 'star' ? starReasons : performanceReasons;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
          Admin Panel
        </h1>
        <button
          onClick={() => setIsAuthenticated(false)}
          style={{
            padding: '10px 20px',
            background: '#ef4444',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        {[
          { id: 'voice' as TabType, label: 'Voice of Director', icon: '🎙️' },
          { id: 'classes' as TabType, label: 'Manage Classes', icon: '🎓' },
          { id: 'reasons' as TabType, label: 'Manage Reasons', icon: '📋' },
          { id: 'students' as TabType, label: 'Manage Students', icon: '👨‍🎓' },
          { id: 'mentors' as TabType, label: 'Mentor Management', icon: '👥' },
          { id: 'reset' as TabType, label: 'Reset Controls', icon: '🔄' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.id ? '#16a34a' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : '#6b7280',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #16a34a' : '2px solid transparent',
              borderRadius: '8px 8px 0 0',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'voice' && <VoiceOfDirectorTab />}
      {activeTab === 'classes' && <ManageClassesTab />}
      {activeTab === 'reasons' && <ManageReasonsTab />}
      {activeTab === 'students' && <ManageStudentsTab />}
      {activeTab === 'mentors' && <MentorManagementTab mentors={mentors} removingMentor={removingMentor} onRemoveMentor={handleRemoveMentor} />}
      {activeTab === 'reset' && <ResetControlsTab resetType={resetType} confirmText={confirmText} loading={loading} onResetTypeChange={setResetType} onConfirmTextChange={setConfirmText} onReset={handleReset} />}
    </div>
  );
}

// Voice of Director Tab Component
function VoiceOfDirectorTab() {
  const [messages, setMessages] = useState<VoiceOfDirector[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('voice_of_director_admin')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'voice_of_director' },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchMessages() {
    setLoading(true);
    try {
      await retryOperation(async () => {
        const { data, error } = await supabase
          .from('voice_of_director')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMessages(data || []);
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Silently retry
      setTimeout(() => fetchMessages(), 2000);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formTitle.trim() || !formMessage.trim()) {
      return; // Silently skip if empty
    }

    setIsSubmitting(true);
    try {
      await retryOperation(async () => {
        if (isEditing) {
          const { error } = await supabase
            .from('voice_of_director')
            .update({
              title: formTitle.trim(),
              message: formMessage.trim(),
              updated_at: new Date().toISOString()
            })
            .eq('id', isEditing);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('voice_of_director')
            .insert([{
              title: formTitle.trim(),
              message: formMessage.trim()
            }]);

          if (error) throw error;
        }

        setFormTitle('');
        setFormMessage('');
        setIsEditing(null);
      }, 5);
    } catch (error) {
      console.error('Error saving message:', error);
      // Silently retry
      setTimeout(() => {
        const form = e.target as HTMLFormElement;
        if (form) {
          handleSubmit(e);
        }
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await retryOperation(async () => {
        const { error } = await supabase
          .from('voice_of_director')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }, 5);
    } catch (error) {
      console.error('Error deleting message:', error);
      // Silently retry
      setTimeout(() => handleDelete(id), 2000);
    }
  }

  function handleEdit(msg: VoiceOfDirector) {
    setFormTitle(msg.title);
    setFormMessage(msg.message);
    setIsEditing(msg.id);
  }

  function handleCancel() {
    setFormTitle('');
    setFormMessage('');
    setIsEditing(null);
  }

  return (
    <div>
      {/* Add/Edit Form */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
          {isEditing ? 'Edit Message' : 'Add New Message'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Title *
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Enter message title"
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
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Message *
            </label>
            <textarea
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
              placeholder="Enter message content"
              required
              rows={6}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '12px 24px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update Message' : 'Add Message')}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Messages List */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
          All Messages ({messages.length})
        </h2>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Loading...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No messages yet. Add your first message above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  background: '#f9fafb',
                  borderRadius: '8px',
                  padding: '20px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    margin: 0
                  }}>
                    {msg.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEdit(msg)}
                      style={{
                        padding: '6px 12px',
                        background: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(msg.id)}
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
                      ❌ Delete
                    </button>
                  </div>
                </div>
                <p style={{
                  fontSize: '15px',
                  color: '#374151',
                  marginBottom: '8px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6'
                }}>
                  {msg.message}
                </p>
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  fontStyle: 'italic',
                  margin: 0
                }}>
                  Posted on {new Date(msg.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Manage Classes Tab Component
function ManageClassesTab() {
  const { classes, refreshClasses } = useClasses();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingClass, setDeletingClass] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [csvUploadStatus, setCsvUploadStatus] = useState<'success' | 'error' | null>(null);
  const [csvUploadMessage, setCsvUploadMessage] = useState('');

  useEffect(() => {
    // Subscribe to realtime updates for classes
    const channel = supabase
      .channel('classes_admin')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'classes' },
        () => {
          refreshClasses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshClasses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formName.trim()) {
      return; // Silently skip if empty
    }

    setIsSubmitting(true);
    setSaveStatus(null);
    setErrorMessage('');
    const classNameToSave = formName.trim();
    
    try {
      await retryOperation(async () => {
        let result;
        if (isEditing) {
          const { data, error } = await supabase
            .from('classes')
            .update({
              name: classNameToSave,
              updated_at: new Date().toISOString()
            })
            .eq('id', isEditing)
            .select()
            .single();

          if (error) {
            console.error('Update error:', error);
            throw error;
          }
          result = data;
        } else {
          const { data, error } = await supabase
            .from('classes')
            .insert([{
              name: classNameToSave,
              is_active: true
            }])
            .select()
            .single();

          if (error) {
            console.error('Insert error:', error);
            throw error;
          }
          result = data;
        }

        // Only reset form if operation succeeded
        if (result) {
          setFormName('');
          setIsEditing(null);
          setSaveStatus('success');
          // Refresh classes list - realtime will also update
          await refreshClasses();
          // Clear success message after 1.5 seconds
          setTimeout(() => setSaveStatus(null), 1500);
        }
      }, 2);
    } catch (error: any) {
      console.error('Error saving class:', error);
      setSaveStatus('error');
      
      // Show user-friendly error message
      if (error?.code === '23505') {
        setErrorMessage('A class with this name already exists');
      } else if (error?.message) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Failed to save class. Please try again.');
      }
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setSaveStatus(null);
        setErrorMessage('');
      }, 5000);
      
      // Don't reset form on error - let user retry
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(classId: string, className: string) {
    // Protect default classes from deletion
    const defaultClasses = ['JCP03', 'C2A', 'C2B', 'S2A', 'S2B', 'C1A', 'C1B', 'C1C', 'S1A', 'S1B'];
    if (defaultClasses.includes(className.toUpperCase())) {
      alert('This is a default class and cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${className}"? Type "DELETE" to confirm.`)) {
      return;
    }

    const confirmDelete = prompt('Type "DELETE" to confirm deletion:');
    if (confirmDelete !== 'DELETE') {
      return; // Silently cancel
    }

    setDeletingClass(classId);
    try {
      await retryOperation(async () => {
        // Soft delete - set is_active to false
        const { error } = await supabase
          .from('classes')
          .update({ is_active: false })
          .eq('id', classId);

        if (error) throw error;
        
        refreshClasses(); // Realtime will also update
      }, 2);
    } catch (error) {
      console.error('Error deleting class:', error);
      // Retry immediately
      handleDelete(classId, className).catch(() => {});
    } finally {
      setDeletingClass(null);
    }
  }

  function handleEdit(cls: Class) {
    setFormName(cls.name);
    setIsEditing(cls.id);
  }

  async function handleClassesCSVUpload(file: File) {
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    setUploadingCSV(true);
    setCsvUploadStatus(null);
    setCsvUploadMessage('');

    try {
      await retryOperation(async () => {
        const text = await file.text();
        let classNames: string[] = [];

        if (fileExtension === 'json') {
          const jsonData = JSON.parse(text);
          if (Array.isArray(jsonData)) {
            classNames = jsonData.map(item => {
              if (typeof item === 'string') return item;
              if (item.name) return item.name;
              return null;
            }).filter(Boolean) as string[];
          }
        } else if (fileExtension === 'csv') {
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          const nameIndex = headers.indexOf('name') !== -1 ? headers.indexOf('name') : 
                           headers.indexOf('class') !== -1 ? headers.indexOf('class') : 
                           headers.indexOf('class name') !== -1 ? headers.indexOf('class name') : 0;

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values[nameIndex]) {
              classNames.push(values[nameIndex]);
            }
          }
        } else {
          throw new Error('Please upload a CSV or JSON file');
        }

        if (classNames.length === 0) {
          throw new Error('No valid class names found in file');
        }

        // Remove duplicates and trim
        const uniqueClasses = [...new Set(classNames.map(c => c.trim()).filter(c => c.length > 0))];

        // Bulk insert classes (upsert - skip if exists)
        const insertData = uniqueClasses.map(name => ({
          name,
          is_active: true
        }));

        const { error } = await supabase.from('classes').upsert(insertData, {
          onConflict: 'name',
          ignoreDuplicates: false
        });

        if (error) throw error;

        setCsvUploadStatus('success');
        setCsvUploadMessage(`Successfully uploaded ${uniqueClasses.length} classes`);
        await refreshClasses();
        
        setTimeout(() => {
          setCsvUploadStatus(null);
          setCsvUploadMessage('');
        }, 3000);
      }, 5);
    } catch (error: any) {
      console.error('Error uploading classes CSV:', error);
      setCsvUploadStatus('error');
      setCsvUploadMessage(error?.message || 'Failed to upload classes CSV');
      setTimeout(() => {
        setCsvUploadStatus(null);
        setCsvUploadMessage('');
      }, 5000);
    } finally {
      setUploadingCSV(false);
    }
  }

  function exportClassesCSV() {
    const csvHeader = 'name\n';
    const csvRows = activeClasses.map(c => c.name).join('\n');
    const csvContent = csvHeader + csvRows;

    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const csvUrl = URL.createObjectURL(csvBlob);

    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = 'classes.csv';
    csvLink.click();

    URL.revokeObjectURL(csvUrl);
  }

  const activeClasses = classes.filter(c => c.is_active);
  const inactiveClasses = classes.filter(c => !c.is_active);

  return (
    <div>
      {/* Add/Edit Form */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
          {isEditing ? 'Edit Class' : 'Add New Class'}
        </h2>
        
        {/* Status Messages */}
        {saveStatus === 'success' && (
          <div style={{
            padding: '12px',
            background: '#d1fae5',
            color: '#065f46',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ✓ Class saved successfully!
          </div>
        )}
        
        {saveStatus === 'error' && errorMessage && (
          <div style={{
            padding: '12px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ✗ {errorMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Class Name *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Enter class name (e.g., S2A, C1B)"
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
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '12px 24px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update Class' : 'Add Class')}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* CSV Upload Section */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          Bulk Upload Classes (CSV/JSON)
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          Upload a CSV or JSON file to bulk add classes. CSV format: single column with header "name" or "class". 
          JSON format: array of strings or objects with "name" property.
        </p>
        
        {csvUploadStatus === 'success' && (
          <div style={{
            padding: '12px',
            background: '#d1fae5',
            color: '#065f46',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ✓ {csvUploadMessage}
          </div>
        )}
        
        {csvUploadStatus === 'error' && csvUploadMessage && (
          <div style={{
            padding: '12px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            ✗ {csvUploadMessage}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".csv,.json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleClassesCSVUpload(file);
              }
            }}
            disabled={uploadingCSV}
            style={{ display: 'none' }}
            id="classes-csv-upload"
          />
          <label
            htmlFor="classes-csv-upload"
            style={{
              padding: '12px 24px',
              background: uploadingCSV ? '#9ca3af' : '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: uploadingCSV ? 'not-allowed' : 'pointer',
              display: 'inline-block'
            }}
          >
            {uploadingCSV ? 'Uploading...' : '📤 Upload CSV/JSON'}
          </label>
          <button
            onClick={exportClassesCSV}
            disabled={activeClasses.length === 0}
            style={{
              padding: '12px 24px',
              background: activeClasses.length === 0 ? '#9ca3af' : '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: activeClasses.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            📥 Export Classes CSV
          </button>
        </div>
      </div>

      {/* Active Classes List */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
          Active Classes ({activeClasses.length})
        </h2>

        {activeClasses.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No active classes. Add your first class above.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {activeClasses.map((cls) => (
              <div
                key={cls.id}
                style={{
                  background: '#f9fafb',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                  {cls.name}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(cls)}
                    style={{
                      padding: '6px 12px',
                      background: '#3b82f6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cls.id, cls.name)}
                    disabled={deletingClass === cls.id || ['JCP03', 'C2A', 'C2B', 'S2A', 'S2B', 'C1A', 'C1B', 'C1C', 'S1A', 'S1B'].includes(cls.name.toUpperCase())}
                    style={{
                      padding: '6px 12px',
                      background: ['JCP03', 'C2A', 'C2B', 'S2A', 'S2B', 'C1A', 'C1B', 'C1C', 'S1A', 'S1B'].includes(cls.name.toUpperCase()) ? '#9ca3af' : '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: (deletingClass === cls.id || ['JCP03', 'C2A', 'C2B', 'S2A', 'S2B', 'C1A', 'C1B', 'C1C', 'S1A', 'S1B'].includes(cls.name.toUpperCase())) ? 'not-allowed' : 'pointer',
                      opacity: (deletingClass === cls.id || ['JCP03', 'C2A', 'C2B', 'S2A', 'S2B', 'C1A', 'C1B', 'C1C', 'S1A', 'S1B'].includes(cls.name.toUpperCase())) ? 0.6 : 1
                    }}
                  >
                    {deletingClass === cls.id ? '...' : '🗑️ Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Classes List */}
      {inactiveClasses.length > 0 && (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#6b7280', marginBottom: '20px' }}>
            Deleted Classes ({inactiveClasses.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {inactiveClasses.map((cls) => (
              <div
                key={cls.id}
                style={{
                  background: '#f9fafb',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  opacity: 0.6
                }}
              >
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280', textDecoration: 'line-through' }}>
                  {cls.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Manage Reasons Tab Component
function ManageReasonsTab() {
  type ReasonSection = 'class' | 'star' | 'performance';

  const [classReasons, setClassReasons] = useState<ClassReason[]>([]);
  const [starReasons, setStarReasons] = useState<StarReason[]>([]);
  const [performanceReasons, setPerformanceReasons] = useState<PerformanceReason[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<ReasonSection>('class');
  const [editingReason, setEditingReason] = useState<{ id: string; type: ReasonSection; reason: string; value: number } | null>(null);
  const [editReasonText, setEditReasonText] = useState('');
  const [editValue, setEditValue] = useState(1);
  
  // Manual add form state
  const [newReasonName, setNewReasonName] = useState('');
  const [newReasonValue, setNewReasonValue] = useState(1);
  const [isAddingReason, setIsAddingReason] = useState(false);

  const sectionConfig: Record<ReasonSection, {
    label: string;
    table: 'class_reasons' | 'star_reasons' | 'performance_reasons';
    valueKey: 'tally' | 'stars';
    valueLabel: string;
    accent: string;
    description: string;
  }> = {
    class: {
      label: 'Tally',
      table: 'class_reasons',
      valueKey: 'tally',
      valueLabel: 'Tally Count',
      accent: '#16a34a',
      description: 'Reasons mentors pick when assigning regular tallies.'
    },
    star: {
      label: 'Star',
      table: 'star_reasons',
      valueKey: 'stars',
      valueLabel: 'Star Count',
      accent: '#fbbf24',
      description: 'Reasons mentors pick when awarding stars.'
    },
    performance: {
      label: 'Other',
      table: 'performance_reasons',
      valueKey: 'tally',
      valueLabel: 'Other Count',
      accent: '#f97316',
      description: 'Reasons for other performance tallies.'
    }
  };

  useEffect(() => {
    fetchReasons();
    
    const classChannel = supabase
      .channel('class_reasons_admin')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'class_reasons' },
        () => {
          fetchReasons();
        }
      )
      .subscribe();
    
    const starChannel = supabase
      .channel('star_reasons_admin')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'star_reasons' },
        () => {
          fetchReasons();
        }
      )
      .subscribe();
    
    const performanceChannel = supabase
      .channel('performance_reasons_admin')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'performance_reasons' },
        () => {
          fetchReasons();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(classChannel);
      supabase.removeChannel(starChannel);
      supabase.removeChannel(performanceChannel);
    };
  }, []);

  async function fetchReasons() {
    try {
      const [classData, starData, performanceData] = await Promise.all([
        supabase.from('class_reasons').select('*').order('reason'),
        supabase.from('star_reasons').select('*').order('reason'),
        supabase.from('performance_reasons').select('*').order('reason')
      ]);
      
      if (classData.error) {
        console.error('Error fetching class reasons:', classData.error);
      } else {
        setClassReasons(classData.data || []);
      }
      
      if (starData.error) {
        console.error('Error fetching star reasons:', starData.error);
      } else {
        setStarReasons(starData.data || []);
      }
      
      if (performanceData.error) {
        console.error('Error fetching performance reasons:', performanceData.error);
      } else {
        setPerformanceReasons(performanceData.data || []);
      }
    } catch (error) {
      console.error('Error fetching reasons:', error);
    }
  }

  async function handleFileUpload(file: File, section: ReasonSection) {
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const { valueKey, table } = sectionConfig[section];
    setLoading(true);
    
    try {
      await retryOperation(async () => {
        const text = await file.text();
        const reasons: Array<{ reason: string; value: number }> = [];

        if (fileExtension === 'json') {
          const jsonData = JSON.parse(text);
          if (Array.isArray(jsonData)) {
            jsonData.forEach(item => {
              const name = typeof item === 'string' ? item : (item.reason || item.name || '');
              if (!name?.trim()) return;
              const rawValue = typeof item === 'object'
                ? (item[valueKey] ?? item.tally ?? item.stars ?? item.value ?? item.count ?? 1)
                : 1;

              reasons.push({
                reason: name,
                value: Math.max(1, parseInt(rawValue, 10) || 1)
              });
            });
          }
        } else if (fileExtension === 'csv') {
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          const reasonIndex = headers.findIndex(h => h.includes('reason') || h.includes('name') || h.includes('description'));
          const valueIndex = headers.findIndex(h => 
            h.includes('tally') ||
            h.includes('value') ||
            h.includes('count') ||
            h.includes('star')
          );
          
          if (reasonIndex === -1) {
            throw new Error('CSV must have a "reason", "name", or "description" column');
          }

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values[reasonIndex]) {
              reasons.push({
                reason: values[reasonIndex],
                value: valueIndex !== -1 && values[valueIndex] ? Math.max(1, parseInt(values[valueIndex]) || 1) : 1
              });
            }
          }
        } else {
          throw new Error('Please upload a CSV or JSON file');
        }

        if (reasons.length === 0) {
          throw new Error('No valid reasons found in file');
        }

        // Clear existing reasons and insert new ones (or use upsert for updates)
        // Delete all existing reasons
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Insert new reasons
        const insertData = reasons.map(r => ({
          reason: r.reason.trim(),
          [valueKey]: Math.max(1, r.value)
        }));

        const { error } = await supabase.from(table).insert(insertData as Record<string, unknown>[]);
        
        if (error) throw error;
        
        // Realtime will update, but fetch immediately for instant feedback
        fetchReasons();
      }, 2);
    } catch (error) {
      console.error('Error uploading reasons:', error);
      // Retry immediately
      handleFileUpload(file, section).catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  function exportReasons(section: ReasonSection) {
    const reasons = section === 'class' ? classReasons : section === 'star' ? starReasons : performanceReasons;
    
    if (reasons.length === 0) {
      return; // Silently skip if no reasons
    }

    const { valueKey } = sectionConfig[section];

    // Export as CSV
    const csvHeader = `reason,${valueKey}\n`;
    const csvRows = reasons.map(r => {
      const value = section === 'star' ? (r as StarReason).stars : (r as ClassReason | PerformanceReason).tally;
      return `${r.reason},${value}`;
    }).join('\n');
    const csvContent = csvHeader + csvRows;

    // Export as JSON
    const jsonContent = JSON.stringify(reasons.map(r => ({
      reason: r.reason,
      [valueKey]: section === 'star' ? (r as StarReason).stars : (r as ClassReason | PerformanceReason).tally
    })), null, 2);

    // Create download links
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const jsonBlob = new Blob([jsonContent], { type: 'application/json' });

    const csvUrl = URL.createObjectURL(csvBlob);
    const jsonUrl = URL.createObjectURL(jsonBlob);

    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `${section}_reasons.csv`;
    csvLink.click();

    const jsonLink = document.createElement('a');
    jsonLink.href = jsonUrl;
    jsonLink.download = `${section}_reasons.json`;
    jsonLink.click();

    URL.revokeObjectURL(csvUrl);
    URL.revokeObjectURL(jsonUrl);
  }

  async function editReason(id: string, section: ReasonSection, reason: string, value: number) {
    const trimmedReason = reason.trim();
    if (!trimmedReason) return;

    if (section === 'class') {
      setClassReasons(prev => prev.map(r => 
        r.id === id ? { ...r, reason: trimmedReason, tally: Math.max(1, value) } : r
      ));
    } else if (section === 'star') {
      setStarReasons(prev => prev.map(r => 
        r.id === id ? { ...r, reason: trimmedReason, stars: Math.max(1, value) } : r
      ));
    } else {
      setPerformanceReasons(prev => prev.map(r => 
        r.id === id ? { ...r, reason: trimmedReason, tally: Math.max(1, value) } : r
      ));
    }

    try {
      await retryOperation(async () => {
        const { table, valueKey } = sectionConfig[section];
        const { error } = await supabase
          .from(table)
          .update({
            reason: trimmedReason,
            [valueKey]: Math.max(1, value),
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        
        if (error) throw error;
        setEditingReason(null);
        fetchReasons();
      }, 2);
    } catch (error) {
      console.error('Error editing reason:', error);
      fetchReasons();
      editReason(id, section, reason, value).catch(() => {});
    }
  }

  async function handleAddManualReason() {
    if (!newReasonName.trim() || newReasonValue < 1) {
      return;
    }

    const { valueKey, table } = sectionConfig[activeSection];
    const value = Math.max(1, newReasonValue);
    const baseReason = {
      reason: newReasonName.trim(),
      [valueKey]: value
    };

    const tempId = `temp-${Date.now()}`;
    const timestamp = new Date().toISOString();

    if (activeSection === 'class') {
      setClassReasons(prev => [...prev, {
        id: tempId,
        reason: baseReason.reason,
        tally: value,
        created_at: timestamp,
        updated_at: timestamp
      } as ClassReason]);
    } else if (activeSection === 'star') {
      setStarReasons(prev => [...prev, {
        id: tempId,
        reason: baseReason.reason,
        stars: value,
        created_at: timestamp,
        updated_at: timestamp
      } as StarReason]);
    } else {
      setPerformanceReasons(prev => [...prev, {
        id: tempId,
        reason: baseReason.reason,
        tally: value,
        created_at: timestamp,
        updated_at: timestamp
      } as PerformanceReason]);
    }

    setNewReasonName('');
    setNewReasonValue(1);

    setIsAddingReason(true);
    try {
      await retryOperation(async () => {
        const { error } = await supabase
          .from(table)
          .insert([baseReason]);

        if (error) throw error;
        
        fetchReasons();
      }, 2);
    } catch (error) {
      console.error('Error adding reason:', error);
      if (activeSection === 'class') {
        setClassReasons(prev => prev.filter(r => !r.id.startsWith('temp-')));
      } else if (activeSection === 'star') {
        setStarReasons(prev => prev.filter(r => !r.id.startsWith('temp-')));
      } else {
        setPerformanceReasons(prev => prev.filter(r => !r.id.startsWith('temp-')));
      }
      setNewReasonName(baseReason.reason);
      setNewReasonValue(value);
      handleAddManualReason().catch(() => {});
    } finally {
      setIsAddingReason(false);
    }
  }

  function startEdit(reason: ClassReason | PerformanceReason | StarReason, type: ReasonSection) {
    setEditingReason({
      id: reason.id,
      type,
      reason: reason.reason,
      value: type === 'star' ? (reason as StarReason).stars : (reason as ClassReason | PerformanceReason).tally
    });
    setEditReasonText(reason.reason);
    setEditValue(type === 'star' ? (reason as StarReason).stars : (reason as ClassReason | PerformanceReason).tally);
  }

  function cancelEdit() {
    setEditingReason(null);
    setEditReasonText('');
    setEditValue(1);
  }

  async function deleteReason(id: string, type: ReasonSection) {
    if (!confirm('Are you sure you want to delete this reason?')) return;

    try {
      await retryOperation(async () => {
        const { table } = sectionConfig[type];
        const { error } = await supabase.from(table).delete().eq('id', id);
        
        if (error) throw error;
        fetchReasons();
      }, 2);
    } catch (error) {
      console.error('Error deleting reason:', error);
      // Retry immediately
      deleteReason(id, type).catch(() => {});
    }
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {sectionOrder.map(section => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            style={{
              padding: '12px 24px',
              background: activeSection === section ? sectionConfig[section].accent : '#ffffff',
              color: activeSection === section ? '#ffffff' : '#1f2937',
              border: `2px solid ${sectionConfig[section].accent}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {sectionConfig[section].label} Reasons
          </button>
        ))}
      </div>

      {/* Manual Add Section - Always Visible */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        border: '2px solid #dcfce7'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
          ➕ Add New {activeConfig.label} Reason (Manual Input)
        </h2>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
          {activeConfig.description}
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '250px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Reason Name *
            </label>
            <input
              type="text"
              value={newReasonName}
              onChange={(e) => setNewReasonName(e.target.value)}
              placeholder="e.g., Late arrival, Outstanding help..."
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = activeConfig.accent}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newReasonName.trim() && newReasonValue >= 1) {
                  e.preventDefault();
                  handleAddManualReason();
                }
              }}
            />
          </div>
          <div style={{ minWidth: '140px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              {activeConfig.valueLabel} *
            </label>
            <input
              type="number"
              value={newReasonValue}
              onChange={(e) => setNewReasonValue(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              placeholder="1"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = activeConfig.accent}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <button
            onClick={handleAddManualReason}
            disabled={isAddingReason || !newReasonName.trim() || newReasonValue < 1}
            style={{
              padding: '12px 24px',
              background: (isAddingReason || !newReasonName.trim() || newReasonValue < 1) ? '#9ca3af' : activeConfig.accent,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: (isAddingReason || !newReasonName.trim() || newReasonValue < 1) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {isAddingReason ? 'Saving...' : '✅ Save Reason'}
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          Upload {activeConfig.label} Reasons
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          Upload a CSV or JSON file with columns: reason, {activeConfig.valueLabel.toLowerCase()}
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="file"
            accept=".csv,.json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileUpload(file, activeSection);
                e.target.value = ''; // Reset input
              }
            }}
            style={{
              padding: '8px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
          <button
            onClick={() => exportReasons(activeSection)}
            style={{
              padding: '10px 24px',
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            📥 Export Reasons
          </button>
        </div>
      </div>

      {/* Reasons List */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
          {activeConfig.label} Reasons ({currentReasons.length})
        </h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading...</div>
        ) : currentReasons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No {activeConfig.label.toLowerCase()} reasons available. Add a reason manually above or upload a CSV/JSON file.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Reason</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>{activeConfig.valueLabel}</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentReasons.map((reason) => (
                  <tr key={reason.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: '500', color: '#1f2937' }}>
                      {editingReason?.id === reason.id && editingReason.type === activeSection ? (
                        <input
                          type="text"
                          value={editReasonText}
                          onChange={(e) => setEditReasonText(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            border: '2px solid #16a34a',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                          autoFocus
                        />
                      ) : (
                        reason.reason
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                      {editingReason?.id === reason.id && editingReason.type === activeSection ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(Math.max(1, parseInt(e.target.value) || 1))}
                          min="1"
                          style={{
                            width: '60px',
                            padding: '6px',
                            border: '2px solid #16a34a',
                            borderRadius: '6px',
                            fontSize: '14px',
                            textAlign: 'center'
                          }}
                        />
                      ) : (
                        `+${activeSection === 'star' ? (reason as StarReason).stars : (reason as ClassReason | PerformanceReason).tally}`
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {editingReason?.id === reason.id && editingReason.type === activeSection ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => editReason(reason.id, activeSection, editReasonText, editValue)}
                            style={{
                              padding: '6px 12px',
                              background: '#16a34a',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{
                              padding: '6px 12px',
                              background: '#6b7280',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => startEdit(reason, activeSection)}
                            style={{
                              padding: '6px 12px',
                              background: '#3b82f6',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteReason(reason.id, activeSection)}
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
                        </div>
                      )}
                    </td>
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

// Manage Students Tab Component
function ManageStudentsTab() {
  const { activeClasses } = useClasses();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formName, setFormName] = useState('');
  const [formRollNumber, setFormRollNumber] = useState('');
  const [formClass, setFormClass] = useState('');
  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStudents();

    // Subscribe to realtime updates for students
    const channel = supabase
      .channel('students_admin_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        () => {
          fetchStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('class')
        .order('name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formName.trim() || !formRollNumber.trim() || !formClass) {
      return;
    }

    setIsSubmitting(true);
    try {
      await retryOperation(async () => {
        let photoUrl = editingStudent?.photo_url || null;

        // Upload new photo if selected
        if (formPhotoFile) {
          const fileExt = formPhotoFile.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('student-photos')
            .upload(fileName, formPhotoFile);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('student-photos')
            .getPublicUrl(fileName);

          photoUrl = urlData.publicUrl;
        }

        if (isEditing && editingStudent) {
          // Update existing student
          const { error } = await supabase
            .from('students')
            .update({
              name: formName.trim(),
              roll_number: formRollNumber.trim(),
              class: formClass,
              photo_url: photoUrl
            })
            .eq('id', editingStudent.id);

          if (error) throw error;
        } else {
          // Insert new student
          const { error } = await supabase
            .from('students')
            .insert([{
              name: formName.trim(),
              roll_number: formRollNumber.trim(),
              class: formClass,
              photo_url: photoUrl
            }]);

          if (error) throw error;
        }

        // Reset form
        setFormName('');
        setFormRollNumber('');
        setFormClass(activeClasses[0] || '');
        setFormPhotoFile(null);
        setFormPhotoPreview(null);
        setIsEditing(null);
        setEditingStudent(null);
        
        // Realtime will update, but fetch immediately for instant feedback
        fetchStudents();
      }, 2);
    } catch (error) {
      console.error('Error saving student:', error);
      // Retry immediately
      handleSubmit(e).catch(() => {});
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(studentId: string) {
    if (!confirm('Are you sure you want to delete this student?')) return;

    setDeletingStudent(studentId);
    try {
      await retryOperation(async () => {
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', studentId);

        if (error) throw error;
        fetchStudents();
      }, 2);
    } catch (error) {
      console.error('Error deleting student:', error);
      // Retry immediately
      handleDelete(studentId).catch(() => {});
    } finally {
      setDeletingStudent(null);
    }
  }

  function handleEdit(student: Student) {
    setEditingStudent(student);
    setIsEditing(student.id);
    setFormName(student.name);
    setFormRollNumber(student.roll_number);
    setFormClass(student.class);
    setFormPhotoPreview(student.photo_url || null);
    setFormPhotoFile(null);
  }

  function handleCancel() {
    setIsEditing(null);
    setEditingStudent(null);
    setFormName('');
    setFormRollNumber('');
    setFormClass(activeClasses[0] || '');
    setFormPhotoFile(null);
    setFormPhotoPreview(null);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFormPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  const filteredStudents = students.filter(student => {
    const matchesClass = selectedClassFilter === 'ALL' || student.class === selectedClassFilter;
    const matchesSearch = searchQuery.trim() === '' || 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.roll_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  return (
    <div>
      {/* Add/Edit Form */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
          {isEditing ? 'Edit Student' : 'Add New Student'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Student Name *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter student name"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Roll Number *
              </label>
              <input
                type="text"
                value={formRollNumber}
                onChange={(e) => setFormRollNumber(e.target.value)}
                placeholder="Enter roll number"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Class *
              </label>
              <select
                value={formClass}
                onChange={(e) => setFormClass(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
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
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Photo (Optional)
            </label>
            {formPhotoPreview && (
              <div style={{ marginBottom: '12px' }}>
                <img
                  src={formPhotoPreview}
                  alt="Preview"
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb'
                  }}
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '12px 24px',
                background: isSubmitting ? '#9ca3af' : '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update Student' : 'Add Student')}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: '12px 24px',
                  background: '#6b7280',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Filter and Search */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Search Students
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or roll number..."
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
          <div style={{ minWidth: '150px' }}>
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
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
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
        </div>
      </div>

      {/* Students List */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>
          All Students ({filteredStudents.length})
        </h2>
        
        {filteredStudents.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            {students.length === 0 
              ? 'No students added yet. Add your first student above.'
              : 'No students found matching your search criteria.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Photo</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Roll Number</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Class</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>
                      {student.photo_url ? (
                        <img
                          src={student.photo_url}
                          alt={student.name}
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: '#16a34a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '18px',
                          fontWeight: 'bold'
                        }}>
                          {student.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '500', color: '#1f2937' }}>{student.name}</td>
                    <td style={{ padding: '12px', color: '#6b7280' }}>{student.roll_number}</td>
                    <td style={{ padding: '12px', color: '#16a34a', fontWeight: '600' }}>{student.class}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(student)}
                          style={{
                            padding: '6px 12px',
                            background: '#3b82f6',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          disabled={deletingStudent === student.id}
                          style={{
                            padding: '6px 12px',
                            background: deletingStudent === student.id ? '#9ca3af' : '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: deletingStudent === student.id ? 'not-allowed' : 'pointer',
                            opacity: deletingStudent === student.id ? 0.6 : 1
                          }}
                        >
                          {deletingStudent === student.id ? '...' : '🗑️ Delete'}
                        </button>
                      </div>
                    </td>
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

// Mentor Management Tab Component
function MentorManagementTab({ mentors, removingMentor, onRemoveMentor }: { mentors: any[], removingMentor: string | null, onRemoveMentor: (id: string) => void }) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
        Mentor List ({mentors.length})
      </h2>
      
      {mentors.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No mentors found.</p>
          <p style={{ fontSize: '14px' }}>Mentors are created when they first log in to the system.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Full Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Short Form</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {mentors.map(mentor => (
                <tr key={mentor.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', color: '#1f2937' }}>{mentor.full_name || 'N/A'}</td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{mentor.email || 'N/A'}</td>
                  <td style={{ padding: '12px', color: '#16a34a', fontWeight: '600' }}>{mentor.short_form || 'N/A'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => onRemoveMentor(mentor.id)}
                      disabled={removingMentor === mentor.id}
                      style={{
                        padding: '6px 12px',
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: removingMentor === mentor.id ? 'not-allowed' : 'pointer',
                        opacity: removingMentor === mentor.id ? 0.6 : 1
                      }}
                    >
                      {removingMentor === mentor.id ? 'Removing...' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Reset Controls Tab Component
function ResetControlsTab({ resetType, confirmText, loading, onResetTypeChange, onConfirmTextChange, onReset }: {
  resetType: 'classes' | 'morning_bliss' | 'attendance' | null,
  confirmText: string,
  loading: boolean,
  onResetTypeChange: (type: 'classes' | 'morning_bliss' | 'attendance' | null) => void,
  onConfirmTextChange: (text: string) => void,
  onReset: () => void
}) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
        Reset Controls
      </h2>

      <div style={{
        background: '#fef3c7',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '24px',
        border: '2px solid #fbbf24'
      }}>
        <p style={{ fontSize: '14px', color: '#92400e', fontWeight: '600' }}>
          ⚠️ Warning: These actions cannot be undone. Please use with caution.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={() => onResetTypeChange('classes')}
          style={{
            padding: '16px',
            background: resetType === 'classes' ? '#dc2626' : '#ffffff',
            color: resetType === 'classes' ? '#ffffff' : '#1f2937',
            border: '2px solid #dc2626',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          Reset Classes (Tallies, Stars, Other Tallies)
        </button>

        <button
          onClick={() => onResetTypeChange('morning_bliss')}
          style={{
            padding: '16px',
            background: resetType === 'morning_bliss' ? '#dc2626' : '#ffffff',
            color: resetType === 'morning_bliss' ? '#ffffff' : '#1f2937',
            border: '2px solid #dc2626',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          Reset Morning Bliss (Archives data)
        </button>

        <button
          onClick={() => onResetTypeChange('attendance')}
          style={{
            padding: '16px',
            background: resetType === 'attendance' ? '#dc2626' : '#ffffff',
            color: resetType === 'attendance' ? '#ffffff' : '#1f2937',
            border: '2px solid #dc2626',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          Reset Namaz (Archives monthly data)
        </button>
      </div>

      {resetType && (
        <div style={{
          background: '#fee2e2',
          padding: '20px',
          borderRadius: '8px',
          border: '2px solid #dc2626'
        }}>
          <p style={{ fontSize: '14px', color: '#991b1b', marginBottom: '16px', fontWeight: '600' }}>
            Type "RESET" to confirm this action:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => onConfirmTextChange(e.target.value)}
            placeholder="Type RESET"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #dc2626',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              marginBottom: '16px'
            }}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onReset}
              disabled={loading || confirmText !== 'RESET'}
              style={{
                flex: 1,
                padding: '12px',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading || confirmText !== 'RESET' ? 'not-allowed' : 'pointer',
                opacity: loading || confirmText !== 'RESET' ? 0.5 : 1
              }}
            >
              {loading ? 'Resetting...' : 'Confirm Reset'}
            </button>
            <button
              onClick={() => {
                onResetTypeChange(null);
                onConfirmTextChange('');
              }}
              style={{
                flex: 1,
                padding: '12px',
                background: '#6b7280',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
