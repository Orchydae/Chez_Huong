import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/navbar/Navbar';
import Home from './pages/home/Home';
import CreateRecipe from './pages/recipes/create/CreateRecipe';
import ReadRecipe from './pages/recipes/read/ReadRecipe';
import ModifyRecipe from './pages/recipes/modify/ModifyRecipe';
import Footer from './components/footer/Footer';
import ScrollToTop from './components/ui/ScrollToTop';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipes/create" element={<CreateRecipe />} />
        <Route path="/recipes/:id" element={<ReadRecipe />} />
        <Route path="/recipes/:id/modify" element={<ModifyRecipe />} />
      </Routes>
      <Footer />
      <ScrollToTop />
    </Router>
  );
}

export default App;
