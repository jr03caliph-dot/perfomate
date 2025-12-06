import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { VoiceOfDirector } from '../types';

interface DashboardStats {
  totalStudents: number;
  totalStars: number;
  totalTallies: number;
  totalOtherTallies: number;
  averageScore: number;
  attendancePercent: number;
  topClass: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalStars: 0,
    totalTallies: 0,
    totalOtherTallies: 0,
    averageScore: 0,
    attendancePercent: 0,
    topClass: ''
  });
  const [loading, setLoading] = useState(true);
  const [directorMessages, setDirectorMessages] = useState<VoiceOfDirector[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchDirectorMessages();
    
    // Subscribe to realtime updates for director messages
    const channel1 = supabase
      .channel('voice_of_director')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'voice_of_director' },
        () => {
          fetchDirectorMessages();
        }
      )
      .subscribe();
    
    // Subscribe to realtime updates for stars and morning_bliss
    const channel2 = supabase
      .channel('dashboard_stars_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'stars' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();
    
    const channel3 = supabase
      .channel('dashboard_morning_bliss_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'morning_bliss' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
      supabase.removeChannel(channel3);
    };
  }, []);

  async function fetchDashboardData() {
    try {
      const [studentsRes, talliesRes, starsRes, otherTalliesRes, morningBlissRes, attendanceRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact' }),
        supabase.from('tallies').select('count'),
        supabase.from('stars').select('count'),
        supabase.from('other_tallies').select('count'),
        supabase.from('morning_bliss').select('score'),
        supabase.from('attendance').select('status')
      ]);

      const totalStudents = studentsRes.count || 0;

      const totalTallies = talliesRes.data?.reduce((sum, t) => sum + (t.count || 0), 0) || 0;
      const totalStars = starsRes.data?.reduce((sum, s) => sum + (s.count || 0), 0) || 0;
      const totalOtherTallies = otherTalliesRes.data?.reduce((sum, o) => sum + (o.count || 0), 0) || 0;

      const scores = morningBlissRes.data?.map(m => m.score) || [];
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      const presentCount = attendanceRes.data?.filter(a => a.status === 'Present').length || 0;
      const totalAttendance = attendanceRes.data?.length || 0;
      const attendancePercent = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

      const { data: classData } = await supabase
        .from('students')
        .select('class');

      const classCounts: Record<string, number> = {};
      classData?.forEach(s => {
        classCounts[s.class] = (classCounts[s.class] || 0) + 1;
      });

      const topClass = Object.entries(classCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      setStats({
        totalStudents,
        totalStars,
        totalTallies,
        totalOtherTallies,
        averageScore,
        attendancePercent,
        topClass
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDirectorMessages() {
    try {
      const { data, error } = await supabase
        .from('voice_of_director')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDirectorMessages(data || []);
    } catch (error) {
      console.error('Error fetching director messages:', error);
    }
  }

  const cards = [
    { title: 'Total Students', value: stats.totalStudents, icon: '🎓', color: '#3b82f6', link: null },
    { title: 'Total Stars', value: stats.totalStars, icon: '⭐', color: '#fbbf24', link: null },
    { title: 'Total Tallies', value: stats.totalTallies, icon: '📊', color: '#ef4444', link: null },
    { title: 'Other Tallies', value: stats.totalOtherTallies, icon: '📌', color: '#f97316', link: null },
    { title: 'Average Score', value: stats.averageScore.toFixed(1), icon: '📈', color: '#16a34a', link: null },
    { title: 'Namaz %', value: `${stats.attendancePercent.toFixed(1)}%`, icon: '✅', color: '#8b5cf6', link: null },
    { title: 'Top Class', value: stats.topClass, icon: '🏆', color: '#ec4899', link: null },
    { title: 'Namaz', value: 'View', icon: '🕌', color: '#16a34a', link: '/attendance/mark' }
  ];

  const performanceData = [
    { name: 'Stars', value: stats.totalStars },
    { name: 'Tallies', value: stats.totalTallies },
    { name: 'Other Tallies', value: stats.totalOtherTallies }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: '#6b7280', fontSize: '18px' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '24px'
      }}>
        Dashboard
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
      }}>
        {cards.map((card) => (
          <div
            key={card.title}
            onClick={() => card.link && navigate(card.link)}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: card.link ? 'pointer' : 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '36px' }}>{card.icon}</span>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `${card.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: card.color
                  }}
                />
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
              {card.title}
            </p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937' }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
        marginBottom: '40px'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '24px'
          }}>
            Performance Overview
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Voice of Director Section - inside Performance Overview */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        marginBottom: '40px'
      }}>
        <div style={{
          background: '#16a34a',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>🎙️</span>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#ffffff',
            margin: 0
          }}>
            Voice of Director
          </h2>
        </div>

        <div style={{ padding: '24px' }}>
          {directorMessages.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '16px'
            }}>
              No messages from the Director yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {directorMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    background: '#f9fafb',
                    borderRadius: '8px',
                    padding: '20px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginBottom: '12px'
                  }}>
                    {msg.title}
                  </h3>
                  <p style={{
                    fontSize: '15px',
                    color: '#374151',
                    marginBottom: '12px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6'
                  }}>
                    {msg.message}
                  </p>
                  <p style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    fontStyle: 'italic'
                  }}>
                    Posted on {new Date(msg.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '20px'
        }}>
          Quick Actions
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          <button
            onClick={() => navigate('/morning-bliss/scores')}
            style={{
              background: '#16a34a',
              color: '#ffffff',
              padding: '20px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#15803d';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#16a34a';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span style={{ fontSize: '24px' }}>🌅</span>
            <span>Add Morning Bliss Score</span>
          </button>

          <button
            onClick={() => navigate('/attendance/mark')}
            style={{
              background: '#16a34a',
              color: '#ffffff',
              padding: '20px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#15803d';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#16a34a';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span style={{ fontSize: '24px' }}>🕌</span>
            <span>Mark Namaz</span>
          </button>

          <button
            onClick={() => navigate('/reports')}
            style={{
              background: '#16a34a',
              color: '#ffffff',
              padding: '20px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#15803d';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#16a34a';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span style={{ fontSize: '24px' }}>📊</span>
            <span>Generate Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
}
