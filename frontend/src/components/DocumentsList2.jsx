import React, { useState, useEffect } from 'react';
import { API } from "aws-amplify";
import { BsThreeDots } from "react-icons/bs";
import Loading from "../../public/loading-dots.svg";

function DocumentsList2({ fileData, handlestartchatParent, documents, toggleMain }) {
  const [showFiles, setShowFiles] = useState([]);
  const [metaState, setMetaState] = useState('');
  const [selectedFile, setSelectedFile] = useState([]);
  const [loadingDots, setLoadingDots] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [componentKey, setComponentKey] = useState(0);


  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingDots((prevDots) => (prevDots + 1) % 3);
    }, 500);

    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    const updatedShowFiles = fileData
      .filter(file => file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.csv'))
      .map(file => {
        const existsInDocuments = documents.some(doc => doc.filename === file.name);
        const matchingDocument = existsInDocuments ? documents.find(doc => doc.filename === file.name) : null;

        return {
          ...file,
          meta: existsInDocuments ? 'meta' : 'nometa',
          filesize: matchingDocument?.filesize || null,
          pages: matchingDocument?.pages || null,
          documentid: matchingDocument?.documentid || null,
          conversationid: matchingDocument?.conversations[0].conversationid || null,
        };
      });

    setShowFiles(updatedShowFiles);
    const hasCommonFile = updatedShowFiles.some(file => file.meta === 'meta');
    setMetaState(hasCommonFile ? 'meta' : 'nometa');

  }, [fileData, documents]);


  const handleReadyForChat = async (name, public_url) => {
    setProcessing(true)
    try {
      await API.post("serverless-pdf-chat", "/Monday_upload_trigger", {
        body: {
          name: name,
          public_url: public_url
        },
      });
      const files = await getAllFiles();
      const matchingFiles = files.filter(file => file.name === name);
      setShowFiles(prevFiles => [...prevFiles, ...matchingFiles]);
      // setTimeout(() => setComponentKey(prevKey => prevKey + 1), 2000);
    } catch (error) {
      console.error('Error during API request:', error);
    }
  };

  const getAllFiles = async () => {
    try {
      const documents = await API.get("serverless-pdf-chat", "/doc", {});
      if (documents.length > 0) {
        // console.log("set selected file", documents);
      }
      return documents;
    } catch (error) {
      console.error('Error during getAllFiles request:', error);
    }
  };

  const handlestartchat = (documentid, conversationid) => {
    // Find the index of the file in showFiles array based on documentid and conversationid
    const fileIndex = showFiles.findIndex(file => file.documentid === documentid && file.conversationid === conversationid);

    if (fileIndex !== -1) {
      // Remove background color from the previously clicked file
      const updatedShowFiles = showFiles.map((file, index) => ({
        ...file,
        backgroundColor: index === fileIndex ? '#6B7280' : undefined,
      }));

      // Update the showFiles state with the modified array
      setShowFiles(updatedShowFiles);

      // Trigger component reload by updating the key
      setComponentKey(prevKey => prevKey + 1);
    }

    // Call your start chat function
    handlestartchatParent(documentid, conversationid);
    // toggleMain();
  };

  useEffect(() => {

  }, [showFiles, documents]);

  const formatFileSize = (sizeInBytes) => {
    const sizeInKB = Math.ceil(sizeInBytes / 1024);
    return `${sizeInKB} KB`;
  };



  const getBackgroundColor = (file) => {
    if (file.meta === 'meta') {
      return '#E5E7EB';
    } else if (file.meta === 'nometa') {
      return '#E5E7EB';
    } else {
      return 'lightblue';
    }
  };
  console.log(componentKey)
  return (
    <div key={componentKey}>
      <h6 className='doc_heading font-medium'>Files Gallery</h6>
      <div>
        {fileData.length > 0 ? (
          showFiles.map((file, index) => (
            <div className='file_container rounded-md p-0' key={index} style={{ backgroundColor: file.backgroundColor || getBackgroundColor(file) }}>
              <div className='p-3'>
                <div className='flex justify-between'>
                  <p className='file_name font-light'>{file.name}</p>
                  <p className='cursor-pointer'><BsThreeDots /></p>
                </div>
                {/* <p>{file.meta}</p> */}
                {file.meta === 'nometa' && (
                  <div className="overlay">
                    <p className='cursor-pointer text-black' onClick={(e) => handleReadyForChat(file.name, file.public_url)}>
                      click to activate
                    </p>
                  </div>
                )}
                {file.meta === 'meta' && (
                  <div className='flex align-middle h-2 p-0 mb-2'>
                    <div className='py-1'>
                      <p className='file_size'>{formatFileSize(file.filesize)}</p>
                    </div>
                    {/* <p>Pages: {file.pages}</p> */}
                    <div className=''>
                      <button className='ready_to_chat_btn' onClick={(e) => handlestartchat(file.documentid, file.conversationid)}>
                        <p>start conversation</p>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className='loading-dots'>
            <div className={`dot ${loadingDots === 0 ? 'red' : ''}`}></div>
            <div className={`dot ${loadingDots === 1 ? 'yellow' : ''}`}></div>
            <div className={`dot ${loadingDots === 2 ? 'green' : ''}`}></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentsList2;



