import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Class } from '../types';

interface ClassesContextType {
  classes: Class[];
  activeClasses: string[];
  loading: boolean;
  refreshClasses: () => Promise<void>;
}

const ClassesContext = createContext<ClassesContextType | undefined>(undefined);

// Default classes that must always exist
const DEFAULT_CLASSES = ['JCP03', 'C2A', 'C2B', 'S2A', 'S2B', 'C1A', 'C1B', 'C1C', 'S1A', 'S1B'];

export function ClassesProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false); // Start as false since we have defaults

  async function fetchClasses() {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Ensure default classes exist immediately
      const existingClasses = (data || []).map(c => c.name.toUpperCase());
      
      const missingClasses = DEFAULT_CLASSES.filter(
        defaultClass => !existingClasses.includes(defaultClass.toUpperCase())
      );
      
      if (missingClasses.length > 0) {
        // Insert missing default classes immediately
        const classesToInsert = missingClasses.map(name => ({
          name,
          is_active: true
        }));
        
        const { error: insertError } = await supabase
          .from('classes')
          .insert(classesToInsert);
        
        if (!insertError) {
          // Re-fetch classes after insertion
          const { data: updatedData, error: fetchError } = await supabase
            .from('classes')
            .select('*')
            .order('name', { ascending: true });
          
          if (!fetchError) {
            setClasses(updatedData || []);
          } else {
            // If fetch fails, use defaults as fallback
            const defaultClassesData = DEFAULT_CLASSES.map(name => ({
              id: `default-${name}`,
              name,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })) as Class[];
            setClasses(defaultClassesData);
          }
        } else {
          // If insert fails, merge with defaults
          const defaultClassesData = DEFAULT_CLASSES.map(name => ({
            id: `default-${name}`,
            name,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })) as Class[];
          setClasses([...defaultClassesData, ...(data || [])]);
        }
      } else {
        setClasses(data || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      // On error, use defaults as fallback
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
    // Immediately initialize with default classes
    const defaultClassesData = DEFAULT_CLASSES.map(name => ({
      id: `default-${name}`,
      name,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })) as Class[];
    setClasses(defaultClassesData);
    
    // Then fetch from database
    fetchClasses();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('classes_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'classes' },
        () => {
          fetchClasses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activeClasses = classes
    .filter(c => c.is_active)
    .map(c => c.name)
    .sort((a, b) => {
      // Sort defaults first, then others alphabetically
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

