import { Search, ArrowUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { useMenuCards, menuSections, groupCardsBySections, type MenuCard } from '@/hooks/useMenuCards';
import { Card } from '@/components/ui/card';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const Menu = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { data: menuCards, isLoading, error } = useMenuCards();
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll to a specific card when ?card=ID is present in the URL
  useEffect(() => {
    if (isLoading || !menuCards) return;
    const params = new URLSearchParams(location.search);
    const cardId = params.get('card');
    if (!cardId) return;

    let attempts = 0;
    const tryScroll = () => {
      const el = document.querySelector<HTMLElement>(`[data-card-index="${cardId}"]`);
      if (el) {
        const offset = 120;
        const pos = el.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: pos, behavior: 'smooth' });
        el.classList.add('ring-4', 'ring-[#c9a962]', 'ring-offset-2', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-[#c9a962]', 'ring-offset-2');
        }, 2500);
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryScroll, 150);
      }
    };
    setTimeout(tryScroll, 200);
  }, [isLoading, menuCards, location.search]);

  // Show scroll-to-top button once user scrolls past the 10th card
  useEffect(() => {
    const updateScrollTopVisibility = () => {
      // Use data-card-index='10' to find exactly the card labeled '10'
      const tenthCardEl = document.querySelector<HTMLElement>('[data-card-index="10"]');

      if (tenthCardEl) {
        // card is considered "scrolled beyond" when its bottom is near/past the top edge
        const rect = tenthCardEl.getBoundingClientRect();
        setShowScrollTop(rect.bottom < 100);
      } else {
        // Fallback for when card 10 is filtered out or missing
        setShowScrollTop(window.scrollY > 800);
      }
    };

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateScrollTopVisibility();
        ticking = false;
      });
    };

    updateScrollTopVisibility();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateScrollTopVisibility);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateScrollTopVisibility);
    };
  }, [searchQuery, menuCards]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const grouped = menuCards ? groupCardsBySections(menuCards) : {};

  const filterCards = (cards: MenuCard[]) => {
    if (!searchQuery.trim()) return cards;

    const searchTerms = searchQuery
      .toLowerCase()
      .trim()
      .split(/\s+/) // split by spaces for multi-word accuracy
      .filter(term => term.length > 0);

    return cards.filter((card) => {
      const searchableText = `${card.name || ''} ${card.description || ''} ${card.price || ''}`.toLowerCase();
      // Ensure ALL search terms are found in the card's text
      return searchTerms.every(term => searchableText.includes(term));
    });
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      const offset = 150;
      const pos = el.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: pos, behavior: 'smooth' });
    }
  };

  const shouldKeepEmptySection = (sectionId: string) =>
    sectionId === 'manual-brew' && !searchQuery.trim();

  if (isLoading) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#4a5f4a]/30 via-[#5a6f5a]/20 to-[#4a5f4a]/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#c9a962] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading menu...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#4a5f4a]/30 via-[#5a6f5a]/20 to-[#4a5f4a]/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">Failed to load menu. Please try again.</p>
        </div>
      </section>
    );
  }

  let visibleCardOrder = 0;

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#4a5f4a]/30 via-[#5a6f5a]/20 to-[#4a5f4a]/30">
      {/* Header with Search */}
      <div className="bg-[#4a5f4a]/95 backdrop-blur-md py-3 px-3 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <h1 className="text-lg sm:text-2xl font-cinzel font-bold text-white whitespace-nowrap text-center sm:text-left">
              Specialty Coffee
            </h1>
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

      {/* Section Navigation */}
      <div className="overflow-x-auto py-4 px-3 sm:px-6 lg:px-8 scrollbar-hide">
        <div className="container mx-auto">
          <div className="flex gap-3 sm:gap-4 min-w-max justify-start">
            {menuSections.map((section) => {
              const sectionCards = grouped[section.id] || [];
              if (sectionCards.length === 0 && !shouldKeepEmptySection(section.id)) return null;
              // Use the first card's image as section thumbnail
              const thumbImage = sectionCards[0]?.image_url || '/menu-images/manual-brew-1.jpg';
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="flex-shrink-0 w-28 sm:w-40 group cursor-pointer"
                >
                  <div className="relative overflow-hidden rounded-lg aspect-[4/3] mb-2">
                    <img
                      src={thumbImage}
                      alt={section.name}
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <p className="text-[#c9a962] text-sm font-medium text-center uppercase leading-tight">
                    {section.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Menu Cards Grid by Section */}
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 pb-20">
        {menuSections.map((section) => {
          const sectionCards = grouped[section.id] || [];
          const filtered = filterCards(sectionCards);
          if (filtered.length === 0 && !shouldKeepEmptySection(section.id)) return null;

          return (
            <div key={section.id} id={section.id} className="mb-16 scroll-mt-32">
              {/* Section Header */}
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-cinzel font-bold text-white mb-2 tracking-wide">
                  {section.name}
                </h2>
                <div className="w-16 h-0.5 bg-[#c9a962]" />
              </div>

              {/* Cards Grid */}
              {filtered.length > 0 && (
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.03 } }
                  }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-6"
                >
                  {filtered.map((card) => {
                    visibleCardOrder += 1;
                    const cardOrder = visibleCardOrder;

                    return (
                      <motion.div
                        key={card.id}
                        variants={{
                          hidden: { opacity: 0, y: -20 },
                          visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
                        }}
                      >
                        <Card
                          data-card-index={card.id}
                          data-card-order={cardOrder}
                          onClick={() => navigate(`/menu/${card.id}`)}
                          className="group overflow-hidden border-0 shadow-lg transition-all duration-300 bg-transparent cursor-pointer hover:shadow-[0_15px_30px_rgba(201,169,98,0.3)]"
                        >
                          {/* Image */}
                          <div className="relative overflow-hidden aspect-[4/3]">
                            <img
                              src={card.image_url || '/placeholder.svg'}
                              alt={card.name || ''}
                              loading={cardOrder <= 8 ? "eager" : "lazy"}
                              decoding="async"
                              fetchPriority={cardOrder <= 4 ? "high" : "auto"}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
                          </div>

                          {/* Golden Footer */}
                          <div className="bg-[#c9a962]/90 backdrop-blur-sm p-3 min-h-[5.5rem] flex flex-col justify-between transition-colors duration-300 group-hover:bg-[#c9a962]">
                            <h3 className="font-semibold text-white text-xs sm:text-sm md:text-base leading-tight mb-1 line-clamp-2">
                              {card.name}
                            </h3>
                            <div className="flex items-center justify-between">
                              <p className="text-white/90 font-bold text-sm sm:text-base md:text-lg transition-all duration-300 group-hover:text-white">
                                {card.price}
                              </p>
                              <p className="text-white/60 text-[10px] hidden md:block transition-all duration-300 group-hover:text-white/90">
                                Click for details
                              </p>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll to top FAB */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-4 sm:right-6 z-[70] w-11 h-11 rounded-full bg-[#c9a962] text-white shadow-lg flex items-center justify-center hover:bg-[#b8953a] transition-all duration-300 animate-in fade-in zoom-in"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </section>
  );
};

export default Menu;
