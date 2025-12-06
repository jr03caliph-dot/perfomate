import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { signOut, mentor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    {
      path: '/classes',
      label: 'Classes',
      icon: '🎓',
      subItems: [
        { path: '/classes', label: 'View Classes' },
        { path: '/view-history', label: 'View History' }
      ]
    },
    { path: '/multiple-entry', label: 'Multiple Entry (Performance)', icon: '✏️' },
    { path: '/add-students', label: 'Add Students', icon: '➕' },
    { path: '/reports', label: 'Reports (Performance)', icon: '📈' },
    {
      path: '/attendance',
      label: 'Namaz',
      icon: '📋',
      subItems: [
        { path: '/attendance/mark', label: 'Mark Namaz' },
        { path: '/attendance/multiple-entry', label: 'Multiple Entry' },
        { path: '/attendance/reports', label: 'Namaz Reports' },
        { path: '/attendance/view-by-prayer', label: 'Namaz View by Prayer' }
      ]
    },
    {
      path: '/morning-bliss',
      label: 'Morning Bliss',
      icon: '🌅',
      subItems: [
        { path: '/morning-bliss/scores', label: 'Scores' },
        { path: '/morning-bliss/reports', label: 'Reports' }
      ]
    },
    {
      path: '/admin',
      label: 'Admin Panel',
      icon: '⚙️'
    }
  ];

  async function handleLogout() {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  function handleNavigation(path: string) {
    navigate(path);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      {isMobile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1000,
          height: '64px'
        }}>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              width: '32px',
              height: '32px',
              justifyContent: 'center'
            }}
          >
            <div style={{
              width: '100%',
              height: '3px',
              background: '#16a34a',
              borderRadius: '2px',
              transition: 'all 0.3s',
              transform: isMobileMenuOpen ? 'rotate(45deg) translateY(8px)' : 'none'
            }} />
            <div style={{
              width: '100%',
              height: '3px',
              background: '#16a34a',
              borderRadius: '2px',
              transition: 'all 0.3s',
              opacity: isMobileMenuOpen ? 0 : 1
            }} />
            <div style={{
              width: '100%',
              height: '3px',
              background: '#16a34a',
              borderRadius: '2px',
              transition: 'all 0.3s',
              transform: isMobileMenuOpen ? 'rotate(-45deg) translateY(-8px)' : 'none'
            }} />
          </button>

          <h1 style={{
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#16a34a',
            margin: 0
          }}>
            Performate
          </h1>

          <div style={{ width: '32px' }} />
        </div>
      )}

      {isMobileMenuOpen && isMobile && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
            animation: 'fadeIn 0.3s'
          }}
        />
      )}

      <aside style={{
        width: isMobile ? '280px' : '280px',
        background: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
        zIndex: 1000,
        left: isMobile ? (isMobileMenuOpen ? '0' : '-280px') : '0',
        top: 0,
        transition: 'left 0.3s ease-in-out',
        boxShadow: isMobile && isMobileMenuOpen ? '2px 0 8px rgba(0,0,0,0.1)' : 'none'
      }}>
        <div style={{ marginBottom: '32px', marginTop: isMobile ? '8px' : '0' }}>
          {!isMobile && (
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#16a34a',
              marginBottom: '4px'
            }}>
              Performate
            </h1>
          )}
          {mentor && (
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: isMobile ? '0' : '4px' }}>
              {mentor.full_name} ({mentor.short_form})
            </p>
          )}
        </div>

        <nav style={{ flex: 1 }}>
          {menuItems.map((item) => (
            <div key={item.path} style={{ marginBottom: '8px' }}>
              <button
                onClick={() => {
                  if (!item.subItems) {
                    handleNavigation(item.path);
                  }
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: isActive(item.path) ? '#dcfce7' : 'transparent',
                  color: isActive(item.path) ? '#16a34a' : '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.background = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>

              {item.subItems && (
                <div style={{ marginLeft: '24px', marginTop: '4px' }}>
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.path}
                      onClick={() => handleNavigation(subItem.path)}
                      style={{
                        width: '100%',
                        display: 'block',
                        padding: '8px 16px',
                        background: location.pathname === subItem.path ? '#dcfce7' : 'transparent',
                        color: location.pathname === subItem.path ? '#16a34a' : '#6b7280',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left',
                        marginBottom: '2px'
                      }}
                      onMouseEnter={(e) => {
                        if (location.pathname !== subItem.path) {
                          e.currentTarget.style.background = '#f3f4f6';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (location.pathname !== subItem.path) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'transparent',
            color: '#dc2626',
            border: '2px solid #dc2626',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginTop: '16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#dc2626';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#dc2626';
          }}
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </aside>

      <main style={{
        flex: 1,
        marginLeft: isMobile ? '0' : '280px',
        marginTop: isMobile ? '64px' : '0',
        padding: isMobile ? '16px' : '32px',
        minHeight: '100vh',
        width: isMobile ? '100%' : 'auto'
      }}>
        {children}
      </main>
    </div>
  );
}
