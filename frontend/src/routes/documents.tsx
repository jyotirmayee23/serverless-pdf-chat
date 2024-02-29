import React from "react";
import DocumentUploader from "../components/DocumentUploader";
import DocumentList from "../components/DocumentList";
import { useState } from "react";
import { RxCross1 } from "react-icons/rx";

const Documents: React.FC = () => {
  const [fileToView, setFileToView] = useState('');
  const [showModal, setShowModal] = useState(false);

  const handleViewFile = (url: string) => {
    console.log("Viewing file with URL:", url);
    const googleDocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    setFileToView(googleDocsViewerUrl);
    setShowModal(true);
  };

  return (
    <div className="relative">
      <DocumentUploader />
      <DocumentList handleViewFile={handleViewFile} />
      {showModal && (
        <div className="modal_exi absolute inset-0 flex items-center justify-center">
          <div className="modal-content_exi bg-white p-4 rounded shadow-lg">
            <button
              onClick={() => setShowModal(false)}
              className='bg-blue-500 text-white py-2 px-4 mb-2 rounded-sm'
            ><RxCross1 /></button>
            <iframe src={fileToView} width="100%" height="600px" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
