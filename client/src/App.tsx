import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/navbar/Navbar';
import Home from './pages/home/Home';
import CreateRecipe from './pages/recipes/create/CreateRecipe';
import Footer from './components/footer/Footer';
import ScrollToTop from './components/ui/ScrollToTop';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipes/create" element={<CreateRecipe />} />
      </Routes>
      <Footer />
      <ScrollToTop />
    </Router>
  );
}

export default App;
