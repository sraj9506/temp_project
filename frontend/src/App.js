// App.js
import { ThemeProvider } from 'next-themes';
import LandingPage from './components/LandingPage';
import { Header } from './components/Header';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React from 'react';
import { About } from './components/About';
import { Contact } from './components/Contact';
import { SignIn } from './components/SignIn';
import { Footer } from './components/Footer';
import SignUp from './components/SignUp';
import PricingBox from './components/PricingBox';
import VerifyOTP from './components/VerifyOTP';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import WelcomePage from './components/WelcomePage';


function App() {
  const appStyle = {
    backgroundColor: 'var(--bg-color)', // Dynamically controlled by CSS variables
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <ThemeProvider attribute="class">
      <Router>
        <AuthProvider>
          <div style={appStyle}>
            <Header />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<PricingBox />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/verify-otp/:userId" element={<VerifyOTP />} />
              {/* Protected Route */}
              <Route path="/welcome" element={<ProtectedRoute element={<WelcomePage />} />} />
            </Routes>
            <Footer />
          </div>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
