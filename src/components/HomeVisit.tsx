import { Link } from 'react-router-dom';
import { MapPin, Clock, Phone } from 'lucide-react';

const HomeVisit = () => {
  return (
    <section className="py-12 sm:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-16">
          <span className="font-cinzel text-xs sm:text-sm tracking-[0.3em] uppercase text-coffee-400">
            Find Us
          </span>
          <h2 className="font-cinzel text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mt-2 sm:mt-3">
            Visit NAWA Café
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-8 max-w-4xl mx-auto">
          {/* Location */}
          <div className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-8 text-center shadow-md hover:shadow-xl transition-shadow duration-300 border border-border">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-coffee-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
              <MapPin className="w-5 h-5 sm:w-7 sm:h-7 text-coffee-600" />
            </div>
            <h3 className="font-cinzel text-[11px] sm:text-lg font-semibold text-card-foreground mb-1 sm:mb-2">Location</h3>
            <p className="text-muted-foreground text-[10px] sm:text-sm leading-relaxed">
              Al Ain, United Arab Emirates
            </p>
            <Link
              to="/locations"
              className="inline-block mt-2 sm:mt-4 text-coffee-500 hover:text-coffee-700 text-[10px] sm:text-sm font-medium underline underline-offset-4"
            >
              Get Directions
            </Link>
          </div>

          {/* Hours */}
          <div className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-8 text-center shadow-md hover:shadow-xl transition-shadow duration-300 border border-border">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-coffee-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
              <Clock className="w-5 h-5 sm:w-7 sm:h-7 text-coffee-600" />
            </div>
            <h3 className="font-cinzel text-[11px] sm:text-lg font-semibold text-card-foreground mb-1 sm:mb-2">Hours</h3>
            <p className="text-muted-foreground text-[10px] sm:text-sm leading-relaxed">
              Sat – Thu: 7 AM – 12 AM<br />
              Friday: 1 PM – 12 AM
            </p>
          </div>

          {/* Contact */}
          <div className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-8 text-center shadow-md hover:shadow-xl transition-shadow duration-300 border border-border">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-coffee-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
              <Phone className="w-5 h-5 sm:w-7 sm:h-7 text-coffee-600" />
            </div>
            <h3 className="font-cinzel text-[11px] sm:text-lg font-semibold text-card-foreground mb-1 sm:mb-2">Contact</h3>
            <p className="text-muted-foreground text-[10px] sm:text-sm leading-relaxed">
              <a href="tel:037800030" className="hover:text-coffee-500 transition-colors">037 800 030</a><br />
              <a href="tel:0506584176" className="hover:text-coffee-500 transition-colors">050 658 4176</a>
            </p>
            <Link
              to="/contact"
              className="inline-block mt-2 sm:mt-4 text-coffee-500 hover:text-coffee-700 text-[10px] sm:text-sm font-medium underline underline-offset-4"
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
