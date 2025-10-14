import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const Splash = () => {
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => navigate("/home"), 1000);
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-card to-background transition-opacity duration-1000 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center space-y-8 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse-glow rounded-3xl blur-2xl" />
          <div className="relative">
            <img 
              src={logo} 
              alt="KantoStrategy Logo" 
              className="w-48 h-48 object-contain drop-shadow-2xl"
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-primary-glow rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
};

export default Splash;