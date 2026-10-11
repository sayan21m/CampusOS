import React from "react";
import "./faculty_dashboard.css";

const attendanceData = [
  { subject: "SEEDCS101", present: 96, absent: 4 },
  { subject: "SEEDCS102", present: 89, absent: 11 },
  { subject: "SEEDCS103", present: 94, absent: 6 },
  { subject: "SEEDCS104", present: 88, absent: 12 },
  { subject: "SEEDCS105", present: 93, absent: 7 },
];

const classes = [
  ["09:00 AM – 10:00 AM", "SEEDCS101 – Data Structures", "A", "C-101"],
  ["11:00 AM – 12:00 PM", "SEEDCS102 – DBMS", "A", "C-102"],
  ["02:00 PM – 03:00 PM", "SEEDCS103 – Operating Systems", "A", "C-103"],
  ["04:00 PM – 05:00 PM", "SEEDCS104 – Computer Networks", "A", "C-104"],
];

const notices = [
  {
    title: "Class Test for SEEDCS101 postponed to next week.",
    text: "All students are hereby informed.",
    date: "Oct 10, 2026",
    type: "green",
  },
  {
    title: "Submission of Assignment 1",
    text: "Last date extended to 14 Oct 2026.",
    date: "Oct 08, 2026",
    type: "blue",
  },
  {
    title: "Departmental Seminar",
    text: "On 12 Oct 2026, 11:00 AM, Room C-201.",
    date: "Oct 05, 2026",
    type: "purple",
  },
  {
    title: "Holiday Notice",
    text: "College will remain closed on 2nd November 2026.",
    date: "Oct 03, 2026",
    type: "orange",
  },
];

