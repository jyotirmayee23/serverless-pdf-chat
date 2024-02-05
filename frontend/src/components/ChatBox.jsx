import React, { useState, useEffect } from 'react';
import Colorfullloader from './Colorfullloader';
import Chatbroilerplate from './Chatbroilerplate';
import { HiOutlinePaperAirplane } from "react-icons/hi2";
import Loading from "../../public/loading-dots.svg";

function ChatBox({
  showMain,
  conversation,
  onButtonClick,
  loading,
  handleKeyPress,
  messageStatus,
}) {
  if (!conversation || !conversation.messages || !conversation.document) {
    return (
      <div className='chat_container2 h-96 flex p-4'>
        <div className="w-[100%] rounded-md">
          {/* <p className='text-center'>✨ Click the files on the left and let the conversation unfold!</p>
          <p className='text-center'>Your questions, their answers – just a click away. 💬📁</p> */}
          <Chatbroilerplate />
        </div>
      </div>
    );
  }
  const [chatContent, setChatContent] = useState([]);
  const [filename, setFilename] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [inputValue, setInputValue] = useState("");
  console.log("msg status", messageStatus)

  useEffect(() => {
    if (conversation) {
      setConversationId(conversation.conversationid);
      setFilename(conversation.document.filename);
      setDocumentId(conversation.document.documentid)
      if (messageStatus === "idle") {
        setInputValue("");
      }
    }
  }, [conversation, messageStatus]);
  return (
    <div className="chat_container">
      <>
        <div className="sample_chat_box">
          {conversation && conversation.messages ? (
            conversation.messages.map((message, i) => (
              <div
                className={`${message.type === "ai"
                  ? "justify-self-end w-fit rounded border border-gray-100 px-5 py-3.5 text-gray-800"
                  : "justify-self-start w-fit bg-slate-100 rounded border border-gray-100 px-5 py-3.5 text-gray-800 my-4"
                  }`}
                key={i}
              >
                <div className="prose">
                  <p>{message.data.content}</p>
                </div>
              </div>
            ))
          ) : null}
          {loading && <img src={Loading} width={40} className="py-2 mx-2" />}
        </div>
        <div className='input_section'>
          <div className="input_box">
            <input
              disabled={loading}
              required
              type="text"
              className="msg_input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Ask ${conversation.document.filename} anything...`}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onButtonClick(conversationId, filename, inputValue, documentId);
                } else {
                  handleKeyPress(conversationId, filename, inputValue, documentId);
                }
              }}
            />
            <button
              type="button"
              className="send_btn"
              onClick={() => onButtonClick(conversationId, filename, inputValue, documentId)}
            >
              {loading ? <div className="loader"></div> : <p><HiOutlinePaperAirplane /></p>}
            </button>
          </div>
        </div>
      </>
    </div>
  );
}

export default ChatBox;