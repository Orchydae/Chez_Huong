import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ToastHost from './components/ui/ToastHost';
import RequireRole from './components/auth/RequireRole';
import HomePage from './pages/home/HomePage';
import RecipePage from './pages/recipe/RecipePage';
import CreateRecipePage from './pages/create/CreateRecipePage';
import EditRecipePage from './pages/edit/EditRecipePage';
import MyRecipesPage from './pages/my-recipes/MyRecipesPage';
import SavedPage from './pages/saved/SavedPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import NotFoundPage from './pages/not-found/NotFoundPage';

/** Reset scroll on navigation (the browser keeps it per-SPA-route otherwise). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Navbar />
      {/* the body is forest (root backdrop); main is the cream content surface */}
      <main className="min-h-[60vh] bg-cream">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/my-recipes"
            element={
              <RequireRole roles={['ADMIN', 'WRITER']}>
                <MyRecipesPage />
              </RequireRole>
            }
          />
          {/* saved list is for any signed-in user (readers included) — all roles */}
          <Route
            path="/saved"
            element={
              <RequireRole roles={['ADMIN', 'WRITER', 'READER']}>
                <SavedPage />
              </RequireRole>
            }
          />
          <Route
            path="/recipes/create"
            element={
              <RequireRole roles={['ADMIN', 'WRITER']}>
                <CreateRecipePage />
              </RequireRole>
            }
          />
          <Route
            path="/recipes/:id/edit"
            element={
              <RequireRole roles={['ADMIN', 'WRITER']}>
                <EditRecipePage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireRole roles={['ADMIN']}>
                <AdminUsersPage />
              </RequireRole>
            }
          />
          {/* slug canonical, numeric id also resolves (page redirects to slug) */}
          <Route path="/recipes/:slugOrId" element={<RecipePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <ToastHost />
    </BrowserRouter>
  );
}

export default App;