function FacultyDashboard() {
  return (
    <div className="faculty-dashboard">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">🎓</div>

          <div>
            <h2>CampusOS</h2>
            <span>Faculty Portal</span>
          </div>
        </div>

        <div className="menu-title">OVERVIEW</div>

        <nav>
          <div className="menu-item active">
            <span>⌂</span>
            <span>Dashboard</span>
          </div>

          <div className="menu-item">
            <span>♙</span>
            <span>My Profile</span>
          </div>

          <div className="menu-item">
            <span>▣</span>
            <span>My Classes</span>
          </div>
        </nav>

        <div className="menu-title">ACADEMIC</div>

        <nav>
          <div className="menu-item">
            <span>▥</span>
            <span>Attendance</span>
          </div>

          <div className="menu-item">
            <span>▦</span>
            <span>Timetable</span>
          </div>

          <div className="menu-item">
            <span>▤</span>
            <span>Study Materials</span>
          </div>

          <div className="menu-item">
            <span>⚑</span>
            <span>Notices</span>
          </div>
        </nav>

        <div className="menu-title">OTHERS</div>

        <nav>
          <div className="menu-item">
            <span>⚙</span>
            <span>Settings</span>
          </div>

          <div className="menu-item">
            <span>↪</span>
            <span>Logout</span>
          </div>
        </nav>

      </aside>


      {/* MAIN AREA */}
      <main className="main-content">

        {/* TOP BAR */}
        <header className="topbar">

          <div>
            <p>Faculty Portal</p>
            <h1>Dashboard</h1>
          </div>

          <div className="faculty-account">

            <div className="account-avatar">SS</div>

            <div>
              <strong>Prof. Seed Student One</strong>
              <small>Faculty</small>
            </div>

            <span className="dropdown">⌄</span>

          </div>

        </header>


        <section className="dashboard-body">

          {/* PROFILE BANNER */}
          <section className="profile-banner">

            <div className="profile-left">

              <div className="large-avatar">SS</div>

              <div className="profile-details">

                <h2>Prof. Seed Student One</h2>
                <p>Assistant Professor</p>

                <div className="faculty-info">

                  <div>
                    <span>🏫</span>
                    <div>
                      <small>Department</small>
                      <strong>Seed Computer Science (SEEDCS)</strong>
                    </div>
                  </div>

                  <div>
                    <span>▣</span>
                    <div>
                      <small>Semester</small>
                      <strong>5</strong>
                    </div>
                  </div>

                  <div>
                    <span>♙</span>
                    <div>
                      <small>Section</small>
                      <strong>A</strong>
                    </div>
                  </div>

                </div>

              </div>

            </div>

            <div className="welcome">
              <span>☀</span>
              <strong>Good Morning,</strong>
              <small>Keep inspiring minds!</small>
            </div>

          </section>


          {/* STAT CARDS */}
          <section className="stats-grid">

            <div className="stat-card">
              <div className="stat-icon green">♟</div>
              <div>
                <span>Total Classes</span>
                <h2>12</h2>
                <small>This Week</small>
              </div>
              <b>›</b>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue">♟</div>
              <div>
                <span>Total Students</span>
                <h2>48</h2>
                <small>Across All Sections</small>
              </div>
              <b>›</b>
            </div>

            <div className="stat-card">
              <div className="stat-icon purple">✓</div>
              <div>
                <span>Attendance Rate</span>
                <h2>92%</h2>
                <small>This Month</small>
              </div>
              <b>›</b>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange">🔔</div>
              <div>
                <span>Pending Assignments</span>
                <h2>3</h2>
                <small>To Review</small>
              </div>
              <b>›</b>
            </div>

          </section>


          {/* ATTENDANCE + QUICK ACTIONS */}
          <section className="middle-grid">

            {/* ATTENDANCE */}
            <div className="card attendance-card">

              <div className="card-header">

                <div className="title-area">
                  <div className="section-icon">▥</div>

                  <div>
                    <h2>Attendance Overview</h2>
                    <p>Class-wise attendance for the current month</p>
                  </div>
                </div>

                <button className="month-button">
                  This Month ⌄
                </button>

              </div>


              {/* GRAPH */}
              <div className="attendance-chart">

                <div className="y-axis">
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>

                <div className="chart-area">

                  <div className="grid-line line100"></div>
                  <div className="grid-line line75"></div>
                  <div className="grid-line line50"></div>
                  <div className="grid-line line25"></div>
                  <div className="grid-line line0"></div>

                  <div className="bars">

                    {attendanceData.map((item) => (
                      <div className="bar-group" key={item.subject}>

                        <div className="bar-values">
                          <span>{item.present}%</span>
                          <span>{item.absent}%</span>
                        </div>

                        <div className="bars-container">

                          <div
                            className="bar present"
                            style={{ height: `${item.present}%` }}
                          ></div>

                          <div
                            className="bar absent"
                            style={{ height: `${item.absent}%` }}
                          ></div>

                        </div>

                        <label>{item.subject}</label>

                      </div>
                    ))}

                  </div>

                </div>

              </div>

              <div className="chart-legend">
                <span>
                  <i className="legend-present"></i>
                  Present
                </span>

                <span>
                  <i className="legend-absent"></i>
                  Absent
                </span>
              </div>

            </div>


            {/* QUICK ACTIONS */}
            <div className="card quick-card">

              <div className="card-title">
                <div className="quick-icon">⚡</div>
                <h2>Quick Actions</h2>
              </div>

              <div className="quick-grid">

                <button>
                  <span>▣</span>
                  <strong>Mark Attendance</strong>
                  <b>→</b>
                </button>

                <button>
                  <span>▦</span>
                  <strong>View Timetable</strong>
                  <b>→</b>
                </button>

                <button>
                  <span>▤</span>
                  <strong>Manage Assignments</strong>
                  <b>→</b>
                </button>

                <button>
                  <span>☁</span>
                  <strong>Upload Study Material</strong>
                  <b>→</b>
                </button>

              </div>

            </div>

          </section>


          {/* BOTTOM SECTION */}
          <section className="bottom-grid">

            {/* UPCOMING CLASSES */}
            <div className="card classes-card">

              <div className="card-title-row">
                <div className="card-title">
                  <div className="small-icon">▦</div>
                  <h2>Upcoming Classes</h2>
                </div>

                <a href="#">View All →</a>
              </div>

              <div className="class-table">

                <div className="table-header">
                  <span>Time</span>
                  <span>Subject</span>
                  <span>Section</span>
                  <span>Room</span>
                </div>

                {classes.map((item, index) => (
                  <div className="table-row" key={index}>
                    <span>{item[0]}</span>
                    <span>{item[1]}</span>
                    <span>{item[2]}</span>
                    <span>{item[3]}</span>
                  </div>
                ))}

              </div>

            </div>


            {/* RECENT NOTICES */}
            <div className="card notices-card">

              <div className="card-title-row">

                <div className="card-title">
                  <div className="small-icon">⚑</div>
                  <h2>Recent Notices</h2>
                </div>

                <a href="#">View All →</a>

              </div>

              <div className="notices-list">

                {notices.map((notice, index) => (

                  <div className="notice" key={index}>

                    <span className={`notice-dot ${notice.type}`}></span>

                    <div className="notice-content">
                      <strong>{notice.title}</strong>
                      <p>{notice.text}</p>
                    </div>

                    <time>{notice.date}</time>

                  </div>

                ))}

              </div>

            </div>

          </section>

        </section>

      </main>

    </div>
  );
}

export default FacultyDashboard;