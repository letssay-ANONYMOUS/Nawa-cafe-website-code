import { useEffect } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import HomeFeatured from '@/components/HomeFeatured';
import HomeStory from '@/components/HomeStory';
import HomeExperience from '@/components/HomeExperience';
import HomeVisit from '@/components/HomeVisit';
import Footer from '@/components/Footer';

const Home = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <HomeFeatured />
      <HomeStory />
      <HomeExperience />
      <HomeVisit />
      <Footer />
    </div>
  );
};

export default Home;
