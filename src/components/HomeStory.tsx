import { Link } from 'react-router-dom';
import homeBarista from '@/assets/home-barista.jpg';

const HomeStory = () => {
  return (
    <section className="py-24 bg-coffee-800 text-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={homeBarista}
                alt="Barista crafting latte art"
                className="w-full h-[500px] object-cover"
                loading="lazy"
              />
            </div>
            {/* Floating accent card */}
            <div className="absolute -bottom-6 -right-6 bg-cream-400 text-coffee-800 rounded-2xl p-6 shadow-xl hidden md:block">
              <p className="font-cinzel text-4xl font-bold">10+</p>
              <p className="text-sm font-medium">Years of Craft</p>
            </div>
          </div>

          {/* Text */}
          <div>
            <span className="font-cinzel text-sm tracking-[0.3em] uppercase text-cream-400">
              Our Story
            </span>
            <h2 className="font-cinzel text-4xl md:text-5xl font-bold mt-3 mb-6">
              Born From a Love
              <span className="block text-cream-400">of Coffee</span>
            </h2>
            <p className="text-cream-200 text-lg leading-relaxed mb-6">
              NAWA CAFÉ began as a simple dream — to create a space where the warmth of Arabic hospitality meets world-class specialty coffee. Every cup we serve carries the passion of our journey from Al Ain to your table.
            </p>
            <p className="text-cream-300 leading-relaxed mb-8">
              Our beans are hand-selected from the finest growing regions, carefully roasted in-house, and prepared by baristas who treat every pour as an art form. But NAWA is more than coffee — it's a gathering place, a creative haven, and a second home.
            </p>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 border-2 border-cream-400 text-cream-400 hover:bg-cream-400 hover:text-coffee-800 px-8 py-3 rounded-full font-semibold transition-all duration-300"
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
