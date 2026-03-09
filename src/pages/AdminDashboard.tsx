import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Edit, Plus, LogOut, ChefHat } from 'lucide-react';

interface MenuItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  tags: string[] | null;
  image_url: string | null;
  published: boolean;
}

const AdminDashboard = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    tags: '',
    published: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          if (mounted) navigate('/staff/login', { replace: true });
          return;
        }

        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .in('role', ['staff', 'admin'])
          .limit(1);

        if (!roles || roles.length === 0) {
          await supabase.auth.signOut();
          if (mounted) navigate('/staff/login', { replace: true });
          return;
        }

        if (mounted) {
          setAuthChecked(true);
          loadItems();
        }
      } catch {
        if (mounted) navigate('/staff/login', { replace: true });
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && mounted) {
        setAuthChecked(false);
        navigate('/staff/login', { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadItems = async () => {
    const token = sessionStorage.getItem('admin_session');
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-items', {
        method: 'GET',
        headers: token ? { 'x-admin-token': token } : {},
      });

      if (error) throw error;
      setItems(data.items || []);
    } catch (error) {
      console.error('Error loading items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load menu items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/staff/login');
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      price: '',
      category: '',
      tags: '',
      published: false,
    });
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      tags: item.tags?.join(', ') || '',
      published: item.published,
    });
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const token = sessionStorage.getItem('admin_session');

    try {
      const { error } = await supabase.functions.invoke('admin-item', {
        body: { id, action: 'delete' },
        headers: token ? { 'x-admin-token': token } : {},
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Item deleted successfully',
      });
      loadItems();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    const token = sessionStorage.getItem('admin_session');

    try {
      const { data: urlData, error: urlError } = await supabase.functions.invoke('admin-upload-url', {
        body: { 
          fileName: imageFile.name,
          contentType: imageFile.type,
        },
        headers: token ? { 'x-admin-token': token } : {},
      });

      if (urlError) throw urlError;

      const { data, error } = await supabase.storage
        .from('menu-images')
        .upload(urlData.path, imageFile);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let imageUrl = editingItem?.image_url || null;

      if (imageFile) {
        imageUrl = await uploadImage();
      }

      const itemData = {
        title: formData.title,
        description: formData.description || null,
        price: parseFloat(formData.price),
        category: formData.category,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null,
        image_url: imageUrl,
        published: formData.published,
      };

      const token = sessionStorage.getItem('admin_session');
      const headers = token ? { 'x-admin-token': token } : {};

      if (editingItem) {
        const { error } = await supabase.functions.invoke('admin-item', {
          body: { id: editingItem.id, action: 'update', ...itemData },
          headers,
        });
        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Item updated successfully',
        });
      } else {
        const { error } = await supabase.functions.invoke('admin-items', {
          body: { action: 'create', ...itemData },
          headers,
        });
        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Item created successfully',
        });
      }

      setDialogOpen(false);
      loadItems();
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save item',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/kitchen')}>
              <ChefHat className="w-4 h-4 mr-2" />
              Kitchen Orders
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Edit Item' : 'Create Item'}</DialogTitle>
                  <DialogDescription>
                    {editingItem ? 'Update the menu item details' : 'Add a new menu item'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="appetizer, spicy, vegetarian"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="image">Image</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="published"
                      checked={formData.published}
                      onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                    />
                    <Label htmlFor="published">Published</Label>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingItem ? 'Update' : 'Create'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{item.title}</CardTitle>
                      <CardDescription>
                        {item.category} - ${item.price}
                        {!item.published && <span className="ml-2 text-destructive">(Unpublished)</span>}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(item)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  {item.tags && (
                    <div className="flex gap-2 mt-2">
                      {item.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-secondary px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.image_url && (
                    <img src={item.image_url} alt={item.title} className="mt-4 w-32 h-32 object-cover rounded" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
