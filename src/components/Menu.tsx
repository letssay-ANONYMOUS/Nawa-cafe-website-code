import { Search, Plus, FolderPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminCardModal } from './AdminCardModal';
import { AdminSectionModal } from './AdminSectionModal';
import { AdminDeleteConfirm } from './AdminDeleteConfirm';
import { useToast } from '@/hooks/use-toast';
import { useMenuItems, menuCategories, groupMenuItems, toMenuCardItem } from '@/hooks/useMenuItems';
import MenuCard from './MenuCard';
import FlippableMenuCard from './FlippableMenuCard';

const Menu = () => {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { isAdmin, addPendingChange } = useAdmin();
  const { toast } = useToast();
  const [showCardModal, setShowCardModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [deletingCard, setDeletingCard] = useState<any>(null);

  // Fetch menu items from database
  const { data: menuItems, isLoading, error } = useMenuItems();
  const groupedMenu = menuItems ? groupMenuItems(menuItems) : {};

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 150;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const menuCategoriesForAdmin = menuCategories.map(cat => ({
    id: cat.id,
    name: cat.name,
    sections: Object.keys(groupedMenu[cat.id] || {})
  }));

  const handleAddNew = () => {
    setEditingCard(null);
    setShowCardModal(true);
  };

  const handleEdit = (item: any) => {
    setEditingCard(item);
    setShowCardModal(true);
  };

  const handleDelete = (item: any) => {
    setDeletingCard(item);
    setShowDeleteConfirm(true);
  };

  const handleSaveCard = (data: any) => {
    addPendingChange({
      type: editingCard ? 'edit' : 'add',
      page: 'menu',
      category: data.category,
      section: data.section,
      data,
      id: editingCard?.id
    });
  };

  const confirmDelete = () => {
    addPendingChange({
      type: 'delete',
      page: 'menu',
      id: deletingCard.id
    });
    setShowDeleteConfirm(false);
    toast({
      title: 'Changes staged',
      description: 'Card deletion staged. Click Save in footer to apply.',
    });
  };

  const handleSaveSection = (type: 'category' | 'section', data: any) => {
    addPendingChange({
      type: 'add',
      page: 'menu',
      data: { type, ...data }
    });
  };

  // Filter items based on search query
  const filterItems = (items: any[]) => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      String(item.price).includes(query)
    );
  };

  if (isLoading) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#4a5f4a]/30 via-[#5a6f5a]/20 to-[#4a5f4a]/30 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#c9a962] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading menu...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#4a5f4a]/30 via-[#5a6f5a]/20 to-[#4a5f4a]/30 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">Failed to load menu. Please try again.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#4a5f4a]/30 via-[#5a6f5a]/20 to-[#4a5f4a]/30 backdrop-blur-sm">
      {/* Header with Search */}
       <div className="bg-[#4a5f4a]/80 backdrop-blur-md py-3 px-3 sm:px-6 lg:px-8 sticky top-16 z-10">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <h1 className="text-lg sm:text-2xl font-cinzel font-bold text-white whitespace-nowrap text-center sm:text-left">Specialty Coffee</h1>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-coffee-700 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search Item By Name, Price Or Description."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full bg-[#c9a962] border-none text-coffee-900 placeholder:text-coffee-700 rounded-lg h-11"
              />
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  onClick={handleAddNew}
                  className="bg-coffee-600 hover:bg-coffee-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Card
                </Button>
                <Button
                  onClick={() => setShowSectionModal(true)}
                  variant="outline"
                  className="bg-coffee-100 hover:bg-coffee-200 text-coffee-900"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Add Category/Section
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="overflow-x-auto py-4 px-3 sm:px-6 lg:px-8 scrollbar-hide">
        <div className="container mx-auto">
          <div className="flex gap-3 sm:gap-4 min-w-max justify-start">
            {menuCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => scrollToSection(category.id)}
                className="flex-shrink-0 w-28 sm:w-40 group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-lg aspect-[4/3] mb-2">
                  <img
                    src={category.image}
                    alt={category.name}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <p className="text-[#c9a962] text-sm font-medium text-center uppercase leading-tight">
                  {category.name}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Cards Grid */}
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 pb-20">
        {(() => {
          let globalIndex = 0; // Track global card index across all categories
          
          return menuCategories.map((category) => {
            const categoryData = groupedMenu[category.id];
            if (!categoryData || Object.keys(categoryData).length === 0) return null;
            
            return (
              <div key={category.id} id={category.id} className="mb-16 scroll-mt-32">
                {/* Section Header */}
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-cinzel font-bold text-white mb-2 tracking-wide">
                    {category.name}
                  </h2>
                  <div className="w-16 h-0.5 bg-[#c9a962]" />
                </div>

                {/* Subsections */}
                {Object.entries(categoryData).map(([subsectionName, items]) => {
                  const filteredItems = filterItems(items);
                  if (filteredItems.length === 0) return null;
                  
                  return (
                    <div key={subsectionName} className="mb-12">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-cinzel font-semibold text-[#c9a962] mb-4 sm:mb-6">
                        {subsectionName}
                      </h3>
                      
                      {/* Items Grid with Lazy Loading */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-6">
                        {filteredItems.map((item) => {
                          const cardItem = toMenuCardItem(item);
                          const currentIndex = globalIndex;
                          globalIndex++;
                          
                          // First 4 cards use FlippableMenuCard
                          if (currentIndex < 4) {
                            return (
                              <FlippableMenuCard
                                key={item.id}
                                item={cardItem}
                                cardNumber={item.card_number}
                                category={category.id}
                              />
                            );
                          }
                          
                          return (
                            <MenuCard
                              key={item.id}
                              item={cardItem}
                              cardNumber={item.card_number}
                              eagerLoad={true}
                              onEdit={() => handleEdit(item)}
                              onDelete={() => handleDelete(item)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}
      </div>

      {/* Modal for Card Details */}
      <Dialog open={selectedCard !== null} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="bg-[#4a5f4a] border-[#c9a962] text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#c9a962]">
              Item {selectedCard}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-white/80">Content will be added here...</p>
          </div>
        </DialogContent>
      </Dialog>

      <AdminCardModal
        open={showCardModal}
        onOpenChange={setShowCardModal}
        onSave={handleSaveCard}
        initialData={editingCard}
        title={editingCard ? 'Edit Card' : 'Add New Card'}
        page="menu"
        categories={menuCategoriesForAdmin}
      />

      <AdminSectionModal
        open={showSectionModal}
        onOpenChange={setShowSectionModal}
        onSave={handleSaveSection}
        existingCategories={menuCategories.map(c => ({ id: c.id, name: c.name }))}
      />

      <AdminDeleteConfirm
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={confirmDelete}
        itemName={deletingCard?.name || deletingCard?.title || ''}
      />
    </section>
  );
};

export default Menu;
