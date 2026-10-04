import React from "react";
import "./faculty_profile.css";

const FacultyProfile = () => {
  return (
    <div className="faculty-page">
      <div className="profile-container">

        {/* ================= HEADER ================= */}
        <div className="profile-header">

          {/* Back Button */}
          <button className="back-btn">
            ← <span>Back to Dashboard</span>
          </button>

          {/* Change Password */}
          <button className="password-btn">
            🔒 Change Password
          </button>

          {/* Profile Section */}
          <div className="profile-intro">

            {/* Avatar */}
            <div className="avatar">
              <div className="avatar-face">
                👩🏻‍🏫
              </div>
            </div>

            <div className="profile-main-info">

              {/* Edit Profile */}
             <button className="edit-btn">
               ✎ &nbsp; Edit Profile
                    </button>


              <h1>
                <span className="user-icon">👤</span>
                Prof. Ananya Sen
              </h1>

              <h3>Assistant Professor</h3>

              <div className="header-details">
                <span>
                  🎓 &nbsp; Department of Computer Science & Engineering
                </span>

                <span>
                  ✉ &nbsp; ananya.sen@college.edu
                </span>
              </div>

            </div>
          </div>
        </div>


        {/* ================= INFORMATION CARDS ================= */}
        <div className="info-grid">

          {/* Full Name */}
          <div className="info-card">
            <div className="card-icon">
              👤
            </div>

            <div className="card-content">
              <p>Full Name</p>
              <h3>Prof. Ananya Sen</h3>
            </div>
          </div>


          {/* Email */}
          <div className="info-card">
            <div className="card-icon">
              ✉
            </div>

            <div className="card-content">
              <p>Email</p>
              <h3>ananya.sen@college.edu</h3>
            </div>
          </div>


          {/* Employee ID */}
          <div className="info-card">
            <div className="card-icon">
              🪪
            </div>

            <div className="card-content">
              <p>Employee ID</p>
              <h3>CS20265045</h3>
            </div>
          </div>


          {/* Department */}
          <div className="info-card">
            <div className="card-icon">
              🎓
            </div>

            <div className="card-content">
              <p>Department</p>
              <h3>Computer Science & Engineering</h3>
            </div>
          </div>


          {/* Designation */}
          <div className="info-card">
            <div className="card-icon">
              🎓
            </div>

            <div className="card-content">
              <p>Designation</p>
              <h3>Assistant Professor</h3>
            </div>
          </div>


          {/* Role */}
          <div className="info-card">
            <div className="card-icon">
              👥
            </div>

            <div className="card-content">
              <p>Role</p>
              <h3>Faculty</h3>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default FacultyProfile;