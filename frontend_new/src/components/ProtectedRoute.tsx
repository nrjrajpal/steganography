import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import Cookies from "js-cookie";

interface ProtectedRouteProps {
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const token = Cookies.get("token");
  const designation = Cookies.get("designation");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.includes(designation || "")) {
    return <Outlet />;
  } else {
    return <Navigate to="/unauthorized" replace />;
  }
};

export default ProtectedRoute;
