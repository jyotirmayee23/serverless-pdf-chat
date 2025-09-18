import { ChangeEvent, useState, useEffect } from "react";
import { API } from "aws-amplify";
import { filesize } from "filesize";
import {
  DocumentIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  XCircleIcon,
  ArrowLeftCircleIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
 
const DocumentUploader: React.FC = () => {
  const [inputStatus, setInputStatus] = useState<string>("idle");
  const [buttonStatus, setButtonStatus] = useState<string>("ready");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
 
  useEffect(() => {
    if (selectedFile) {
      const fileType = selectedFile.type;
      const allowedTypes = [
        "application/pdf",
        "text/csv",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "video/mp4",
        "video/quicktime",
        "video/x-m4v"
      ];
      if (allowedTypes.includes(fileType)) {
        setInputStatus("valid");
      } else {
        setSelectedFile(null);
      }
    }
  }, [selectedFile]);
 
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
  };
 
  const uploadFile = async () => {
    setButtonStatus("uploading");
 
    if (selectedFile) {
      const contentType = selectedFile.type;
 
      await API.get("serverless-pdf-chat", "/generate_presigned_url", {
        headers: { "Content-Type": "application/json" },
        queryStringParameters: {
          file_name: selectedFile?.name,
        },
      }).then((presigned_url) => {
        fetch(presigned_url.presignedurl, {
          method: "PUT",
          body: selectedFile,
          headers: { "Content-Type": contentType },
        }).then(() => {
          setButtonStatus("success");
        });
      });
    }
  };
 
  const resetInput = () => {
    setSelectedFile(null);
    setInputStatus("idle");
    setButtonStatus("ready");
  };
 
  return (
    <div>
      <h2 className="text-2xl font-bold pb-4">Add document or video</h2>
      {inputStatus === "idle" && (
        <div className="flex flex-col items-center justify-center w-full">
          <label
            htmlFor="dropzone-file"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 mb-4"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <CloudArrowUpIcon className="w-12 h-12 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> your
                document or video
              </p>
              <p className="text-xs text-gray-500">
                Only .pdf, .xlsx, .csv, .txt, .docx, .mp4, .mov, .m4v accepted
              </p>
            </div>
            <input
              onChange={handleFileChange}
              id="dropzone-file"
              type="file"
              className="hidden"
              accept=".pdf, .xlsx, .csv, .txt, .docx, .mp4, .mov, .m4v"
            />
          </label>
        </div>
      )}
      {inputStatus === "valid" && (
        <div className="flex items-center justify-center w-full">
          <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50">
            <>
              <div className="flex flex-row items-center mb-5">
                {selectedFile?.type.startsWith("video/") ? (
                  <VideoCameraIcon className="w-14 h-14 text-gray-400" />
                ) : (
                  <DocumentIcon className="w-14 h-14 text-gray-400" />
                )}
                <div className="flex flex-col ml-2">
                  <p className="font-bold mb-1">{selectedFile?.name}</p>
                  <p>{selectedFile ? filesize(selectedFile.size).toString() : ""}</p>
                </div>
              </div>
              <div className="flex flex-row items-center">
                {buttonStatus === "ready" && (
                  <button
                    onClick={resetInput}
                    type="button"
                    className="inline-flex items-center text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg px-3 py-2 text-sm mr-2 mb-2 "
                  >
                    <XCircleIcon className="w-5 h-5 mr-1.5" />
                    Cancel
                  </button>
                )}
                {buttonStatus === "uploading" && (
                  <button
                    disabled
                    onClick={resetInput}
                    type="button"
                    className="inline-flex items-center text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg px-3 py-2 text-sm mr-2 mb-2 "
                  >
                    <XCircleIcon className="w-5 h-5 mr-1.5" />
                    Cancel
                  </button>
                )}
                {buttonStatus === "success" && (
                  <button
                    onClick={resetInput}
                    type="button"
                    className="inline-flex items-center text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg px-3 py-2 text-sm mr-2 mb-2 "
                  >
                    <ArrowLeftCircleIcon className="w-5 h-5 mr-1.5" />
                    Upload another
                  </button>
                )}
                {buttonStatus === "ready" && (
                  <button
                    onClick={uploadFile}
                    type="button"
                    className="inline-flex items-center bg-violet-900 text-white border border-gray-300 focus:outline-none hover:bg-violet-700 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg px-3 py-2 text-sm mr-2 mb-2 "
                  >
                    <CloudArrowUpIcon className="w-5 h-5 mr-1.5" />
                    Upload
                  </button>
                )}
                {buttonStatus === "uploading" && (
                  <button
                    disabled
                    onClick={uploadFile}
                    type="button"
                    className="inline-flex items-center bg-violet-900 text-white border border-gray-300 focus:outline-none hover:bg-violet-700 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg px-3 py-2 text-sm mr-2 mb-2 "
                  >
                    <svg
                      aria-hidden="true"
                      role="status"
                      className="inline w-4 h-4 mr-3 text-white animate-spin"
                      viewBox="0 0 100 101"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="#E5E7EB"
                      />
                      <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2611 1.69499 37.7926 4.19778 38.4297 6.62326C39.0668 9.04874 41.5303 10.4717 44.0498 10.1071C47.9928 9.47828 52.0179 9.46089 55.9787 10.0635C60.8705 10.7913 65.5553 12.5885 69.7341 15.3231C73.9129 18.0576 77.496 21.6904 80.2614 25.973C82.5346 29.3671 84.2283 33.1142 85.2854 37.0245C85.8946 39.373 87.5423 40.8562 89.9676 40.2191Z"
                        fill="currentColor"
                      />
                    </svg>
                    Uploading
                  </button>
                )}
                {buttonStatus === "success" && (
                  <button
                    disabled
                    onClick={uploadFile}
                    type="button"
                    className="inline-flex items-center bg-green-800 text-white border border-gray-300 focus:outline-none hover:bg-green-700 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg px-3 py-2 text-sm mr-2 mb-2 "
                  >
                    <CheckCircleIcon className="w-5 h-5 mr-1.5" />
                    Uploaded
                  </button>
                )}
              </div>
            </>
          </div>
        </div>
      )}
    </div>
  );
};
 
export default DocumentUploader;
