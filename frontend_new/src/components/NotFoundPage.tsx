import React from "react";
import { Link } from "react-router-dom";
import Cookies from "js-cookie";

const NotFoundPage: React.FC = () => {
  const designation = Cookies.get("designation");
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-xl mb-8">The page you're looking for doesn't exist.</p>
      <Link
        to={designation === "admin" ? "/admin-dashboard" : "/user-dashboard"}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
};

export default NotFoundPage;
