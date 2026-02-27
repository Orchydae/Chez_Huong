import Hero from './pages/home/Hero';
import Navbar from './components/navbar/Navbar';
import RecipeCards from './pages/home/RecipeCards';
import Footer from './components/footer/Footer';
import ScrollToTop from './components/ui/ScrollToTop';

function App() {
  return (
    <>
      <Navbar />
      <Hero />
      <RecipeCards />
      <Footer />
      <ScrollToTop />
    </>
  );
}

export default App;
