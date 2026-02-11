import homeInterior from '@/assets/home-interior.jpg';

const stats = [
  { value: '50+', label: 'Menu Items' },
  { value: '4.7★', label: 'Google Rating' },
  { value: '2014', label: 'Est. Year' },
  { value: '3', label: 'Locations' },
];

const HomeExperience = () => {
  return (
    <section className="relative">
      {/* Full-width parallax image */}
      <div className="relative h-[600px] overflow-hidden">
        <img
          src={homeInterior}
          alt="NAWA Café warm interior"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div className="max-w-3xl">
            <span className="font-cinzel text-sm tracking-[0.3em] uppercase text-cream-400">
              The Experience
            </span>
            <h2 className="font-cinzel text-4xl md:text-6xl font-bold text-white mt-3 mb-6">
              More Than Just Coffee
            </h2>
            <p className="text-cream-100 text-xl leading-relaxed">
              Step into NAWA and feel the warmth. Our spaces are designed for connection — 
              whether you're catching up with friends, finding a quiet corner to work, or savoring a moment of peace.
            </p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-coffee-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-coffee-600">
            {stats.map((stat) => (
              <div key={stat.label} className="py-8 text-center">
                <p className="font-cinzel text-3xl md:text-4xl font-bold text-cream-400">
                  {stat.value}
                </p>
                <p className="text-cream-200 text-sm mt-1 uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeExperience;
