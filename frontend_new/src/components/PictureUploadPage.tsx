import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Cookies from "js-cookie";

const PictureUploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [encryptionAlgorithm, setEncryptionAlgorithm] = useState("AES");
  const [steganographyTechnique, setSteganographyTechnique] = useState("LSB");
  const [secretMessage, setSecretMessage] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const acceptedFile = acceptedFiles[0];
    if (acceptedFile && acceptedFile.type === "image/png") {
      setFile(acceptedFile);
      setPreview(URL.createObjectURL(acceptedFile));
      setMessage(null);
    } else {
      setMessage({ type: "error", text: "Please upload a PNG file." });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/png": [".png"] },
    multiple: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage({
        type: "error",
        text: "Please select a PNG file to upload.",
      });
      return;
    }
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("picture", file);
    formData.append("encryptionAlgorithm", encryptionAlgorithm);
    formData.append("steganographyTechnique", steganographyTechnique);
    formData.append("secretMessage", secretMessage);

    const token = Cookies.get("token");
    if (!token) {
      setMessage({
        type: "error",
        text: "Authentication token not found. Please log in again.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:4000/api/pictures/addPicture",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        // Reset form
        setFile(null);
        setPreview(null);
        setSecretMessage("");
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while uploading the picture. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Upload Picture</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer ${
              isDragActive ? "border-blue-500 bg-blue-50" : ""
            }`}
          >
            <input {...getInputProps()} />
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="mx-auto max-h-48 object-contain"
              />
            ) : (
              <p>Drag and drop a PNG file here, or click to select a file</p>
            )}
          </div>
          <div>
            <label
              htmlFor="encryptionAlgorithm"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Encryption Algorithm
            </label>
            <select
              id="encryptionAlgorithm"
              value={encryptionAlgorithm}
              onChange={(e) => setEncryptionAlgorithm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="AES">AES</option>
              <option value="3DES">3DES</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="steganographyTechnique"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Steganography Technique
            </label>
            <select
              id="steganographyTechnique"
              value={steganographyTechnique}
              onChange={(e) => setSteganographyTechnique(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LSB">LSB</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="secretMessage"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Secret Message
            </label>
            <textarea
              id="secretMessage"
              value={secretMessage}
              onChange={(e) => setSecretMessage(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          {message && (
            <div
              className={`p-3 rounded-md ${
                message.type === "error"
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {message.text}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading || !file}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isLoading || !file
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            }`}
          >
            {isLoading ? "Uploading..." : "Upload Picture"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PictureUploadPage;
