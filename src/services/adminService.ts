const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ADMIN_TOKEN_KEY = 'admin_session';

interface MenuItemData {
  title: string;
  price: number;
  description?: string;
  image_url?: string;
  category: string;
  published?: boolean;
}

const getAuthHeaders = () => {
  // Legacy token support for edge functions that still validate X-Admin-Token
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) return { 'X-Admin-Token': token };
  // Fallback: no token header (edge functions will need updating separately)
  return {};
};

export const adminService = {
  async login(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      // Store session token in localStorage
      if (data.sessionToken) {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.sessionToken);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Network error' };
    }
  },

  async logout(): Promise<{ success: boolean }> {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    return { success: true };
  },

  checkSession(): boolean {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return false;
    
    // Check if token is expired (8 hours)
    const parts = token.split(':');
    if (parts.length < 2) return false;
    
    const timestamp = parseInt(parts[0], 10);
    const now = Date.now();
    const eightHours = 8 * 60 * 60 * 1000;
    
    if (now - timestamp > eightHours) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      return false;
    }
    
    return true;
  },

  async createMenuItem(itemData: MenuItemData): Promise<{ success: boolean; item?: any; error?: string }> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ 
          action: 'create',
          title: itemData.title,
          price: itemData.price,
          description: itemData.description || null,
          image_url: itemData.image_url || null,
          category: itemData.category,
          published: itemData.published ?? true,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to create item' };
      }

      return { success: true, item: data.item };
    } catch (error: any) {
      console.error('Create item error:', error);
      return { success: false, error: error.message || 'Network error' };
    }
  },

  async updateMenuItem(id: string, itemData: Partial<MenuItemData>): Promise<{ success: boolean; item?: any; error?: string }> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ 
          id,
          action: 'update',
          ...itemData,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to update item' };
      }

      return { success: true, item: data.item };
    } catch (error: any) {
      console.error('Update item error:', error);
      return { success: false, error: error.message || 'Network error' };
    }
  },

  async deleteMenuItem(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ 
          id,
          action: 'delete',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to delete item' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Delete item error:', error);
      return { success: false, error: error.message || 'Network error' };
    }
  },

  async getAllItems(): Promise<{ success: boolean; items?: any[]; error?: string }> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-items`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to fetch items' };
      }

      return { success: true, items: data.items };
    } catch (error: any) {
      console.error('Fetch items error:', error);
      return { success: false, error: error.message || 'Network error' };
    }
  },
};
