import React from 'react';

const Home = (props) => {

  return (
    <div className="bg-dim full-bg-size"
      style={{
        backgroundImage: `url("/images/oat_bkg.jpg")`,
        padding: `0px`
      }}>

      <div className="intro-horizontal-bar">
        <div className="intro-link-child">
        <h3 className="intro-header">OAT/OAM FIRMWARE CONFIGURATION</h3>
          <a className="intro-link" href="steps">START</a>
          <p className="version">V2.11</p>
        </div>
      </div>

    </div>
  );
}

export default Home;
