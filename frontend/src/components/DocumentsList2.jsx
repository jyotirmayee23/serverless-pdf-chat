import React, { useState, useEffect } from 'react';
import { API } from "aws-amplify";
import { BsThreeDots } from "react-icons/bs";
import Loading from "../../public/loading-dots.svg";
 
function DocumentsList2({ fileData, handlestartchatParent, documents, toggleMain }) {
  const [showFiles, setShowFiles] = useState([]);
  const [metaState, setMetaState] = useState('');
  const [selectedFile, setSelectedFile] = useState([]);
  const [loadingDots, setLoadingDots] = useState(0);
  const [processing, setProcessing] = useState(null);
  const [componentKey, setComponentKey] = useState(0);
  const [clickedFileIndex, setClickedFileIndex] = useState(null);
 
 
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingDots((prevDots) => (prevDots + 1) % 3);
    }, 500);
 
    return () => clearInterval(interval);
  }, []);
 
 
  // Extract the logic into a separate function
  const updateShowFiles = (fileData, documents) => {
    const updatedShowFiles = fileData
      .filter(file => file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.pptx') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.txt'))
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
  };
 
  useEffect(() => {
    updateShowFiles(fileData, documents);
  }, [fileData, documents]);
 
  const handleReadyForChat = async (name, public_url) => {
    setProcessing(name);
    try {
      await API.post("serverless-pdf-chat", "/Monday_upload_trigger", {
        body: {
          name: name,
          public_url: public_url
        },
      }).then(async () => {
        try {
          const documentsAgain = await API.get("serverless-pdf-chat", "/doc", {});
          if (documentsAgain.length > 0) {
            const matchingFiles = documentsAgain.filter(file => file.name === name);
            updateShowFiles(fileData, documentsAgain);
            setProcessing(null)
            // console.log("matching", matchingFiles);
          }
        } catch (error) {
          console.error('Error during getAllFiles request:', error);
        }
      });
    } catch (error) {
      console.error('Error during API request:', error);
      setProcessing(null);
    }
  };
 
 
 
  const handlestartchat = (documentid, conversationid) => {
    // Find the index of the file in showFiles array based on documentid and conversationid
    const fileIndex = showFiles.findIndex(file => file.documentid === documentid && file.conversationid === conversationid);
 
    if (fileIndex !== -1) {
      // Update the state variable with the clicked file index
      setClickedFileIndex(fileIndex);
 
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
  return (
    <div>
      <h6 className='doc_heading font-medium'>Files Gallery</h6>
      <div>
        {fileData.length > 0 ? (
          showFiles.map((file, index) => (
            <div
              className={`file_container rounded-md p-0 ${index === clickedFileIndex ? 'clicked' : ''}`}
              key={index}
              style={{ backgroundColor: file.backgroundColor || getBackgroundColor(file) }}
            >
              <div className='py-1 px-3'>
                <div className='flex justify-between'>
                  <p className='file_name font-light'>{file.name}</p>
                  <p className='cursor-pointer'><BsThreeDots /></p>
                </div>
                {/* <p>{file.meta}</p> */}
                {file.meta === 'nometa' && (
                  <div className="overlay">
                    {processing === file.name ? <img src={Loading} width={40} className="py-2 mx-2" /> :
                      <p className='cursor-pointer text-black' onClick={(e) => handleReadyForChat(file.name, file.public_url)}>
                        click to activate
                      </p>}
                  </div>
                )}
                {file.meta === 'meta' && (
                  <div className='flex align-middle p-0 w-[100%]'>
                    <div className='py-1 w-[50%]'>
                      <p className='file_size'>{formatFileSize(file.filesize)}</p>
                    </div>
                    {/* <p>Pages: {file.pages}</p> */}
                    <div className='w-[50%] flex justify-end'>
                      <button className='ready_to_chat_btn rounded-sm' onClick={(e) => handlestartchat(file.documentid, file.conversationid)}>
                        <p className='tracking-wider'>start conversation</p>
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
