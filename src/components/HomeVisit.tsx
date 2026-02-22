import { Link } from 'react-router-dom';
import { MapPin, Clock, Phone } from 'lucide-react';

const HomeVisit = () => {
  return (
    <section className="py-16 sm:py-28 bg-gradient-to-b from-background to-coffee-50/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16">
          <span className="font-cinzel text-xs sm:text-sm tracking-[0.3em] uppercase text-coffee-400">
            Find Us
          </span>
          <h2 className="font-cinzel text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mt-2 sm:mt-3">
            Visit NAWA Café
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 max-w-4xl mx-auto">
          {/* Location */}
          <div className="bg-card rounded-2xl p-6 sm:p-8 text-center shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border">
            <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-coffee-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="font-cinzel text-sm sm:text-lg font-semibold text-card-foreground mb-2">Location</h3>
            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
              Al Ain, United Arab Emirates
            </p>
            <Link
              to="/locations"
              className="inline-block mt-3 sm:mt-4 text-coffee-500 hover:text-coffee-700 text-xs sm:text-sm font-medium underline underline-offset-4 transition-colors"
            >
              Get Directions
            </Link>
          </div>

          {/* Hours */}
          <div className="bg-card rounded-2xl p-6 sm:p-8 text-center shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border">
            <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-coffee-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="font-cinzel text-sm sm:text-lg font-semibold text-card-foreground mb-2">Hours</h3>
            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
              Sat – Thu: 7 AM – 12 AM<br />
              Friday: 1 PM – 12 AM
            </p>
          </div>

          {/* Contact */}
          <div className="bg-card rounded-2xl p-6 sm:p-8 text-center shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border">
            <Phone className="w-8 h-8 sm:w-10 sm:h-10 text-coffee-500 mx-auto mb-3 sm:mb-4" />
            <h3 className="font-cinzel text-sm sm:text-lg font-semibold text-card-foreground mb-2">Contact</h3>
            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
              <a href="tel:037800030" className="hover:text-coffee-500 transition-colors">037 800 030</a><br />
              <a href="tel:0506584176" className="hover:text-coffee-500 transition-colors">050 658 4176</a>
            </p>
            <Link
              to="/contact"
              className="inline-block mt-3 sm:mt-4 text-coffee-500 hover:text-coffee-700 text-xs sm:text-sm font-medium underline underline-offset-4 transition-colors"
            >
              Send a Message
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeVisit;
