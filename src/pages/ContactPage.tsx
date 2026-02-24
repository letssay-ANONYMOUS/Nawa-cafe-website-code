import Header from '@/components/Header';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import homeSpread from '@/assets/home-spread.jpg';

const ContactPage = () => {

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative h-[350px] md:h-[450px]">
        <img 
          src={homeSpread} 
          alt="NAWA Cafe" 
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-6">
            <span className="font-cinzel text-xs sm:text-sm tracking-[0.3em] uppercase text-coffee-300 mb-3 block">
              Get In Touch
            </span>
            <h1 className="font-cinzel text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
              Contact Us
            </h1>
            <p className="text-lg md:text-xl text-cream-100 max-w-2xl mx-auto opacity-90">
              We'd love to hear from you
            </p>
          </div>
        </div>
      </section>

      <Contact />
      <Footer />
    </div>
  );
};

export default ContactPage;
