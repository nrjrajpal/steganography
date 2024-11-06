import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import AdminDashboard from "./components/AdminDashboard";
import UserDashboard from "./components/UserDashboard";
import AddAdminPage from "./components/AddAdminPage";
import AddUserPage from "./components/AddUserPage";
import PictureUploadPage from "./components/PictureUploadPage";
import AdminDetailsPage from "./components/AdminDetailsPage";
import ManageAdminsPage from "./components/ManageAdminsPage";
import ManageUsersPage from "./components/ManageUsersPage";
import UserDetailsPage from "./components/UserDetailsPage";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/user-dashboard" element={<UserDashboard />} />
        <Route path="/add-admin" element={<AddAdminPage />} />
        <Route path="/add-user" element={<AddUserPage />} />
        <Route path="/upload-picture" element={<PictureUploadPage />} />
        <Route path="/admin-details/:adminID" element={<AdminDetailsPage />} />
        <Route path="/manage-admins" element={<ManageAdminsPage />} />
        <Route path="/manage-users" element={<ManageUsersPage />} />
        <Route path="/user-details/:username" element={<UserDetailsPage />} />
        {/* Add more routes as needed */}
      </Routes>
    </Router>
  );
};

export default App;
