import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

interface AdminDetails {
  adminID: string;
  name: string;
  email: string;
  joiningDate: string;
}

const AdminDetailsPage: React.FC = () => {
  const { adminID } = useParams<{ adminID: string }>();
  const navigate = useNavigate();
  const [adminDetails, setAdminDetails] = useState<AdminDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminDetails();
  }, [adminID]);

  const fetchAdminDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = Cookies.get("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        return;
      }

      const response = await fetch(
        `http://localhost:4000/api/admins/getAdmin/${adminID}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setAdminDetails(data.admin);
        setName(data.admin.name);
        setEmail(data.admin.email);
      } else {
        setError(data.message || "Failed to fetch admin details");
      }
    } catch (error) {
      setError("An error occurred while fetching admin details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUpdateMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const token = Cookies.get("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        return;
      }

      const response = await fetch(
        "http://localhost:4000/api/admins/updateAdmin",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adminID: adminDetails?.adminID,
            name,
            email,
            ...(password && { password }),
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setAdminDetails(data.admin);
        setUpdateMessage("Admin details updated successfully");
        setIsEditing(false);
        setPassword("");
        setConfirmPassword("");
      } else {
        setError(data.message || "Failed to update admin details");
      }
    } catch (error) {
      setError("An error occurred while updating admin details");
    }
  };

  if (isLoading) {
    return <div className="text-center mt-8">Loading admin details...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Details</h1>
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700">
          {error}
        </div>
      )}
      {updateMessage && (
        <div className="mb-4 p-3 rounded-md bg-green-100 text-green-700">
          {updateMessage}
        </div>
      )}
      {!isEditing ? (
        <div>
          <div className="mb-4">
            <strong>Admin ID:</strong> {adminDetails?.adminID}
          </div>
          <div className="mb-4">
            <strong>Name:</strong> {adminDetails?.name}
          </div>
          <div className="mb-4">
            <strong>Email:</strong> {adminDetails?.email}
          </div>
          <div className="mb-4">
            <strong>Joining Date:</strong>{" "}
            {new Date(adminDetails?.joiningDate || "").toLocaleDateString()}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Edit Details
          </button>
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label htmlFor="name" className="block mb-1 font-medium">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block mb-1 font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-1 font-medium">
              New Password (leave blank to keep current password)
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block mb-1 font-medium">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex space-x-4">
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
            >
              Update
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setPassword("");
                setConfirmPassword("");
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <button
        onClick={() => navigate("/manage-admins")}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
      >
        Back to Manage Admins
      </button>
    </div>
  );
};

export default AdminDetailsPage;
