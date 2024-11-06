import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { ArrowUp, ArrowDown, Edit, Trash, Search } from "lucide-react";

interface Admin {
  adminID: string;
  name: string;
  email: string;
  joiningDate: string;
}

const ManageAdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof Admin>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    const filtered = admins.filter(
      (admin) =>
        admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.adminID.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAdmins(filtered);
  }, [searchTerm, admins]);

  const fetchAdmins = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = Cookies.get("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        return;
      }

      const response = await fetch(
        "http://localhost:4000/api/admins/getAllAdmins",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setAdmins(data.admins);
        setFilteredAdmins(data.admins);
      } else {
        setError(data.message || "Failed to fetch admin details");
      }
    } catch (error) {
      setError("An error occurred while fetching admin details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (column: keyof Admin) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }

    const sorted = [...filteredAdmins].sort((a, b) => {
      if (a[column] < b[column]) return sortDirection === "asc" ? -1 : 1;
      if (a[column] > b[column]) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredAdmins(sorted);
  };

  const handleDelete = (adminID: string) => {
    // Placeholder for delete functionality
    console.log(`Delete admin with ID: ${adminID}`);
  };

  const handleUpdate = (adminID: string) => {
    navigate(`/admin-details/${adminID}`);
  };

  if (isLoading) {
    return <div className="text-center mt-8">Loading admins...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manage Admins</h1>
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700">
          {error}
        </div>
      )}
      <div className="mb-4 flex items-center">
        <Search className="w-5 h-5 mr-2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, or admin ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-auto">
          <thead>
            <tr className="bg-gray-200">
              {["adminID", "name", "email", "joiningDate"].map((column) => (
                <th
                  key={column}
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => handleSort(column as keyof Admin)}
                >
                  <div className="flex items-center justify-between">
                    <span>
                      {column.charAt(0).toUpperCase() + column.slice(1)}
                    </span>
                    <div className="flex flex-col">
                      <ArrowUp
                        className={`w-4 h-4 ${
                          sortColumn === column && sortDirection === "asc"
                            ? "text-blue-600"
                            : "text-gray-400"
                        }`}
                      />
                      <ArrowDown
                        className={`w-4 h-4 ${
                          sortColumn === column && sortDirection === "desc"
                            ? "text-blue-600"
                            : "text-gray-400"
                        }`}
                      />
                    </div>
                  </div>
                </th>
              ))}
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAdmins.map((admin) => (
              <tr key={admin.adminID} className="border-b">
                <td className="px-4 py-2">{admin.adminID}</td>
                <td className="px-4 py-2">{admin.name}</td>
                <td className="px-4 py-2">{admin.email}</td>
                <td className="px-4 py-2">
                  {new Date(admin.joiningDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => handleUpdate(admin.adminID)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Update"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(admin.adminID)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageAdminsPage;
