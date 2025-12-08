import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
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
  const [directorMessage, setDirectorMessage] = useState<VoiceOfDirector | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchDirectorMessage();
  }, []);

  async function fetchDashboardData() {
    try {
      const [studentsData, talliesData, starsData, otherTalliesData, morningBlissData, attendanceData] = await Promise.all([
        api.students.getAll(),
        api.tallies.getAll(),
        api.stars.getAll(),
        api.tallies.getOther(),
        api.morningBliss.getAll({}),
        api.attendance.getAll({})
      ]);

      const totalStudents = studentsData.length;
      const totalTallies = talliesData.reduce((sum, t) => sum + (t.count || 0), 0);
      const totalStars = starsData.reduce((sum, s) => sum + (s.count || 0), 0);
      const totalOtherTallies = otherTalliesData.reduce((sum, o) => sum + (o.count || 0), 0);

      const scores = morningBlissData.map(m => Number(m.score) || 0);
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      const presentCount = attendanceData.filter(a => a.status === 'Present').length;
      const totalAttendance = attendanceData.length;
      const attendancePercent = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

      const classCounts: Record<string, number> = {};
      studentsData.forEach(s => {
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

  async function fetchDirectorMessage() {
    try {
      const data = await api.admin.getVoiceOfDirector();
      setDirectorMessage(data);
    } catch (error) {
      console.error('Error fetching director message:', error);
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
          {!directorMessage ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '16px'
            }}>
              No messages from the Director yet.
            </div>
          ) : (
            <div style={{
              background: '#f9fafb',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '12px'
              }}>
                {directorMessage.title}
              </h3>
              <p style={{
                fontSize: '15px',
                color: '#374151',
                marginBottom: '12px',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6'
              }}>
                {directorMessage.message}
              </p>
              <p style={{
                fontSize: '13px',
                color: '#6b7280',
                fontStyle: 'italic'
              }}>
                Posted on {new Date(directorMessage.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
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
