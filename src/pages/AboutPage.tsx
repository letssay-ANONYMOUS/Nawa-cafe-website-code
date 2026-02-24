import Header from '@/components/Header';
import About from '@/components/About';
import Footer from '@/components/Footer';

const AboutPage = () => {

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        <About />
      </div>
      <Footer />
    </div>
  );
};

export default AboutPage;
