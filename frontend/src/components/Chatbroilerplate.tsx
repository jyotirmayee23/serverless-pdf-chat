import React from 'react'
import { FaRobot } from 'react-icons/fa';

const Chatbroilerplate = () => {
  return (
    <div className="main">
      <div className="msg_box_main">
        <div className="robo_border">
          <p className="robo text-[#434343]">
            <FaRobot />
          </p>
        </div>
      </div>
      <p className="tagline">How can I assist You!</p>
      <div className="sample_qua_main">
        <div className="que_1">
          <p className="que_1_p text-center font-normal">✨ Click the files on the left and let the conversation unfold!</p>
          <p className='text-center'></p>
        </div>
      </div>
    </div>
  )
}

export default Chatbroilerplate
