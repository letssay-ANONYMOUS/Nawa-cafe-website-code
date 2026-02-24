import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, Phone } from 'lucide-react';
import homeInterior from '@/assets/home-interior-new.jpg';

const LocationsPage = () => {

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section with Image */}
      <section className="relative h-[400px] md:h-[500px]">
        <img 
          src={homeInterior} 
          alt="NAWA Cafe Interior" 
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-6">
            <span className="font-cinzel text-xs sm:text-sm tracking-[0.3em] uppercase text-coffee-300 mb-3 block">
              Find Us
            </span>
            <h1 className="font-cinzel text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
              Our Location
            </h1>
            <p className="text-lg md:text-xl text-cream-100 max-w-2xl mx-auto opacity-90">
              Visit us at NAWA Cafe in Al Ain, United Arab Emirates
            </p>
          </div>
        </div>
      </section>

      {/* Google Maps Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <Card className="overflow-hidden shadow-2xl border-border">
              <CardContent className="p-0">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3637.895399120355!2d55.71146833923969!3d24.24543696968284!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e8ab391028950b1%3A0xe99373a583558a82!2sNAWA%20Cafe!5e0!3m2!1sen!2suk!4v1759400527438!5m2!1sen!2suk"
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="NAWA Cafe Location"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Location Details */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-8 text-center">
                  <MapPin className="w-10 h-10 text-coffee-500 mx-auto mb-4" />
                  <h3 className="font-cinzel text-lg font-semibold text-card-foreground mb-3">Address</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Al Banafsaj St. Hazza Bin Zayed Stadium</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">Bldg. 15 - Al Tiwayya</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">Abu Dhabi, UAE</p>
                </CardContent>
              </Card>
              
              <Card className="border-border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-8 text-center">
                  <Phone className="w-10 h-10 text-coffee-500 mx-auto mb-4" />
                  <h3 className="font-cinzel text-lg font-semibold text-card-foreground mb-3">Phone</h3>
                  <a href="tel:037800030" className="block text-sm text-muted-foreground hover:text-coffee-500 transition-colors">037 800 030</a>
                  <a href="tel:0506584176" className="block text-sm text-muted-foreground hover:text-coffee-500 transition-colors">050 658 4176</a>
                </CardContent>
              </Card>
              
              <Card className="border-border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-8 text-center">
                  <Clock className="w-10 h-10 text-coffee-500 mx-auto mb-4" />
                  <h3 className="font-cinzel text-lg font-semibold text-card-foreground mb-3">Hours</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Sat – Thu: 7 AM – 12 AM</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">Friday: 1 PM – 12 AM</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LocationsPage;
