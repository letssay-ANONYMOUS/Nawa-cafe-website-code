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

/** Fire-and-forget role check – never awaited inside onAuthStateChange */
function checkRoleAndSet(
  userId: string,
  setIsAdmin: (v: boolean) => void,
) {
  Promise.resolve(
    supabase
      .rpc('has_role', { _user_id: userId, _role: 'admin' })
      .then(({ data: isAdmin }) => {
        if (isAdmin) {
          setIsAdmin(true);
          return;
        }
        return supabase
          .rpc('has_role', { _user_id: userId, _role: 'staff' })
          .then(({ data: isStaff }) => {
            if (isStaff) setIsAdmin(true);
          });
      }),
  ).catch((err) => console.error('Role check failed:', err));
}

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);

  useEffect(() => {
    // 1. Restore session from localStorage first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkRoleAndSet(session.user.id, setIsAdmin);
      }
    });

    // 2. Listen for auth changes – NO async/await inside callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
          setPendingChanges([]);
        } else if (
          event === 'SIGNED_IN' &&
          session?.user
        ) {
          // Fire-and-forget – avoids deadlock
          checkRoleAndSet(session.user.id, setIsAdmin);
        }
      },
    );

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
