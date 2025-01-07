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
              <Route exact path="/" element={<LandingPage />} />
              <Route exact path="/about" element={<About />} />
              <Route exact path="/services" element={<PricingBox />} />
              <Route exact path="/contact" element={<Contact />} />
              <Route exact path="/signin" element={<SignIn />} />
              <Route exact path="/signup" element={<SignUp />} />
              <Route exact path="/verify-otp/:userId" element={<VerifyOTP />} />
              {/* Protected Route */}
              <Route exact path="/welcome" element={<ProtectedRoute element={<WelcomePage />} />} />
            </Routes>
            <Footer />
          </div>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
