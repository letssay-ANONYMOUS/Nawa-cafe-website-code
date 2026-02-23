import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useMenuCards } from '@/hooks/useMenuCards';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

const Menu = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: menuCards, isLoading, error } = useMenuCards();
  const navigate = useNavigate();

  const filteredCards = (menuCards || []).filter((card) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      card.name?.toLowerCase().includes(q) ||
      card.description?.toLowerCase().includes(q) ||
      card.price?.toLowerCase().includes(q)
    );
  });

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
          </div>
        </div>
      </div>

      {/* Menu Cards Grid - flat list ordered by ID */}
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-8 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-6">
          {filteredCards.map((card) => (
            <Card
              key={card.id}
              onClick={() => navigate(`/menu/${card.id}`)}
              className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-transparent cursor-pointer"
            >
              {/* Image */}
              <div className="relative overflow-hidden aspect-[4/3]">
                <img
                  src={card.image_url || '/placeholder.svg'}
                  alt={card.name || ''}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />

                {/* Card Number Badge */}
                <div className="absolute top-2 left-2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg z-10">
                  <span className="text-white font-bold text-lg">{card.id}</span>
                </div>
              </div>

              {/* Golden Footer */}
              <div className="bg-[#c9a962]/90 backdrop-blur-sm p-3 min-h-[5.5rem] flex flex-col justify-between">
                <h3 className="font-semibold text-white text-xs sm:text-sm md:text-base leading-tight mb-1 line-clamp-2">
                  {card.name}
                </h3>
                <div className="flex items-center justify-between">
                  <p className="text-white/90 font-bold text-sm sm:text-base md:text-lg">
                    {card.price}
                  </p>
                  <p className="text-white/60 text-[10px] hidden md:block">
                    Click for details
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Menu;
