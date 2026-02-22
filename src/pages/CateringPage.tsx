import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, X } from 'lucide-react';
import cateringHeroImage from '@/assets/catering-hero.jpg';

import cateringMeal from '@/assets/catering-meal.jpg';
import cateringCorporate from '@/assets/catering-corporate.jpg';
import cateringWedding from '@/assets/catering-wedding.jpg';
import cateringBrunch from '@/assets/catering-brunch.jpg';
import cateringOnsite from '@/assets/catering-onsite.jpg';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminCardModal } from '@/components/AdminCardModal';
import { AdminDeleteConfirm } from '@/components/AdminDeleteConfirm';
import { useToast } from '@/hooks/use-toast';

const CateringPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { isAdmin, addPendingChange } = useAdmin();
  const { toast } = useToast();
  const [showCardModal, setShowCardModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [deletingCard, setDeletingCard] = useState<any>(null);

  const initialServices = [
    {
      image: cateringMeal,
      title: "Full Meal Catering",
      description: "Complete meal service featuring fresh, locally-sourced ingredients and customizable menu options.",
      features: ["Breakfast & brunch", "Lunch spreads", "Dinner packages"]
    },
    {
      image: cateringCorporate,
      title: "Corporate Events",
      description: "Perfect for business meetings, conferences, and corporate gatherings of all sizes.",
      features: ["Meeting refreshments", "Conference catering", "Team building events"]
    }
  ];

  const [services, setServices] = useState(initialServices);

  const handleAddNew = () => {
    setEditingCard(null);
    setShowCardModal(true);
  };

  const handleEdit = (service: any) => {
    setEditingCard(service);
    setShowCardModal(true);
  };

  const handleDelete = (service: any) => {
    setDeletingCard(service);
    setShowDeleteConfirm(true);
  };

  const handleSave = (data: any) => {
    addPendingChange({
      type: editingCard ? 'edit' : 'add',
      page: 'catering',
      data,
      id: editingCard?.title
    });
    
    if (editingCard) {
      setServices(services.map(s => s.title === editingCard.title ? { ...s, title: data.name, description: data.description } : s));
    } else {
      setServices([...services, {
        image: cateringMeal,
        title: data.name,
        description: data.description,
        features: ["Premium service", "Professional staff", "Custom options"]
      }]);
    }
  };

  const confirmDelete = () => {
    addPendingChange({
      type: 'delete',
      page: 'catering',
      id: deletingCard.title
    });
    
    setServices(services.filter(s => s.title !== deletingCard.title));
    setShowDeleteConfirm(false);
    toast({
      title: 'Changes staged',
      description: 'Card deletion staged. Click Save in footer to apply.',
    });
  };

  const occasions = [
    { image: cateringCorporate, title: "Corporate Events" },
    { image: cateringWedding, title: "Special Occasions" },
    { image: cateringBrunch, title: "Morning Events" },
    { image: cateringOnsite, title: "On-Site Service" },
  ];

  const packages = [
    {
      name: "Essentials",
      price: "AED 55/person",
      includes: ["Coffee & tea station", "Pastries & snacks", "2-hour service"]
    },
    {
      name: "Premium",
      price: "AED 130/person",
      includes: ["Full coffee bar", "Gourmet food", "4-hour service", "Professional staff"]
    },
    {
      name: "Deluxe",
      price: "AED 240/person",
      includes: ["Signature drinks", "Multi-course meals", "Full-day service", "Event coordinator"]
    }
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-0 overflow-hidden">
        <div className="relative h-[500px] md:h-[600px]">
          <img 
            src={cateringHeroImage} 
            alt="NAWA Café Catering Services" 
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex items-end justify-center pb-16 md:pb-20">
            <div className="text-center text-white px-6">
              <h1 className="font-playfair text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg">
                Catering Services
              </h1>
              <p className="text-lg md:text-xl max-w-xl mx-auto mb-8 drop-shadow-md opacity-90">
                We bring the café experience to your events.
              </p>
              <Button 
                size="lg" 
                className="bg-[#c9a962] hover:bg-[#b89952] text-white rounded-full px-10 py-6 text-lg shadow-lg"
                onClick={() => document.getElementById('cta-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Get a Quote
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services – Image Cards */}
      <section className="py-16 px-6 sm:px-8 lg:px-12">
        <div className="container mx-auto">
          <div className="flex justify-between items-center mb-10">
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-coffee-900">
              What We Offer
            </h2>
            {isAdmin && (
              <Button onClick={handleAddNew} className="bg-coffee-600 hover:bg-coffee-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Card
              </Button>
            )}
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <div key={index} className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                {isAdmin && (
                  <div className="absolute top-3 right-3 flex gap-2 z-10">
                    <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 hover:bg-white" onClick={() => handleEdit(service)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDelete(service)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={service.image} 
                    alt={service.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="font-playfair text-2xl font-bold mb-1">{service.title}</h3>
                  <p className="text-sm opacity-85 line-clamp-2">{service.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Occasions – Visual Grid */}
      <section className="py-16 px-6 sm:px-8 lg:px-12 bg-coffee-50/50">
        <div className="container mx-auto">
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-coffee-900 text-center mb-10">
            Perfect For Every Occasion
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {occasions.map((item, index) => (
              <div key={index} className="relative rounded-xl overflow-hidden aspect-square group cursor-pointer">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <h3 className="font-playfair text-xl md:text-2xl font-bold text-white text-center drop-shadow-lg">
                    {item.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages – Compact */}
      <section className="py-16 px-6 sm:px-8 lg:px-12">
        <div className="container mx-auto">
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-coffee-900 text-center mb-10">
            Packages
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg, index) => (
              <Card key={index} className={`border-coffee-200 hover:shadow-xl transition-all duration-300 ${index === 1 ? 'ring-2 ring-[#c9a962] scale-[1.02]' : ''}`}>
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl font-playfair text-coffee-900">{pkg.name}</CardTitle>
                  <p className="text-3xl font-bold text-[#c9a962] mt-1">{pkg.price}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-5">
                    {pkg.includes.map((item, idx) => (
                      <li key={idx} className="flex items-center text-coffee-700 text-sm">
                        <span className="w-1.5 h-1.5 bg-[#c9a962] rounded-full mr-2.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full bg-coffee-600 hover:bg-coffee-700 text-white rounded-full">
                    Select
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta-section" className="relative py-24 px-6 overflow-hidden">
        <img src={cateringMeal} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-coffee-900/80" />
        <div className="container mx-auto text-center relative z-10 text-white">
          <h2 className="font-playfair text-4xl md:text-5xl font-bold mb-6">
            Ready to Plan Your Event?
          </h2>
          <p className="text-lg text-cream-100 mb-10 max-w-xl mx-auto opacity-90">
            Let us make your event unforgettable.
          </p>
          <Button 
            size="lg" 
            className="bg-[#c9a962] hover:bg-[#b89952] text-white rounded-full px-12 py-6 text-lg font-semibold shadow-xl"
            onClick={() => window.location.href = 'mailto:nawacafe22@gmail.com?subject=Catering Inquiry&body=Hello NAWA Café Team, I would like to inquire about your catering services. Please contact me at: 037800030 or 0506584176'}
          >
            Connect With Us
          </Button>
        </div>
      </section>

      <Footer />

      <AdminCardModal
        open={showCardModal}
        onOpenChange={setShowCardModal}
        onSave={handleSave}
        initialData={editingCard ? { name: editingCard.title, description: editingCard.description, price: 0, image: '' } : undefined}
        title={editingCard ? 'Edit Card' : 'Add New Card'}
        page="catering"
      />

      <AdminDeleteConfirm
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={confirmDelete}
        itemName={deletingCard?.title || ''}
      />
    </div>
  );
};

export default CateringPage;
