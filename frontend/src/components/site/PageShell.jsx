import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

/**
 * Common chrome wrapper for all secondary pages (country / branch / contact /
 * FAQ). The HomePage already includes Navbar + Footer directly so it does NOT
 * use this component.
 */
export default function PageShell({ children, className = "" }) {
  return (
    <div className={`font-body text-slate-800 bg-white selection:bg-blue-100 selection:text-blue-900 ${className}`}>
      <Navbar />
      <main className="pt-16 lg:pt-20">{children}</main>
      <Footer />
    </div>
  );
}
