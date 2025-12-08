import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../lib/api';
import { Class } from '../types';
import { useAuth } from './AuthContext';

interface ClassesContextType {
  classes: Class[];
  activeClasses: string[];
  loading: boolean;
  refreshClasses: () => Promise<void>;
}

const ClassesContext = createContext<ClassesContextType | undefined>(undefined);

const DEFAULT_CLASSES = ['JCP03', 'C2A', 'C2B', 'S2A', 'S2B', 'C1A', 'C1B', 'C1C', 'S1A', 'S1B'];

export function ClassesProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  async function fetchClasses() {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await api.classes.getAll();
      
      if (data.length === 0) {
        const seededClasses = await api.admin.seedClasses();
        setClasses(seededClasses.map(c => ({
          id: c.id,
          name: c.name,
          is_active: c.isActive ?? true,
          created_at: c.createdAt,
          updated_at: c.updatedAt,
        })));
      } else {
        setClasses(data.map(c => ({
          id: c.id,
          name: c.name,
          is_active: c.isActive ?? true,
          created_at: c.createdAt,
          updated_at: c.updatedAt,
        })));
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      const defaultClassesData = DEFAULT_CLASSES.map(name => ({
        id: `default-${name}`,
        name,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })) as Class[];
      setClasses(defaultClassesData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const defaultClassesData = DEFAULT_CLASSES.map(name => ({
      id: `default-${name}`,
      name,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })) as Class[];
    setClasses(defaultClassesData);
    
    if (user) {
      fetchClasses();
    }
  }, [user]);

  const activeClasses = classes
    .filter(c => c.is_active)
    .map(c => c.name)
    .sort((a, b) => {
      const aIsDefault = DEFAULT_CLASSES.includes(a.toUpperCase());
      const bIsDefault = DEFAULT_CLASSES.includes(b.toUpperCase());
      if (aIsDefault && !bIsDefault) return -1;
      if (!aIsDefault && bIsDefault) return 1;
      return a.localeCompare(b);
    });

  return (
    <ClassesContext.Provider value={{ classes, activeClasses, loading, refreshClasses: fetchClasses }}>
      {children}
    </ClassesContext.Provider>
  );
}

export function useClasses() {
  const context = useContext(ClassesContext);
  if (context === undefined) {
    throw new Error('useClasses must be used within a ClassesProvider');
  }
  return context;
}
