import React from 'react';
import { CiFileOn } from "react-icons/ci";
import { GoStack } from "react-icons/go";
import { IoIosCloudDownload } from "react-icons/io";
import { ImSpinner8 } from "react-icons/im";

function Filedetails({ onChatStart, clearLoader }) {
  return (
    <div className='file_meta_box'>
      {clearLoader ? (
        <div className="loader">
        </div>
      ) : (
        <>
          <div className='file_meta_1'>
            <span><CiFileOn /></span>
            <p className='file_size'>243 kb</p>
          </div>
          <div className='file_meta_2'>
            <span><GoStack /></span>
            <p className='file_pages'>05 pages</p>
          </div>
        </>
      )}
    </div>
  );
}

export default Filedetails;

