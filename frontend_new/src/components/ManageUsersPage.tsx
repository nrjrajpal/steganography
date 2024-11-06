import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { ArrowUp, ArrowDown, Edit, Trash, Search } from "lucide-react";

interface User {
  username: string;
  name: string;
  email: string;
  joiningDate: string;
}

const ManageUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof User>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = Cookies.get("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        return;
      }

      const response = await fetch(
        "http://localhost:4000/api/users/getAllUsers",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setFilteredUsers(data.users);
      } else {
        setError(data.message || "Failed to fetch user details");
      }
    } catch (error) {
      setError("An error occurred while fetching user details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (column: keyof User) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }

    const sorted = [...filteredUsers].sort((a, b) => {
      if (a[column] < b[column]) return sortDirection === "asc" ? -1 : 1;
      if (a[column] > b[column]) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredUsers(sorted);
  };

  const handleDelete = (username: string) => {
    // Placeholder for delete functionality
    console.log(`Delete user with username: ${username}`);
  };

  const handleUpdate = (username: string) => {
    navigate(`/user-details/${username}`);
  };

  if (isLoading) {
    return <div className="text-center mt-8">Loading users...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manage Users</h1>
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700">
          {error}
        </div>
      )}
      <div className="mb-4 flex items-center">
        <Search className="w-5 h-5 mr-2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, or username"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-auto">
          <thead>
            <tr className="bg-gray-200">
              {["username", "name", "email", "joiningDate"].map((column) => (
                <th
                  key={column}
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => handleSort(column as keyof User)}
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
            {filteredUsers.map((user) => (
              <tr key={user.username} className="border-b">
                <td className="px-4 py-2">{user.username}</td>
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">
                  {new Date(user.joiningDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => handleUpdate(user.username)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Update"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.username)}
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

export default ManageUsersPage;
