import { Document } from "../common/types";
import { getDateTime } from "../common/utilities";
import { filesize } from "filesize";
import { BsThreeDots } from "react-icons/bs";
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';
import { API } from "aws-amplify";
import {
  DocumentIcon,
  CircleStackIcon,
  ClockIcon,
  CheckCircleIcon,
  CloudIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import { useEffect } from "react";
 
 
 
const DocumentDetail: React.FC<Document & { handleDeletFull: (documentId: string, conversationIds: string[]) => void }> = ({ handleDeletFull, ...document }) => {
  // console.log("document", document)
 
  useEffect(() => {
  }, [document])
 
  // const handleDeletFull = async (documentId, conversationIds) => {
  //   // console.log(Array.isArray(conversationIds))
  //   // console.log("document id", documentId)
  //   // console.log("conversation ids", conversationIds)
  //   alert("Do you want to delete this file?")
  //   const deleteFull = async (documentId, conversationIds) => {
  //     try {
  //       const response = await API.del(
  //         'serverless-pdf-chat',
  //         '/Delete_Full',
  //         {
  //           body: {
  //             document_id: documentId,
  //             conversation_ids: conversationIds,
  //           },
  //         }
  //       );
  //       console.log('Delete request successful', response);
  //     } catch (error) {
  //       console.error('Error during delete request:', error);
  //     }
  //   };
 
  //   deleteFull(documentId, conversationIds);
  // }
 
  return (
    <>
      <div className="flex justify-end">
        <Popup
          trigger={<div className="menu-item"> <p><BsThreeDots /></p> </div>}
          position="right top"
          on="hover"
          closeOnDocumentClick
          mouseLeaveDelay={300}
          mouseEnterDelay={0}
          contentStyle={{ padding: '0px', border: 'none' }}
          arrow={false}
        >
          <div className="menu">
            <div className="menu-item py-1 px-2">
              <p
                className="text-sm"
                onClick={() => handleDeletFull(document.documentid, document.conversations.map(conv => conv.conversationid))}>
                Delete File
              </p>
            </div>
            {/* <div className="menu-item py-1 px-2">
              <p className="text-sm ">Delete File</p>
            </div> */}
          </div>
        </Popup>
        <Popup
          trigger={<div className="menu-item"> <p><BsThreeDots /></p> </div>}
          position="right top"
          on="hover"
          closeOnDocumentClick
          mouseLeaveDelay={300}
          mouseEnterDelay={0}
          contentStyle={{ padding: '0px', border: 'none' }}
          arrow={false}
        >
          <div className="menu">
            <div className="menu-item py-1 px-2">
              <p
                className="text-sm"
                onClick={(e) => handleviewFiledocument.s3_object_url}>View File
              </p>
            </div>
            {/* <div className="menu-item py-1 px-2">
              <p className="text-sm ">Delete File</p>
            </div> */}
          </div>
        </Popup>
      </div>
      <h3 className="text-center mb-3 text-lg font-bold tracking-tight text-gray-900">
        {document.filename}
      </h3>
      <div className="flex flex-col space-y-2">
        {/* <div className="inline-flex items-center">
          <DocumentIcon className="w-4 h-4 mr-2" />
          {document.pages} pages
        </div> */}
        <div className="inline-flex items-center">
          <CircleStackIcon className="w-4 h-4 mr-2" />
          {filesize(Number(document.filesize)).toString()}
        </div>
        <div className="inline-flex items-center">
          <ClockIcon className="w-4 h-4 mr-2" />
          {getDateTime(document.created)}
        </div>
        {document.docstatus === "UPLOADED" && (
          <div className="flex flex-row justify-center pt-4">
            <span className="inline-flex items-center self-start bg-gray-100 text-gray-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
              <CloudIcon className="w-4 h-4 mr-1" />
              Awaiting processing
            </span>
          </div>
        )}
        {document.docstatus === "PROCESSING" && (
          <div className="flex flex-row justify-center pt-4">
            <span className="inline-flex items-center self-start bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
              <CogIcon className="w-4 h-4 mr-1 animate-spin" />
              Processing document
            </span>
          </div>
        )}
        {document.docstatus === "READY" && (
          <div className="flex flex-row justify-center pt-4">
            <span className="inline-flex items-center self-start bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
              <CheckCircleIcon className="w-4 h-4 mr-1" />
              Ready to chat
            </span>
          </div>
        )}
      </div>
    </>
  );
};
 
export default DocumentDetail;
