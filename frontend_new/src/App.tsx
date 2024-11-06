import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import AdminDashboard from "./components/AdminDashboard";
import UserDashboard from "./components/UserDashboard";
import AddAdminPage from "./components/AddAdminPage";
// import AddUserPage from "./components/AddUserPage";
import PictureUploadPage from "./components/PictureUploadPage";
import PictureGallery from "./components/PictureGallery";
import AdminDetailsPage from "./components/AdminDetailsPage";
import ManageAdminsPage from "./components/ManageAdminsPage";
import ManageUsersPage from "./components/ManageUsersPage";
import UserDetailsPage from "./components/UserDetailsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import UnauthorizedPage from "./components/UnauthorizedPage";
import NotFoundPage from "./components/NotFoundPage";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/add-admin" element={<AddAdminPage />} />
          <Route path="/manage-admins" element={<ManageAdminsPage />} />
          <Route path="/manage-users" element={<ManageUsersPage />} />
          <Route
            path="/admin-details/:adminID"
            element={<AdminDetailsPage />}
          />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["user", "admin"]} />}>
          <Route path="/user-dashboard" element={<UserDashboard />} />
          <Route path="/upload-picture" element={<PictureUploadPage />} />
          <Route path="/pictures" element={<PictureGallery />} />
          <Route path="/user-details/:username" element={<UserDetailsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
};

export default App;
