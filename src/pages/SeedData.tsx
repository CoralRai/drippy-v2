import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// SeedData is no longer needed — Gemini generates outfits dynamically
const SeedData = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate("/"); }, [navigate]);
  return null;
};

export default SeedData;
