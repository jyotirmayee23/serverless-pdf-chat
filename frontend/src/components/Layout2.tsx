import React, { useState, useEffect } from 'react'
import DocumentsList2 from './DocumentsList2';
import ChatBox from './ChatBox';
import { API } from "aws-amplify";


function Layout2() {
  const storedBoardId = sessionStorage.getItem('boardId');
  // console.log("s boardid", storedBoardId);
  const [files, setFiles] = useState([])
  const [showMain, setShowMain] = useState(true);
  const [docs, setDocs] = useState([]);
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messageStatus, setMessageStatus] = useState("");




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
          const fileDetails = res.data.boards[0].items_page.items.flatMap(item =>
            item.assets.map(asset => {
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
  const handlestartchatParent = async (documentid, conversationid) => {
    const fetchData = async (docid, convid) => {
      try {
        const conversationData = await API.get('serverless-pdf-chat', `/doc/${docid}/${convid}`, {}
        );
        setConversation(conversationData);
        setLoading(false);
        setIdle(true)
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };

    fetchData(documentid, conversationid);
  };

  const handleButtonClick = async (conversationId, filename, input, documentId) => {
    setMessageStatus("idle")
    setLoading(true);

    try {
      const response = await API.post(
        "serverless-pdf-chat",
        `/${documentId}/${conversationId}`,
        {
          body: {
            fileName: filename,
            prompt: input,
          },
        }
      );
      console.log("API Response:", response);
      handlestartchatParent(documentId, conversationId);

    } catch (error) {
      console.error("API Error:", error);
    }

  }





  return (
    <div className="main_container">
      <div className="files_con">
        <DocumentsList2
          fileData={files}
          handlestartchatParent={handlestartchatParent}
          documents={docs}
        />
      </div>
      <div className='chat_con'>
        <ChatBox
          // handleKeyPress={handleKeyPress}
          showMain={showMain}
          conversation={conversation}
          onButtonClick={handleButtonClick}
          loading={loading}
          messageStatus={messageStatus}
        />
      </div>
    </div>
  )
}

export default Layout2;
