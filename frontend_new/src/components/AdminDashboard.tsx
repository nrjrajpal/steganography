import React from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const adminID = Cookies.get("adminID");

  const handleLogout = () => {
    Cookies.remove("token");
    Cookies.remove("adminID");
    Cookies.remove("designation");
    navigate("/login");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <p className="mb-4">Welcome, Admin {adminID}!</p>
      <div className="space-y-4">
        <button
          onClick={() => navigate("/add-admin")}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Add Admin
        </button>
        <button
          onClick={() => navigate(`/admin-details/${adminID}`)}
          className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
        >
          View My Details
        </button>
        <button
          onClick={() => navigate("/manage-users")}
          className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
        >
          Manage Users
        </button>
        <button
          onClick={() => navigate("/manage-admins")}
          className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors"
        >
          Manage Admins
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

export default AdminDashboard;
