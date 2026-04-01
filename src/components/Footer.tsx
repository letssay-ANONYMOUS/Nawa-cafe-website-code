import { Star, Save, LogOut, Loader2, MapPin, Phone, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AdminPasswordModal } from './AdminPasswordModal';
import { useAdmin } from '@/contexts/AdminContext';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { adminService } from '@/services/adminService';

const Footer = () => {
  const [clickCount, setClickCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { isAdmin, setIsAdmin, pendingChanges, hasPendingChanges, clearPendingChanges } = useAdmin();
  const { toast } = useToast();

  useEffect(() => {
    if (clickCount > 0) {
      const timer = setTimeout(() => setClickCount(0), 2000);
      return () => clearTimeout(timer);
    }
  }, [clickCount]);

  const handleCopyrightClick = () => {
    if (isAdmin) return;
    
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount >= 5) {
      setShowPasswordModal(true);
      setClickCount(0);
    }
  };

  const handleLogout = async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.auth.signOut();
    setIsAdmin(false);
    clearPendingChanges();
    toast({
      title: 'Logged out',
      description: 'Admin mode deactivated. All unsaved changes were discarded.',
    });
  };

  const handleSave = async () => {
    if (!hasPendingChanges()) return;
    
    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const change of pendingChanges) {
        if (change.page !== 'menu') {
          // For now, only menu items are stored in database
          successCount++;
          continue;
        }

        if (change.type === 'add' && change.data) {
          const result = await adminService.createMenuItem({
            title: change.data.name,
            price: change.data.price,
            description: change.data.description,
            image_url: change.data.image,
            category: change.category || change.data.category || 'uncategorized',
            published: true,
          });
          
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.error('Failed to create item:', result.error);
          }
        } else if (change.type === 'edit' && change.id && change.data) {
          const result = await adminService.updateMenuItem(String(change.id), {
            title: change.data.name,
            price: change.data.price,
            description: change.data.description,
            image_url: change.data.image,
            category: change.category || change.data.category,
          });
          
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.error('Failed to update item:', result.error);
          }
        } else if (change.type === 'delete' && change.id) {
          const result = await adminService.deleteMenuItem(String(change.id));
          
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.error('Failed to delete item:', result.error);
          }
        }
      }

      clearPendingChanges();

      if (errorCount === 0) {
        toast({
          title: 'Changes saved',
          description: `${successCount} change(s) applied successfully.`,
        });
      } else {
        toast({
          title: 'Partial success',
          description: `${successCount} succeeded, ${errorCount} failed. Check console for details.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <footer className="bg-coffee-800 text-white py-10 sm:py-12">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2">
            <div className="flex items-center space-x-2 mb-3 sm:mb-4">
              <img src="/nawa-logo.png" alt="Nawa Cafe Logo" className="h-8 sm:h-10 w-auto object-contain brightness-0 invert" />
              <span className="font-playfair text-xl sm:text-2xl font-bold">
                NAWA CAFÉ
              </span>
            </div>
            <p className="text-cream-200 text-sm sm:text-base leading-relaxed mb-3 sm:mb-4">
              An immersive coffee experience where artistry meets cuisine. Experience gourmet coffee, 
              authentic dishes, and unforgettable moments in Al Ain.
            </p>
            <a 
              href="https://www.google.com/maps/place/NAWA+Cafe/@24.2454332,55.7114633,17z/data=!3m1!4b1!4m6!3m5!1s0x3e8ab391028950b1:0xe99373a583558a82!8m2!3d24.2454332!4d55.7140382!16s%2Fg%2F11rr27q630"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 hover:opacity-80 transition-opacity mb-4"
            >
              {Array.from({ length: 5 }, (_, index) => (
                <Star key={index} className={`w-4 h-4 ${index < 4 ? 'text-amber-400 fill-current' : 'text-amber-400 fill-current opacity-70'}`} />
              ))}
              <span className="ml-2 text-cream-200">4.7/5 Customer Rating</span>
            </a>
            <div className="flex space-x-4">
              <a 
                href="https://www.facebook.com/people/NAWA-Speciality-Coffee/100090559457646/?mibextid=LQQJ4d" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cream-200 hover:text-cream-100 transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a 
                href="https://www.instagram.com/nawacafe_uae/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cream-200 hover:text-cream-100 transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a 
                href="https://www.tiktok.com/@nawacafe_uae" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cream-200 hover:text-cream-100 transition-colors"
                aria-label="TikTok"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a 
                href="https://www.snapchat.com/add/nawacafe" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cream-200 hover:text-cream-100 transition-colors"
                aria-label="Snapchat"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3 0 .73-.091 1.102-.18.238-.06.45-.12.602-.12.124 0 .229.015.313.044.334.118.443.369.443.57 0 .396-.334.791-.88 1.002-.545.21-1.227.337-1.736.337-.3 0-.547-.06-.697-.18-.09-.075-.15-.165-.18-.27-.045-.15-.06-.346-.06-.569 0-.226.015-.465.045-.645.03-.18.075-.3.165-.345.089-.045.224-.06.419-.06.21 0 .479.03.763.09.18.03.375.075.57.12.015-.226.03-.465.045-.716.03-.495.075-1.047.105-1.584.03-.524.045-1.032.045-1.485 0-2.055-.9-3.821-2.385-4.424-.6-.24-1.26-.36-1.935-.36-.779 0-1.545.15-2.22.42-1.485.585-2.565 2.1-2.565 4.364 0 .45.015.945.045 1.47.03.524.075 1.062.12 1.56.015.241.03.48.045.705.195-.045.375-.09.555-.12.3-.06.585-.09.795-.09.195 0 .33.015.42.06.089.045.134.165.164.345.03.18.045.42.045.645 0 .223-.015.42-.06.569-.03.105-.09.195-.18.27-.15.12-.396.18-.697.18-.51 0-1.19-.127-1.736-.337-.546-.211-.88-.606-.88-1.002 0-.201.109-.452.443-.57.084-.029.189-.044.313-.044.152 0 .364.06.602.12.372.089.802.18 1.102.18.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847 1.583-3.545 4.94-3.821 5.93-3.821zm.029 18.897c.645 0 1.26.15 1.785.42.705.36 1.29.855 1.695 1.425.03.045.075.105.135.195.09.135.18.27.27.405.21.3.42.585.585.795.12.15.21.24.255.285.045.03.135.075.285.075.15 0 .255-.045.33-.105.09-.075.165-.18.21-.315.015-.045.015-.09.03-.135v-.015c0-.015 0-.03.015-.045.015-.015.03-.03.045-.045.09-.09.195-.135.33-.135.135 0 .255.045.345.135s.135.21.135.345c0 .18-.06.345-.165.465-.12.135-.285.21-.48.21-.24 0-.435-.075-.615-.21-.165-.135-.33-.33-.48-.555-.135-.21-.27-.405-.405-.615-.135-.195-.255-.36-.36-.48-.405-.48-.915-.885-1.485-1.155-.51-.24-1.08-.36-1.65-.36s-1.14.12-1.65.36c-.57.27-1.08.675-1.485 1.155-.105.12-.225.285-.36.48-.135.21-.27.405-.405.615-.15.225-.315.42-.48.555-.18.135-.375.21-.615.21-.195 0-.36-.075-.48-.21-.105-.12-.165-.285-.165-.465 0-.135.045-.255.135-.345s.21-.135.345-.135c.135 0 .24.045.33.135.015.015.03.03.045.045.015.015.015.03.015.045v.015c.015.045.015.09.03.135.045.135.12.24.21.315.075.06.18.105.33.105.15 0 .24-.045.285-.075.045-.045.135-.135.255-.285.165-.21.375-.495.585-.795.09-.135.18-.27.27-.405.06-.09.105-.15.135-.195.405-.57.99-1.065 1.695-1.425.525-.27 1.14-.42 1.785-.42z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-playfair text-xl font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/menu" className="text-cream-200 hover:text-cream-100 transition-colors duration-200 block">
                  Our Menu
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-cream-200 hover:text-cream-100 transition-colors duration-200 block">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/catering" className="text-cream-200 hover:text-cream-100 transition-colors duration-200 block">
                  Catering
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-cream-200 hover:text-cream-100 transition-colors duration-200 block">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="overflow-hidden">
            <h3 className="font-playfair text-xl font-semibold mb-4">Contact</h3>
            <div className="space-y-3 text-cream-200">
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#c9a962] flex-shrink-0" /> Al Ain</p>
              <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#c9a962] flex-shrink-0" /> United Arab Emirates</p>
              <a href="tel:037800030" className="flex items-center gap-2 hover:text-cream-100 transition-colors">
                <Phone className="w-4 h-4 text-[#c9a962] flex-shrink-0" /> 037800030
              </a>
              <a href="tel:0506584176" className="flex items-center gap-2 hover:text-cream-100 transition-colors">
                <Phone className="w-4 h-4 text-[#c9a962] flex-shrink-0" /> 0506584176
              </a>
              <a href="mailto:support@nawacafe.com" className="flex items-center gap-2 hover:text-cream-100 transition-colors overflow-hidden">
                <Mail className="w-4 h-4 text-[#c9a962] flex-shrink-0" /> <span className="truncate">support@nawacafe.com</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-coffee-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <p 
                className={`text-cream-300 text-sm ${!isAdmin ? 'cursor-pointer select-none' : ''}`}
                onClick={handleCopyrightClick}
              >
                © {new Date().getFullYear()} NAWA CAFÉ. All rights reserved.
              </p>
              
              {isAdmin && (
                <div className="flex gap-2">
                  {hasPendingChanges() && (
                    <Button
                      onClick={handleSave}
                      className="bg-coffee-600 hover:bg-coffee-700 text-white"
                      size="sm"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="text-white border-white hover:bg-white/20"
                    disabled={isSaving}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              )}
            </div>
            
          <div className="flex flex-wrap gap-4 sm:space-x-6 justify-center sm:justify-end">
              <button className="text-cream-300 hover:text-cream-100 transition-colors duration-200 text-xs sm:text-sm">
                Privacy Policy
              </button>
              <button className="text-cream-300 hover:text-cream-100 transition-colors duration-200 text-xs sm:text-sm">
                Terms of Service
              </button>
              <button className="text-cream-300 hover:text-cream-100 transition-colors duration-200 text-xs sm:text-sm">
                Cookie Policy
              </button>
            </div>
          </div>
        </div>
      </div>
      <AdminPasswordModal open={showPasswordModal} onOpenChange={setShowPasswordModal} />
    </footer>
    </>
  );
};

export default Footer;
