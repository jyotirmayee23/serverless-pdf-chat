import React, { useState, useEffect } from 'react'
import DocumentsList2 from './DocumentsList2';
import ChatBox from './ChatBox';
import { API } from "aws-amplify";
import { RxCross1 } from "react-icons/rx";
 
 
interface Conversation {
  messages: any[];
}
 
function Layout2() {
  const storedBoardId = sessionStorage.getItem('boardId');
  // console.log("s boardid", storedBoardId);
  const [files, setFiles] = useState([])
  const [docs, setDocs] = useState([]);
  const [conversation, setConversation] = useState < Conversation > ({ messages: [] });
  const [messageStatus, setMessageStatus] = useState < string > ("idle");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = React.useState < string > ("idle");
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileToView, setFileToView] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [reload, setReload]= useState(false)
 
  const handleviewFile = (public_url) => {
    const googleDocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(public_url)}&embedded=true`;
    setFileToView(googleDocsViewerUrl);
    setShowModal(true);
  };
 
 
 
  useEffect(() => {
    fetchData();
  }, [storedBoardId]);
 
  useEffect(() => {
    getAllFiles();
  }, [])
 
  const fetchData = () => {
    let query = `query { boards (ids: ${storedBoardId}) {items_page (limit: 100) { items { assets {id name public_url }}}}}`
 
    fetch("https://api.monday.com/v2", {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjMxMzY1ODQxMCwiYWFpIjoxMSwidWlkIjo1MzYwNjYxMSwiaWFkIjoiMjAyNC0wMS0yNFQxMTo0MDo1Ni4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTAxNjc0NzQsInJnbiI6InVzZTEifQ.lG2wOhPzU9DJNGa_Kc_Y75SouPrHCsaOyTnC9eU0I14',
      },
      body: JSON.stringify({
        'query': query
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.data && res.data.boards) {
          const fileDetails = res.data.boards[0].items_page.items.flatMap((item: { assets: any[]; }) =>
            item.assets.map((asset: { public_url: any; id: any; name: any; }) => {
              const fileUrl = asset.public_url;
              return { id: asset.id, public_url: fileUrl, name: asset.name };
            }),
          );
 
          if (fileDetails) {
            setFiles(fileDetails);
          }
        }
      })
      .catch(error => console.error('Error:', error));
  };
 
  const getAllFiles = async () => {
    const documents = await API.get("serverless-pdf-chat", "/doc", {});
    if (documents.length > 0) {
      setDocs(documents);
    }
  };
  const handlestartchatParent = async (documentid: any, conversationid: any) => {
    const fetchData = async (docid: any, convid: any) => {
      try {
        const conversationData = await API.get('serverless-pdf-chat', `/doc/${docid}/${convid}`, {}
        );
        setConversation(conversationData);
        // setIdle(true)
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };
 
    fetchData(documentid, conversationid);
  };
 
 
  const getAllChatData = async (documentid: any, conversationid: any) => {
    setLoading("loading");
    const fetchData = async (docid: any, convid: any) => {
      try {
        const conversationData = await API.get('serverless-pdf-chat', `/doc/${docid}/${convid}`, {}
        );
        setConversation(conversationData);
        setLoading("idle");
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };
 
    fetchData(documentid, conversationid);
  };
 
  const submitMessage = async (conversationId: any, filename: any, prompt: any, documentId: any) => {
    setMessageStatus("loading");
    if (conversation !== null) {
      const previewMessage = {
        type: "text",
        data: {
          content: prompt,
          additional_kwargs: {},
          example: false,
        },
      };
 
      const updatedConversation = {
        ...conversation,
        messages: [...conversation.messages, previewMessage],
      };
 
      setConversation(updatedConversation);
    }
 
    try {
      const response = await API.post(
        "serverless-pdf-chat",
        `/${documentId}/${conversationId}`,
        {
          body: {
            fileName: filename,
            prompt: prompt,
          },
        }
      );
      // console.log("API Response:", response);
      setPrompt("");
      getAllChatData(documentId, conversationId);
      setMessageStatus("idle");
 
    } catch (error) {
      console.error("API Error:", error);
    }
 
  }
 
  const handleKeyPress = (event: { key: string; }, conversationId: any, filename: any, prompt: any, documentId: any) => {
    console.log("func called")
    if (event.key === "Enter") {
      submitMessage(conversationId, filename, prompt, documentId);
    }
  }
 
  const handlePromptChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    setPrompt(event.target.value);
  };
 
  const handleDeletchat = async (conversationIdToDelete: any) => {
    // console.log("Conversation ID to delete", conversationIdToDelete);
    alert("Do you want to delete your chat history ?")
    const fetchData = async (conversationId: any) => {
      try {
        const response = await API.del(
          'serverless-pdf-chat',
          '/Delete_History',
          {
            body: {
              conversation_ids: [conversationId],
            },
          }
        );
        console.log('Delete request successful', response);
        setConversation({ messages: [] })
      } catch (error) {
        console.error('Error during delete request:', error);
      }
    };
 
    fetchData(conversationIdToDelete);
  };
 
  const handleDeletFull = async (conversationIdToDeleteFull: any, documentIdToDeletFull: any) => {
    alert("Do you want to deactivate your file ?")
    const fetchData3 = async (conversationIdToDeleteFull: any, documentIdToDeletFull: any) => {
      try {
        const response = await API.del(
          'serverless-pdf-chat',
          '/Delete_Full',
          {
            body: {
              conversation_ids: [conversationIdToDeleteFull],
              document_id: documentIdToDeletFull,
            },
          }
        );
        console.log('Delete request successful', response);
        fetchData()
        getAllFiles()
        setReload(true)
      } catch (error) {
        console.error('Error during delete request:', error);
      }
    };
 
    fetchData3(conversationIdToDeleteFull, documentIdToDeletFull);
  };
 
  return (
    <>
      <div className='relative'>
        {/* This div will serve as the reference point for positioning the modal */}
        <div className="parent-container flex">
          <div className="files_con">
            <DocumentsList2
              fileData={files}
              handlestartchatParent={handlestartchatParent}
              documents={docs}
              handleDeletchat={handleDeletchat}
              handleDeletFull={handleDeletFull}
              handleviewFile={handleviewFile}
              reload={reload}
            />
          </div>
          <div className='chat_con'>
            <ChatBox
              handleKeyPress={handleKeyPress}
              prompt={prompt}
              conversation={conversation}
              submitMessage={submitMessage}
              loading={loading}
              messageStatus={messageStatus}
              handlePromptChange={handlePromptChange}
            />
          </div>
        </div>
 
        {/* Modal is positioned absolutely relative to the parent-container */}
        {showModal && (
          <div className="modal absolute inset-0 flex items-center justify-center">
            <div className="modal-content bg-white p-4 rounded shadow-lg">
              <button
                onClick={() => setShowModal(false)}
                className='bg-blue-500 text-white py-2 px-4 mb-2 rounded-sm'
              ><RxCross1 /></button>
              <iframe src={fileToView} width="100%" height="600px" />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
 
export default Layout2;
