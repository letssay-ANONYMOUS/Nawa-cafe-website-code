import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

/** Guards customer-only routes. Redirects to /login when no session exists. */
const CustomerAuthGate = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useCustomerAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default CustomerAuthGate;
