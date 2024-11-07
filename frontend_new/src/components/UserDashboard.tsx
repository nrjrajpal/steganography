import React from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const username = Cookies.get("username");

  const handleLogout = () => {
    Cookies.remove("token");
    Cookies.remove("username");
    Cookies.remove("designation");
    navigate("/login");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">User Dashboard</h1>
      <p className="mb-4">Welcome, {username}!</p>
      <div className="space-y-4">
        <button
          onClick={() => navigate("/upload-picture")}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Upload Picture
        </button>
        <button
          onClick={() => navigate("/pictures")}
          className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
        >
          View Pictures
        </button>
        <button
          onClick={() => navigate(`/user-details/${username}`)}
          className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
        >
          View My Details
        </button>
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default UserDashboard;
