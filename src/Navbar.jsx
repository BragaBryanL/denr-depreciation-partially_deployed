import { useState, useEffect } from "react";
import { HomeIcon, DocumentTextIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";

export default function Navbar() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sections = ["dashboard", "records", "coaforms"];
    
    const observer = new IntersectionObserver(
      (entries) => {
        // Get all visible sections
        const visibleSections = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        
        if (visibleSections.length > 0) {
          // Find the section that's most visible (closest to top of viewport)
          const topSection = visibleSections[0];
          setActiveSection(topSection.target.id);
        }
      },
      {
        rootMargin: "-50% 0px -50% 0px",
        threshold: 0
      }
    );

    sections.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const links = [
    { id: "dashboard", label: "Dashboard", icon: HomeIcon },
    { id: "records", label: "Records", icon: DocumentTextIcon },
    { id: "coaforms", label: "COA Forms", icon: DocumentDuplicateIcon },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-gradient-to-r from-green-800 to-green-700 shadow-lg py-2" : "bg-gradient-to-r from-green-700 to-green-600 py-4"}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center">
              <img src="/denrlogo.jpg" alt="DENR Logo" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
              <div className="hidden w-full h-full bg-green-700 items-center justify-center text-white font-bold text-xl">D</div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-white font-bold text-lg leading-tight">TBD.....</h1>
              <p className="text-green-200 text-xs">Property Depreciation System</p>
            </div>
          </div>
          <ul className="flex items-center space-x-1">
            {links.map(({ id, label }) => (
              <li key={id}>
                <button onClick={() => scrollToSection(id)} className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${activeSection === id ? "bg-white text-green-800 font-semibold shadow-md" : "text-white hover:bg-green-600 hover:bg-opacity-50"}`}>
                  <span className="text-sm">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
