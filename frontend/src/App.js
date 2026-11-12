import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import HomePage from "./pages/HomePage";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import UniversityChangePage from "./pages/UniversityChangePage";
import GermanyFairPage from "./pages/GermanyFairPage";
import MediaDesignWebinarPage from "./pages/MediaDesignWebinarPage";
import IeltsCelebrationPage from "./pages/IeltsCelebrationPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import PrivacyPolicyBerlinPage from "./pages/PrivacyPolicyBerlinPage";
import ImpressumPage from "./pages/ImpressumPage";
import TermsPage from "./pages/TermsPage";
import CountriesIndexPage from "./pages/CountriesIndexPage";
import CountryPage from "./pages/CountryPage";
import BranchesIndexPage from "./pages/BranchesIndexPage";
import BranchPage from "./pages/BranchPage";
import ContactPage from "./pages/ContactPage";
import FaqPage from "./pages/FaqPage";
import AboutPage from "./pages/AboutPage";
import StudentStoriesPage from "./pages/StudentStoriesPage";
import { EnquiryProvider } from "./components/site/EnquiryModal";

import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <HelmetProvider>
      <div className="App">
        <Toaster position="top-center" richColors />
        <BrowserRouter>
          <EnquiryProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/study-abroad" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/berlin" element={<UniversityChangePage />} />
            {/* Legacy alias: old ads still pointing to /university-change redirect to /berlin */}
            <Route path="/university-change" element={<Navigate to="/berlin" replace />} />
            <Route path="/germany-fair" element={<GermanyFairPage />} />
            <Route path="/webinar/media-design" element={<MediaDesignWebinarPage />} />
            <Route path="/media-design-webinar" element={<Navigate to="/webinar/media-design" replace />} />
            <Route path="/ielts-celebration" element={<IeltsCelebrationPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/berlin/privacy-policy" element={<PrivacyPolicyBerlinPage />} />
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/countries" element={<CountriesIndexPage />} />
            <Route path="/countries/:slug" element={<CountryPage />} />
            <Route path="/branches" element={<BranchesIndexPage />} />
            <Route path="/branches/:slug" element={<BranchPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/student-stories" element={<StudentStoriesPage />} />
            <Route path="/student-stories/:id" element={<StudentStoriesPage />} />
          </Routes>
          </EnquiryProvider>
        </BrowserRouter>
      </div>
    </HelmetProvider>
  );
}

export default App;
