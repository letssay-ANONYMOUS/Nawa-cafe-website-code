import { Link } from 'react-router-dom';
const homeBarista = 'https://lomqlmqsoyayuegheetv.supabase.co/storage/v1/object/public/menu-images/home/barista-cup.jpg';

const HomeStory = () => {
  return (
    <section className="py-24 bg-coffee-800 text-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:gap-16 items-center">
          {/* Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={homeBarista}
                alt="Barista crafting latte art"
                className="w-full h-[400px] object-cover object-center"
                loading="lazy"
              />
            </div>
            {/* Floating accent card */}
            <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 bg-cream-400 text-coffee-800 rounded-2xl p-3 sm:p-6 shadow-xl">
              <p className="font-cinzel text-xl sm:text-4xl font-bold">10+</p>
              <p className="text-[10px] sm:text-sm font-medium">Years of Craft</p>
            </div>
          </div>

          {/* Text */}
          <div>
            <span className="font-cinzel text-sm tracking-[0.3em] uppercase text-cream-400">
              Our Story
            </span>
            <h2 className="font-cinzel text-xl sm:text-4xl md:text-5xl font-bold mt-3 mb-4 sm:mb-6">
              Born From a Love
              <span className="block text-cream-400">of Coffee</span>
            </h2>
            <p className="text-cream-200 text-xs sm:text-lg leading-relaxed mb-3 sm:mb-8">
              NAWA CAFÉ began as a simple dream — to create a space where the warmth of Arabic hospitality meets world-class specialty coffee.
            </p>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 border-2 border-cream-400 text-cream-400 hover:bg-cream-400 hover:text-coffee-800 px-4 py-2 sm:px-8 sm:py-3 rounded-full text-xs sm:text-base font-semibold transition-all duration-300"
            >
              Read Our Full Story
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeStory;
