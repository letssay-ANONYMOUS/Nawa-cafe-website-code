import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAdmin } from '@/contexts/AdminContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AdminPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminPasswordModal = ({ open, onOpenChange }: AdminPasswordModalProps) => {
  const [email, setEmail] = useState('nawacafe22@gmail.com');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setIsAdmin } = useAdmin();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter email and password',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      // Verify user has staff or admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id);

      const hasAccess = roles?.some(r => r.role === 'staff' || r.role === 'admin');

      if (!hasAccess) {
        await supabase.auth.signOut();
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges.',
          variant: 'destructive',
        });
        return;
      }

      setIsAdmin(true);
      onOpenChange(false);
      toast({
        title: 'Success',
        description: 'Admin mode activated',
      });
      setPassword('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to authenticate. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin Login</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter admin email"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleLogin()}
              placeholder="Enter password"
              disabled={isLoading}
            />
          </div>
          <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Authenticating...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
