
import { Coffee, Star, Award, Users, Leaf } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import aboutCoffee1 from '@/assets/about-coffee-1.jpg';

const About = () => {
  const stats = [
    { number: "2021", label: "Established", icon: Award },
    { number: "100%", label: "Quality", icon: Star },
    { number: "Global", label: "Sourcing", icon: Coffee },
    { number: "Sustainable", label: "Practices", icon: Leaf }
  ];

  const values = [
    { title: "Quality", description: "Excellence in every cup and dish" },
    { title: "Passion", description: "Love for the craft drives every creation" },
    { title: "Innovation", description: "Constantly redefining the coffee experience" },
    { title: "Community", description: "Connecting coffee lovers around the world" },
    { title: "Sustainability", description: "Ethical, eco-conscious business practices" }
  ];

  const offerings = [
    "Signature Coffee Blends & Beverages",
    "Artisan Desserts & Croissants",
    "Authentic Italian dishes, Pizza, Pasta, Risotto",
    "Burgers and Fresh Salads",
    "Chef-Inspired Daily Specials"
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${index < rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <section id="about" className="py-12 md:py-20 bg-gradient-to-br from-coffee-100 via-cream-50 to-coffee-50 overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-full">
        {/* About Story */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-center mb-12 md:mb-20">
          <div className="animate-fade-in">
            <div className="mb-3 md:mb-4">
              <span className="inline-block px-3 py-1.5 md:px-4 md:py-2 bg-coffee-600 text-white rounded-full text-xs md:text-sm font-medium shadow-lg">
                About NAWA CAFÉ
              </span>
            </div>
            <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold text-coffee-800 mb-4 md:mb-6 leading-tight">
              An Immersive Coffee Experience Since 2021
            </h2>
            <p className="text-base md:text-lg text-coffee-700 mb-4 md:mb-6 leading-relaxed">
              NAWA CAFÉ is more than just a coffee brand—it's an immersive experience. Established in Al Ain in 2021, 
              we blend the artistry of coffee-making with international cuisine to create a luxurious and memorable 
              customer journey.
            </p>
            <p className="text-base md:text-lg text-coffee-700 mb-6 md:mb-8 leading-relaxed">
              We source only the finest coffee beans and prepare dishes crafted with passion, from gourmet coffee to 
              authentic pasta, risotto, burgers, and desserts. We believe in curating moments of joy and connection, 
              transforming ordinary visits into extraordinary memories.
            </p>
            <div className="flex items-center space-x-3 md:space-x-4 p-4 md:p-6 bg-gradient-to-r from-coffee-700 to-coffee-600 rounded-2xl shadow-xl">
              <Coffee className="w-8 h-8 md:w-10 md:h-10 text-cream-100" />
              <div>
                <p className="text-white font-semibold text-base md:text-lg">
                  Crafted with passion, served with love
                </p>
                <p className="text-cream-200 text-sm md:text-base">— Our Promise to You</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <img
                src={aboutCoffee1}
                alt="Premium coffee with latte art"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="rounded-xl md:rounded-2xl shadow-xl w-full h-36 md:h-48 object-cover"
              />
              <img
                src="https://images.unsplash.com/photo-1610889556528-9a770e32642f?auto=format&fit=crop&w=400&q=80"
                alt="Barista at work"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="rounded-xl md:rounded-2xl shadow-xl w-full h-36 md:h-48 object-cover mt-6 md:mt-8"
              />
              <img
                src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80"
                alt="Fresh coffee beans"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="rounded-xl md:rounded-2xl shadow-xl w-full h-36 md:h-48 object-cover -mt-6 md:-mt-8"
              />
              <img
                src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80"
                alt="Coffee cup art"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="rounded-xl md:rounded-2xl shadow-xl w-full h-36 md:h-48 object-cover"
              />
            </div>
            <div className="hidden md:block absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-2xl border border-coffee-200">
              <div className="text-center">
                <div className="text-3xl font-bold text-coffee-800">4.7</div>
                <div className="flex justify-center space-x-1 mb-1">
                  {renderStars(5)}
                </div>
                <div className="text-sm text-coffee-600">Customer Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-12 md:mb-20 overflow-hidden">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={index}
                className="text-center animate-scale-in bg-gradient-to-br from-white to-cream-50 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-coffee-200"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <IconComponent className="w-6 h-6 md:w-8 md:h-8 text-coffee-600 mx-auto mb-2 md:mb-3" />
                <div className="text-xl md:text-4xl lg:text-5xl font-bold text-coffee-700 mb-1 md:mb-2 break-words">
                  {stat.number}
                </div>
                <div className="text-xs md:text-sm text-coffee-600 font-medium break-words">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Vision & Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12 md:mb-20">
          <div className="bg-gradient-to-br from-coffee-700 to-coffee-600 rounded-2xl p-6 md:p-8 shadow-xl text-white">
            <h3 className="font-playfair text-2xl md:text-3xl font-bold mb-4">Our Vision</h3>
            <p className="text-cream-100 leading-relaxed text-sm md:text-base">
              To be the preferred choice for discerning coffee lovers worldwide by offering an array of gourmet 
              coffee blends that ignite the senses, elevate experiences, and inspire moments of connection.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-cream-100 to-coffee-100 rounded-2xl p-6 md:p-8 shadow-xl">
            <h3 className="font-playfair text-2xl md:text-3xl font-bold mb-4 text-coffee-800">Our Mission</h3>
            <ul className="space-y-2 text-coffee-700 text-sm md:text-base">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Continuously innovate to develop unique, personalized coffee blends</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Provide unmatched customer service and share our deep coffee knowledge</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Operate sustainably, with consideration for social and environmental impact</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Values */}
        <div className="mb-12 md:mb-20">
          <div className="text-center mb-8 md:mb-12">
            <span className="inline-block px-3 py-1.5 md:px-4 md:py-2 bg-coffee-600 text-white rounded-full text-xs md:text-sm font-medium shadow-lg mb-3 md:mb-4">
              Our Values
            </span>
            <h3 className="font-playfair text-2xl md:text-3xl lg:text-4xl font-bold text-coffee-800">
              What Drives Us
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white rounded-xl md:rounded-2xl p-5 md:p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-coffee-200"
              >
                <h4 className="font-playfair text-lg md:text-xl font-bold text-coffee-800 mb-2">
                  {value.title}
                </h4>
                <p className="text-sm md:text-base text-coffee-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Offerings */}
        <div className="bg-gradient-to-br from-coffee-800 to-coffee-700 rounded-2xl p-6 md:p-10 shadow-xl mb-12 md:mb-20">
          <div className="text-center mb-6 md:mb-8">
            <h3 className="font-playfair text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">
              Our Offerings
            </h3>
            <p className="text-cream-200 text-sm md:text-base">
              Discover our carefully curated selection
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {offerings.map((offering, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4 text-white"
              >
                <Coffee className="w-5 h-5 md:w-6 md:h-6 text-cream-300 flex-shrink-0" />
                <span className="text-sm md:text-base">{offering}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Reviews */}
        <div className="text-center mb-8 md:mb-12">
          <div className="mb-3 md:mb-4">
            <span className="inline-block px-3 py-1.5 md:px-4 md:py-2 bg-coffee-600 text-white rounded-full text-xs md:text-sm font-medium shadow-lg">
              Customer Reviews
            </span>
          </div>
          <h3 className="font-playfair text-2xl md:text-3xl lg:text-4xl font-bold text-coffee-800 mb-3 md:mb-4">
            What Our Customers Say
          </h3>
          <p className="text-base md:text-xl text-coffee-600 max-w-2xl mx-auto mb-6 md:mb-8 px-4">
            Read authentic reviews from our community of coffee lovers on Google Maps
          </p>
          
          <div className="bg-gradient-to-br from-white to-cream-50 rounded-2xl p-6 md:p-10 shadow-xl border border-coffee-200 max-w-2xl mx-auto">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="flex space-x-1">
                {renderStars(5)}
              </div>
              <span className="text-2xl md:text-3xl font-bold text-coffee-800">4.7</span>
            </div>
            <p className="text-coffee-600 mb-6 text-sm md:text-base">
              Rated excellent by our customers
            </p>
            <a
              href="https://www.google.com/maps/place/NAWA+Cafe/@24.2454332,55.7114633,17z/data=!3m1!4b1!4m6!3m5!1s0x3e8ab391028950b1:0xe99373a583558a82!8m2!3d24.2454332!4d55.7140382!16s%2Fg%2F11rr27q630"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-coffee-700 to-coffee-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-semibold hover:from-coffee-800 hover:to-coffee-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 text-sm md:text-base"
            >
              <Star className="w-5 h-5" />
              <span>Read All Reviews on Google</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
