import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RedirectToHome = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
};

export default RedirectToHome;
