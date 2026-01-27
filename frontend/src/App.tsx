import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Products from './pages/Products';
import Stock from './pages/Stock';
import Achats from './pages/Achats';
import Articles from './pages/Articles';
import Sales from './pages/Sales';
import Profile from './pages/Profile';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import ProductCharacteristics from './pages/ProductCharacteristics';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App d-flex flex-column min-vh-100">
          <Header />
          
          <main className="flex-grow-1">
            <Routes>
              {/* Routes publiques */}
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              
              {/* Routes protégées - nécessitent une authentification */}
              <Route 
                path="/stock" 
                element={
                  <ProtectedRoute>
                    <Stock />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/achats" 
                element={
                  <ProtectedRoute>
                    <Achats />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/articles" 
                element={
                  <ProtectedRoute>
                    <Articles />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/sales" 
                element={
                  <ProtectedRoute>
                    <Sales />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/stats" 
                element={
                  <ProtectedRoute>
                    <Stats />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings/characteristics" 
                element={
                  <ProtectedRoute>
                    <ProductCharacteristics />
                  </ProtectedRoute>
                } 
              />
              
              {/* Routes admin protégées */}
              <Route 
                path="/admin/products" 
                element={
                  <ProtectedRoute>
                    <Products />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/orders" 
                element={
                  <ProtectedRoute>
                    <div>Commandes (À implémenter)</div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/users" 
                element={
                  <ProtectedRoute>
                    <div>Utilisateurs (À implémenter)</div>
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
          
          <Footer />
          
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
