import React, { useState, useEffect } from 'react';
import { API } from "aws-amplify";
import { BsThreeDotsVertical } from "react-icons/bs";
import Loading from "../../public/loading-dots.svg";
import Popup from 'reactjs-popup';
import { FaFilePdf, FaFileCsv } from 'react-icons/fa';
import { FaFileWord } from "react-icons/fa";
import { MdTextSnippet } from "react-icons/md";
import { PiFilesFill } from "react-icons/pi";
import { Tooltip as ReactTooltip } from 'react-tooltip';

function DocumentsList2({
  fileData,
  handlestartchatParent,
  documents,
  handleUploadFileToMonday,
  handleDeletchat,
  handleDeletFull,
  handleviewFile,
  reload,
}) {
  const [showFiles, setShowFiles] = useState([]);
  const [metaState, setMetaState] = useState('');
  const [selectedFile, setSelectedFile] = useState([]);
  const [loadingDots, setLoadingDots] = useState(0);
  const [processing, setProcessing] = useState(null);
  const [clickedFileIndex, setClickedFileIndex] = useState(null);
  const [clickedFileId, setClickedFileId] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingDots((prevDots) => (prevDots + 1) % 3);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Extract the logic into a separate function
  const updateShowFiles = (fileData, documents) => {
    const updatedShowFiles = fileData
      .filter(file => file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.docx'))
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
  }, [fileData, documents, reload]);

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
        backgroundColor: index === fileIndex ? '#0073EA' : undefined,
      }));
      setShowFiles(updatedShowFiles);
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
      return '#ECEFF8';
    } else if (file.meta === 'nometa') {
      return '#ECEFF8';
    } else {
      return 'lightblue';
    }
  };

  const getFileIcon = (filename) => {
    if (filename.endsWith('.pdf')) {
      return <FaFilePdf />;
    } else if (filename.endsWith('.csv')) {
      return <FaFileCsv />;
    } else if (filename.endsWith('.docx')) {
      return <FaFileWord />;
    } else if (filename.endsWith('.text')) {
      return <MdTextSnippet />
    } else {
      return null;
    }
  };

  return (
    <div>
      <div className='flex align-middle h-12 justify-center'>
        <div className=''>
          <h6 className='doc_heading font-semibold'>Files Gallery</h6>
        </div>
        <div className='my-auto ml-2'>
          <p className='text-2xl'><PiFilesFill /></p>
        </div>
      </div>
      <div>
        {fileData.length > 0 ? (
          showFiles.map((file, index) => (
            <div
              className={`file_container rounded-md  flex align-middle h-[60px] ${index === clickedFileIndex ? 'clicked' : ''}`}
              key={index}
              style={{ backgroundColor: file.backgroundColor || getBackgroundColor(file) }}
            >
              <div className='flex align-middle justify-center my-auto'>
                <div className="icon-circle">
                  <p className='file_icon'>{getFileIcon(file.name)}</p>
                </div>
              </div>
              <div className='py-[5px] px-3  w-[45%]'>
                <div className=''>
                  <p className='file_name' data-tip={file.name}>{file.name}</p>
                  <ReactTooltip place="top" type="dark" effect="float" />
                </div>
                {file.meta === 'meta' && (
                  <div className=''>
                    <div className=''>
                      <p className='file_size font-thin text-[5px]'>{formatFileSize(file.filesize)}</p>
                    </div>
                  </div>
                )}
              </div>
              {file.meta === 'meta' && (
                <div className='my-auto w-[40%]'>
                  <div className='ready_to_chat_btn rounded-sm'>
                    <button className='my-auto' onClick={(e) => handlestartchat(file.documentid, file.conversationid)}>
                      <p className='tracking-wider text-center text-[11px] font-semibold'>start conversation</p>
                    </button>
                  </div>
                </div>
              )}
              {file.meta == 'meta' && (
                <div className='my-auto'>
                  <Popup
                    trigger={<div className="menu-item "> <p className='font-semibold'><BsThreeDotsVertical /></p> </div>}
                    position="right top"
                    on="hover"
                    closeOnDocumentClick
                    mouseLeaveDelay={300}
                    mouseEnterDelay={0}
                    contentStyle={{ padding: '10px', border: 'none', width: 'fit-content', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}
                    arrow={false}
                  >
                    <div className="menu w-fit">
                      <div className="menu-item py-1 px-4 hover:bg-gray-100">
                        <p
                          className='cursor-pointer mx-auto text-[12px] tracking-wide text-[#434343] text-center'
                          onClick={(e) => handleDeletchat([file.conversationid])}>Delet Chat</p>
                      </div>
                      <div className='menu-item py-1 px-4 hover:bg-gray-100'>
                        <p className='cursor-pointer mx-auto text-[12px] tracking-wide text-[#434343]'
                          onClick={(e) => handleDeletFull([file.conversationid], file.documentid)}>Delet File</p>
                      </div>
                      <div className='menu-item py-1 px-4 hover:bg-gray-100'>
                        <p className='cursor-pointer mx-auto text-[12px] tracking-wide text-[#434343]'
                          onClick={(e) => handleviewFile(file.public_url)}>View File</p>
                      </div>
                    </div>
                  </Popup>
                </div>
              )}
              {file.meta === 'nometa' && (
                <div className="overlay rounded-md">
                  <div>
                  </div>
                  <div className='ml-14 text-center'>
                    {processing === file.name ? <img src={Loading} width={40} className="py-2 mx-2" /> :
                      <p className='activate_btn cursor-pointer text-black bg-white text-[12px] font-semibold py-1 px-2 rounded-md ml-8 w-[125px]' onClick={(e) => handleReadyForChat(file.name, file.public_url)}>
                        click to activate
                      </p>}
                  </div>
                </div>
              )}
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
    </div >
  );
}

export default DocumentsList2;
