import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PendingChange {
  type: 'add' | 'edit' | 'delete';
  page: 'menu' | 'catering' | 'store';
  category?: string;
  section?: string;
  data?: any;
  id?: string | number;
}

interface AdminContextType {
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  pendingChanges: PendingChange[];
  addPendingChange: (change: PendingChange) => void;
  clearPendingChanges: () => void;
  hasPendingChanges: () => boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);

  useEffect(() => {
    // Check if there's an existing session with admin/staff role
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);
        const hasAccess = roles?.some(r => r.role === 'staff' || r.role === 'admin');
        if (hasAccess) setIsAdmin(true);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setPendingChanges([]);
      } else if (event === 'SIGNED_IN' && session?.user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);
        const hasAccess = roles?.some(r => r.role === 'staff' || r.role === 'admin');
        if (hasAccess) setIsAdmin(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const addPendingChange = (change: PendingChange) => {
    setPendingChanges(prev => [...prev, change]);
  };

  const clearPendingChanges = () => {
    setPendingChanges([]);
  };

  const hasPendingChanges = () => {
    return pendingChanges.length > 0;
  };

  return (
    <AdminContext.Provider value={{ 
      isAdmin, 
      setIsAdmin, 
      pendingChanges, 
      addPendingChange, 
      clearPendingChanges,
      hasPendingChanges 
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};
