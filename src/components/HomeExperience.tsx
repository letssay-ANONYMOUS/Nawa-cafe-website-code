const homeInterior = 'https://lomqlmqsoyayuegheetv.supabase.co/storage/v1/object/public/menu-images/home/interior-nawa.jpg';

const stats = [
  { value: '50+', label: 'Menu Items' },
  { value: '4.7★', label: 'Google Rating' },
  { value: '2014', label: 'Est. Year' },
  { value: '2', label: 'Locations' },
];

const HomeExperience = () => {
  return (
    <section className="relative">
      {/* Full-width parallax image */}
      <div className="relative h-[350px] sm:h-[600px] overflow-hidden">
        <img
          src={homeInterior}
          alt="NAWA Café warm interior"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div className="max-w-3xl">
            <span className="font-cinzel text-[10px] sm:text-sm tracking-[0.3em] uppercase text-cream-400">
              The Experience
            </span>
            <h2 className="font-cinzel text-xl sm:text-4xl md:text-6xl font-bold text-white mt-2 sm:mt-3">
              More Than Just Coffee
            </h2>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-coffee-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-4 divide-x divide-coffee-600">
            {stats.map((stat) => (
              <div key={stat.label} className="py-4 sm:py-8 text-center">
                <p className="font-cinzel text-base sm:text-3xl md:text-4xl font-bold text-cream-400">
                  {stat.value}
                </p>
                <p className="text-cream-200 text-[9px] sm:text-sm mt-0.5 sm:mt-1 uppercase tracking-wider">
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
