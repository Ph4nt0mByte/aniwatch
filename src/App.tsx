/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Home from './pages/Home';
import Search from './pages/Search';
import ContinueWatching from './pages/ContinueWatching';
import AnimeDetails from './pages/AnimeDetails';
import Watch from './pages/Watch';
import Auth from './pages/Auth';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { useState } from 'react';

import MovieHome from './pages/movie/MovieHome';
import MovieSearch from './pages/movie/MovieSearch';
import MovieDetails from './pages/movie/MovieDetails';
import MovieWatch from './pages/movie/MovieWatch';
import MovieContinueWatching from './pages/movie/MovieContinueWatching';

function AppContent() {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark text-white flex flex-col relative z-[1]">
      <Navbar onMenuClick={() => setSidebarOpen(!isSidebarOpen)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-grow pt-12">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/anime/:id" element={<AnimeDetails />} />
          <Route path="/watch/:id/:ep" element={<Watch />} />
          <Route path="/auth" element={user ? <Navigate to="/" /> : <Auth />} />
          <Route 
            path="/continue-watching" 
            element={user ? <ContinueWatching /> : <Navigate to="/auth" />} 
          />
          {/* Parallel Hollywood Movie & TV Routes */}
          <Route path="/movie" element={<MovieHome />} />
          <Route path="/movie/search" element={<MovieSearch />} />
          <Route path="/movie/details/:id" element={<MovieDetails />} />
          <Route path="/movie/watch/:id" element={<MovieWatch />} />
          <Route path="/movie/watch/:id/season/:season/episode/:episode" element={<MovieWatch />} />
          <Route 
            path="/movie/continue-watching" 
            element={user ? <MovieContinueWatching /> : <Navigate to="/auth" />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="bg-[#111111] p-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold italic tracking-tighter">ignis<span className="text-primary italic">play</span></span>
          </div>
          <div className="text-text-secondary text-sm">
            © 2026 IgnisPlay. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <AppContent />
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}
