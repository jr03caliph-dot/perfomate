import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api';
import { Mentor } from '../types';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  mentor: Mentor | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, shortForm: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const { user: sessionUser, mentor: sessionMentor } = await api.auth.session();
      if (sessionUser) {
        setUser({ id: sessionUser.id, email: sessionUser.email });
        setMentor(sessionMentor ? {
          id: sessionMentor.id,
          email: sessionMentor.email,
          full_name: sessionMentor.fullName,
          short_form: sessionMentor.shortForm,
          created_at: sessionMentor.createdAt,
        } : null);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email: string, password: string, fullName: string, shortForm: string) {
    const { user: newUser, mentor: newMentor } = await api.auth.signup({
      email,
      password,
      fullName,
      shortForm,
    });

    setUser({ id: newUser.id, email: newUser.email });
    setMentor({
      id: newMentor.id,
      email: newMentor.email,
      full_name: newMentor.fullName,
      short_form: newMentor.shortForm,
      created_at: newMentor.createdAt,
    });
  }

  async function signIn(email: string, password: string) {
    const { user: signedInUser, mentor: signedInMentor } = await api.auth.signin({
      email,
      password,
    });

    setUser({ id: signedInUser.id, email: signedInUser.email });
    setMentor({
      id: signedInMentor.id,
      email: signedInMentor.email,
      full_name: signedInMentor.fullName,
      short_form: signedInMentor.shortForm,
      created_at: signedInMentor.createdAt,
    });
  }

  async function signOut() {
    await api.auth.signout();
    setUser(null);
    setMentor(null);
  }

  return (
    <AuthContext.Provider value={{ user, mentor, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
