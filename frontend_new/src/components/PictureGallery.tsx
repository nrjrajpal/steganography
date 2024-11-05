import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { Trash2, Eye, EyeOff, Share2 } from "lucide-react";

interface Picture {
  pictureID: string;
  imageURL: string;
}

const PictureGallery: React.FC = () => {
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [selectedPicture, setSelectedPicture] = useState<Picture | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hiddenMessage, setHiddenMessage] = useState<string>("");
  const [showHiddenMessage, setShowHiddenMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [shareUsernames, setShareUsernames] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareResult, setShareResult] = useState<{
    message: string;
    skippedUsers: string[];
  } | null>(null);

  useEffect(() => {
    fetchPictures();
  }, []);

  const fetchPictures = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        return;
      }

      const response = await fetch(
        "http://localhost:4000/api/pictures/getPictures",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setPictures(data.URLs);
      } else {
        setError("Failed to fetch pictures");
      }
    } catch (error) {
      setError("An error occurred while fetching pictures");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHiddenMessage = async (pictureID: string) => {
    try {
      const token = Cookies.get("token");
      if (!token) return;

      const response = await fetch(
        `http://localhost:4000/api/pictures/getHiddenMessage/${pictureID}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setHiddenMessage(data.message);
      }
    } catch (error) {
      setHiddenMessage("Failed to fetch hidden message");
    }
  };

  const handleDeletePicture = async (pictureID: string) => {
    if (!window.confirm("Are you sure you want to delete this picture?"))
      return;

    setDeleteLoading(true);
    try {
      const token = Cookies.get("token");
      if (!token) return;

      const response = await fetch(
        "http://localhost:4000/api/pictures/deletePicture",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pictureID }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setPictures(pictures.filter((pic) => pic.pictureID !== pictureID));
        setIsModalOpen(false);
        setSelectedPicture(null);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("An error occurred while deleting the picture");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSharePicture = async () => {
    if (!selectedPicture) return;

    setShareLoading(true);
    setShareResult(null);
    try {
      const token = Cookies.get("token");
      if (!token) return;

      const response = await fetch(
        "http://localhost:4000/api/pictures/shareImage",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pictureID: selectedPicture.pictureID,
            sharedUsernames: shareUsernames
              .split(",")
              .map((username) => username.trim()),
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setShareResult({
          message: data.message,
          skippedUsers: data.skippedUsers,
        });
        setShareUsernames("");
      } else {
        alert("Failed to share picture");
      }
    } catch (error) {
      alert("An error occurred while sharing the picture");
    } finally {
      setShareLoading(false);
    }
  };

  const openModal = async (picture: Picture) => {
    setSelectedPicture(picture);
    setIsModalOpen(true);
    setShowHiddenMessage(false);
    setHiddenMessage("");
    setShareResult(null);
    await fetchHiddenMessage(picture.pictureID);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading pictures...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">My Pictures</h1>

      {/* Picture Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {pictures.map((picture) => (
          <div
            key={picture.pictureID}
            className="relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100"
            onClick={() => openModal(picture)}
          >
            <img
              src={picture.imageURL}
              alt="User uploaded content"
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
            />
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && selectedPicture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-lg bg-white flex">
            <img
              src={selectedPicture.imageURL}
              alt="Selected picture"
              className="max-h-[80vh] object-contain"
            />
            <div className="w-64 bg-gray-100 p-4 flex flex-col">
              <button
                onClick={() => setIsModalOpen(false)}
                className="self-end mb-4 text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Actions:</h3>
                <button
                  onClick={() => setShowHiddenMessage(!showHiddenMessage)}
                  className="flex items-center justify-center w-full mb-2 py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {showHiddenMessage ? (
                    <EyeOff size={20} className="mr-2" />
                  ) : (
                    <Eye size={20} className="mr-2" />
                  )}
                  {showHiddenMessage ? "Hide Message" : "Show Hidden Message"}
                </button>
                <button
                  onClick={() => handleDeletePicture(selectedPicture.pictureID)}
                  disabled={deleteLoading}
                  className="flex items-center justify-center w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  <Trash2 size={20} className="mr-2" />
                  Delete Picture
                </button>
              </div>

              {showHiddenMessage && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Hidden Message:</h3>
                  <p className="bg-white p-2 rounded">
                    {hiddenMessage || "No hidden message found."}
                  </p>
                </div>
              )}

              <div className="mt-auto">
                <h3 className="font-semibold mb-2">Share with Users:</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Enter usernames separated by commas
                </p>
                <input
                  type="text"
                  value={shareUsernames}
                  onChange={(e) => setShareUsernames(e.target.value)}
                  placeholder="user1, user2, user3"
                  className="w-full p-2 border rounded mb-2"
                />
                <button
                  onClick={handleSharePicture}
                  disabled={shareLoading || !shareUsernames.trim()}
                  className="flex items-center justify-center w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  <Share2 size={20} className="mr-2" />
                  Share Picture
                </button>
              </div>

              {shareResult && (
                <div className="mt-4">
                  <p className="text-green-600">{shareResult.message}</p>
                  {shareResult.skippedUsers.length > 0 && (
                    <p className="text-yellow-600 mt-2">
                      Skipped users: {shareResult.skippedUsers.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PictureGallery;
