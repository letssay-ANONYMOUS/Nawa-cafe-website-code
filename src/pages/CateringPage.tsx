import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import cateringHeroImage from '@/assets/catering-hero.jpg';
import cateringCorporate from '@/assets/catering-corporate.jpg';
import cateringCtaBg from '@/assets/catering-cta-bg.jpg';
import cateringWedding from '@/assets/catering-wedding.jpg';
import cateringBrunch from '@/assets/catering-brunch.jpg';
import cateringOnsite from '@/assets/catering-onsite.jpg';

const CateringPage = () => {

  const occasions = [
    { image: cateringCorporate, title: "Corporate Events" },
    { image: cateringWedding, title: "Special Occasions" },
    { image: cateringBrunch, title: "Morning Events" },
    { image: cateringOnsite, title: "On-Site Service" },
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
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center text-white px-6">
              <h1 className="font-cinzel text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg tracking-wide">
                Elevated Catering
              </h1>
              <p className="text-lg md:text-xl max-w-xl mx-auto mb-10 drop-shadow-md opacity-90 font-light">
                Exceptional spreads and seamless service<br />for your special event.
              </p>
              <Button 
                size="lg" 
                className="bg-transparent hover:bg-[#c9a962]/20 text-white border border-[#c9a962] rounded-full px-10 py-6 text-lg shadow-lg min-h-[48px]"
                onClick={() => document.getElementById('cta-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Inquire Now
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Occasions – Visual Grid */}
      <section className="py-16 px-4 sm:px-8 lg:px-12 bg-coffee-50/50">
        <div className="container mx-auto">
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-coffee-900 text-center mb-10">
            Perfect For Every Occasion
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-5xl mx-auto">
            {occasions.map((item, index) => (
              <div key={index} className="relative rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[3/2] group cursor-pointer">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <h3 className="font-playfair text-lg sm:text-xl md:text-2xl font-bold text-white text-center drop-shadow-lg px-2">
                    {item.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta-section" className="relative py-24 px-6 overflow-hidden">
        <img src={cateringCtaBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="container mx-auto text-center relative z-10 text-white">
          <h2 className="font-playfair text-4xl md:text-5xl font-bold mb-6">
            Ready to Plan Your Event?
          </h2>
          <p className="text-lg text-cream-100 mb-10 max-w-xl mx-auto opacity-90">
            Let us make your event unforgettable.
          </p>
          <Button 
            size="lg" 
            className="bg-[#c9a962] hover:bg-[#b89952] text-white rounded-full px-12 py-6 text-lg font-semibold shadow-xl min-h-[48px]"
            onClick={() => window.location.href = '/contact'}
          >
            Connect With Us
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CateringPage;
