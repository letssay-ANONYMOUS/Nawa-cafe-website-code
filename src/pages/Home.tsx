import { AnimatePresence, motion } from 'framer-motion';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import HomeFeatured from '@/components/HomeFeatured';
import HomeStory from '@/components/HomeStory';
import HomeExperience from '@/components/HomeExperience';
import HomeVisit from '@/components/HomeVisit';
import Footer from '@/components/Footer';
import PageLoaderOverlay from '@/components/PageLoaderOverlay';
import { useInitialLoad } from '@/hooks/useInitialLoad';
import { fadeUp, staggerContainer } from '@/lib/motionVariants';

const Home = () => {
  const loading = useInitialLoad(1000);

  // Respect prefers-reduced-motion
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <>
      <AnimatePresence mode="wait">
        {loading && !prefersReduced && <PageLoaderOverlay />}
      </AnimatePresence>

      {!loading && (
        <motion.div
          className="min-h-screen"
          variants={staggerContainer}
          initial={prefersReduced ? "visible" : "hidden"}
          animate="visible"
        >
          <motion.div variants={fadeUp}><Header /></motion.div>
          <motion.div variants={fadeUp}><Hero /></motion.div>
          <HomeFeatured />
          <motion.div variants={fadeUp}><HomeStory /></motion.div>
          <motion.div variants={fadeUp}><HomeExperience /></motion.div>
          <motion.div variants={fadeUp}><HomeVisit /></motion.div>
          <motion.div variants={fadeUp}><Footer /></motion.div>
        </motion.div>
      )}
    </>
  );
};

export default Home;
