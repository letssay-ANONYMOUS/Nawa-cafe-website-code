import { motion } from 'framer-motion';

const homeInterior = 'https://lomqlmqsoyayuegheetv.supabase.co/storage/v1/object/public/menu-images/home/interior-nawa.jpg';

const stats = [
  { value: '50+', label: 'Menu Items' },
  { value: '4.7★', label: 'Google Rating' },
  { value: '2021', label: 'Est. Year' },
  { value: '1', label: 'Location' },
];

const HomeExperience = () => {
  return (
    <section className="relative">
      {/* Full-width parallax image */}
      <div className="relative h-[300px] sm:h-[600px] overflow-hidden">
        <motion.img
          initial={{ scale: 1.2 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src={homeInterior}
          alt="NAWA Café warm interior"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <span className="font-cinzel text-[10px] sm:text-sm tracking-[0.3em] uppercase text-cream-400">
              The Experience
            </span>
            <h2 className="font-cinzel text-xl sm:text-4xl md:text-6xl font-bold text-white mt-2 sm:mt-3 mb-3 sm:mb-6">
              More Than Just Coffee
            </h2>
            <p className="text-cream-100 text-xs sm:text-xl leading-relaxed">
              Step into NAWA and feel the warmth. Our spaces are designed for connection —
              whether you're catching up with friends, finding a quiet corner to work, or savoring a moment of peace.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-coffee-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.15 } }
            }}
            className="grid grid-cols-4 divide-x divide-coffee-600"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={{
                  hidden: { opacity: 0, scale: 0.8 },
                  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "backOut" } }
                }}
                className="py-4 sm:py-8 text-center"
              >
                <p className="font-cinzel text-base sm:text-3xl md:text-4xl font-bold text-cream-400">
                  {stat.value}
                </p>
                <p className="text-cream-200 text-[9px] sm:text-sm mt-0.5 sm:mt-1 uppercase tracking-wider">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HomeExperience;
