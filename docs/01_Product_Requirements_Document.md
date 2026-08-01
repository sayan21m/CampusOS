<div align="center">

# CampusOS

### One Platform for Everything on Campus

**Product Requirements Document**

---

| |                                                                        |
|---|------------------------------------------------------------------------|
| **Project Name** | CampusOS                                                               |
| **Document Type** | Product Requirements Document (PRD)                                    |
| **Version** | 1.0                                                                    |
| **Team Name** | *Spark Squad*                                                          |
| **Team Members** | *Sayan Garai, Soumili Hazra, Suprit Mukhopadhyay, Akash Sen, Aritra Ghosh* |
| **Guide / Mentor** | *JM*                                                                   |
| **Department** | Information Technology                                                 |
| **Institution** | *MCKV Institute of Engineering*                                        |
| **Date** | 1 August 2026                                                          |
| **Status** | Draft for Review                                                       |

---

</div>

<div style="page-break-after: always;"></div>

## Document Revision History

| Version | Date | Author | Description of Change |
|---|---|---|---|
| 0.1 | 20 July 2026 | Team | Initial outline and problem research |
| 0.5 | 27 July 2026 | Team | Added feature list and requirements draft |
| 1.0 | 1 August 2026 | Team | First complete version submitted for review |

---

## Table of Contents

| Section | Title |
|---|---|
| 1 | Introduction |
| 2 | Project Overview |
| 3 | Target Users |
| 4 | Current Problems in Colleges |
| 5 | Proposed Solution |
| 6 | Core Features |
| 7 | Functional Requirements |
| 8 | Non-Functional Requirements |
| 9 | User Roles and Permissions |
| 10 | User Flow |
| 11 | Technology Stack |
| 12 | Database Overview |
| 13 | UI Modules |
| 14 | Assumptions |
| 15 | Constraints |
| 16 | Future Enhancements |
| 17 | Risks |
| 18 | Success Criteria |
| 19 | Conclusion |
| 20 | Glossary |

<div style="page-break-after: always;"></div>

# 1. Introduction

## 1.1 Problem Statement

College life involves a surprising amount of information management. In a single week, a student may need to check an assignment deadline, find last year's question paper, confirm whether a class has been rescheduled, verify their attendance percentage, and register for a club event.

Right now, none of this lives in one place.

Notes get shared in WhatsApp groups and disappear under hundreds of messages. Notices get pinned on a physical board that half the students never walk past. Attendance is visible only when a faculty member happens to announce it. Assignment deadlines are communicated verbally in class, and anyone who was absent that day simply misses them.

The result is a familiar and avoidable kind of chaos: students miss deadlines not because they are careless, but because the information never reached them reliably. Faculty spend time repeating announcements and manually collecting submissions. Administrators have no simple way to reach the entire campus at once.

**The core problem is not a lack of information — it is that campus information is scattered across too many disconnected channels.**

## 1.2 Purpose

The purpose of this document is to define what CampusOS is, who it is for, and exactly what it must do.

This PRD serves as the single reference point for our team during development. It describes the problem we are solving, the features we plan to build, the requirements each feature must satisfy, and the boundaries of what is realistically achievable within one academic semester.

Specifically, this document is intended to:

- Give every team member a shared understanding of the product before coding begins.
- Provide our faculty guide with a clear picture of the project's scope and depth.
- Act as the base document from which the SRS, system architecture, and database design will be derived.
- Prevent scope creep by clearly separating what is in scope from what is a future enhancement.

## 1.3 Objectives

| # | Objective | Description |
|---|---|---|
| O1 | Centralise campus information | Bring notices, notes, timetables, assignments, and attendance into a single web platform. |
| O2 | Reduce missed deadlines | Ensure every assignment and notice reaches the right students through dashboards and notifications. |
| O3 | Build a permanent study material repository | Organise notes and previous papers by semester, subject, and unit so material survives past the semester. |
| O4 | Give students visibility into their own academics | Let a student see attendance, deadlines, and timetable without asking anyone. |
| O5 | Reduce repetitive work for faculty | Let faculty upload once and reach all their students, instead of managing multiple groups. |
| O6 | Support role-based access | Ensure students, faculty, and admins each see only what is relevant and permitted for them. |
| O7 | Deliver a working, demonstrable system | Produce a functional, deployed application — not a mockup — within the project timeline. |
| O8 | Design for future growth | Structure the codebase and database so that features like AI assistance can be added later. |

<div style="page-break-after: always;"></div>

# 2. Project Overview

## 2.1 What CampusOS Is

**CampusOS is a web-based college management platform that brings the everyday academic services of a college into one place.**

Think of it as the digital version of everything that currently happens through notice boards, WhatsApp groups, shared Google Drive links, and word of mouth — organised properly and available to the right people.

A student logs in and immediately sees their timetable for the day, pending assignments with deadlines, recent notices, and their current attendance. A faculty member logs in and can upload notes, post an assignment, mark attendance, and publish a notice to their classes. An administrator manages users, subjects, the academic calendar, and campus-wide announcements.

CampusOS is deliberately built around **existing college workflows** rather than trying to reinvent them. Faculty already take attendance and give assignments; CampusOS simply gives those activities a reliable digital home.

## 2.2 What CampusOS Is Not

Being clear about boundaries is as important as listing features. For this version, CampusOS is **not**:

- An examination or grading system (marks entry and result processing are out of scope).
- A fee payment or financial management system.
- A replacement for the college ERP used by the accounts or admissions departments.
- A social media platform. It has no public feed, no likes, and no follower system.
- A video conferencing or online class delivery tool.

## 2.3 Who Will Use It

CampusOS has three primary user types, each with a dedicated dashboard:

| User Type | Approximate Share of Users | Primary Use |
|---|---|---|
| Students | ~90% | Consuming information — notes, deadlines, notices, attendance |
| Faculty | ~9% | Publishing information — assignments, notes, attendance, notices |
| Administrators | ~1% | Managing the system — users, subjects, calendar, campus notices |

## 2.4 Expected Benefits

**For Students**

- One login instead of six WhatsApp groups and three Drive folders.
- Deadlines visible well in advance, with reminders before they pass.
- Notes organised by subject and unit, not buried in chat history.
- Attendance visible any time, so shortage is noticed early enough to fix.
- Access to previous semester material that would otherwise be lost.

**For Faculty**

- Upload notes once; every enrolled student receives them.
- Assignment submissions collected in one list instead of over email and chat.
- No repeated announcements for students who were absent.
- A simple record of attendance without maintaining separate registers.

**For the College**

- Announcements reach every student reliably and can be verified as delivered.
- Academic material accumulates over years into a genuine institutional resource.
- Reduced dependence on paper notices and physical boards.
- A single, consistent source of truth for academic scheduling.

<div style="page-break-after: always;"></div>

# 3. Target Users

## 3.1 Students

**Who they are:** Undergraduate students across all semesters and branches. They are comfortable with mobile apps, expect fast interfaces, and will abandon a tool that is slower than asking a friend.

**What they need from CampusOS:**

- To know what is due and when, without hunting for it.
- To find notes for a specific unit quickly, especially the night before an exam.
- To check attendance without asking a faculty member.
- To not miss notices simply because they were absent.

**Typical usage pattern:** Short, frequent visits — often from a phone, often between classes. Usage spikes sharply before exams and assignment deadlines.

**Example persona — Ananya, 3rd Semester CSE**
> Ananya missed Tuesday's classes because she was unwell. She has no idea that a DBMS assignment was announced, that the Data Structures lab was rescheduled, or that a notice about the internal exam timetable was read out. She finds out about all three separately over the next four days, and the assignment is already half past its deadline. With CampusOS, all three would have been on her dashboard the moment she opened the app.

## 3.2 Faculty

**Who they are:** Teaching staff handling one or more subjects across multiple sections. Their technical comfort varies widely — some are very comfortable with technology, others prefer minimal, obvious interfaces.

**What they need from CampusOS:**

- To distribute material to a whole class in one action.
- To post an assignment and see who has submitted, without sorting through email.
- To mark attendance quickly, ideally in under two minutes per class.
- To communicate with a specific class without creating another group.

**Typical usage pattern:** Focused sessions — a few minutes after each class, and longer sessions when uploading material or reviewing submissions.

**Example persona — Prof. Ramesh, Department of CSE**
> Prof. Ramesh teaches three sections of the same subject. Today he answers the same question about a deadline eleven times across three WhatsApp groups, and two students email him assignments he never receives because they went to spam. With CampusOS, he posts the assignment once and all three sections see the same deadline, with submissions collected in a single list.

## 3.3 Administrators

**Who they are:** Department coordinators, HODs, or designated staff responsible for academic coordination. Usually a small number of people with elevated system access.

**What they need from CampusOS:**

- To create and manage student and faculty accounts.
- To publish notices that reach the entire college, a department, or a specific year.
- To maintain the academic calendar and subject allocations.
- To have oversight of what is being published on the platform.

**Typical usage pattern:** Infrequent but high-impact — bulk user creation at the start of a semester, notices as needed, calendar updates monthly.

<div style="page-break-after: always;"></div>

# 4. Current Problems in Colleges

Before designing features, our team spoke informally with classmates and two faculty members and listed the problems that came up repeatedly. These are the problems CampusOS is built to address.

## 4.1 Notes Shared Through WhatsApp

Study material is circulated in class WhatsApp groups as PDFs and photographs of handwritten notes. Within a few days, these get pushed far up the chat by unrelated messages. Searching for "Unit 3 notes" returns dozens of irrelevant matches. Students who join a group late never receive earlier files, and WhatsApp eventually clears media from storage, leaving broken files behind.

**Impact:** Material is effectively lost within weeks of being shared.

## 4.2 Assignment Deadlines Getting Missed

Deadlines are usually announced verbally in class. There is no written record, no reminder, and no way for an absent student to find out. Different faculty use different channels — one uses email, another uses the class group, a third relies entirely on in-class announcements.

**Impact:** Students lose marks for reasons unrelated to their understanding of the subject.

## 4.3 Too Many Communication Platforms

A single student may need to monitor a class WhatsApp group, a section group, a club group, email, a physical notice board, and occasionally an Instagram page. Important information competes with noise on every one of these channels.

**Impact:** Genuine notices get missed because there is no channel that is reliably "official".

## 4.4 No Centralised Academic Dashboard

There is no single screen that answers the question "what do I need to know today?" A student has to check several places and assemble the answer themselves.

**Impact:** Avoidable mental overhead, and a constant low-level uncertainty about whether something has been missed.

## 4.5 Attendance Information Is Scattered

Attendance is maintained in registers or personal spreadsheets by individual faculty. Students typically learn their attendance percentage only when it is announced — often too late in the semester to correct a shortage.

**Impact:** Students discover attendance problems when it is already too late to fix them.

## 4.6 Manual and Physical Notices

Notices are printed and pinned to a board in one corridor. Students who do not pass that corridor never see them. There is no record of who has seen a notice, and no way to send an urgent update quickly.

**Impact:** Slow, unreliable, and impossible to verify.

## 4.7 Difficulty Accessing Previous Semester Materials

Every batch independently collects notes, question papers, and lab manuals — and every batch loses them at the end of the semester. Juniors ask seniors for material through personal contacts, and the quality of what they get depends entirely on who they happen to know.

**Impact:** The college loses years of accumulated study material, and access becomes a matter of luck.

## 4.8 Summary Table

| # | Problem | Current Method | Consequence |
|---|---|---|---|
| P1 | Notes distribution | WhatsApp, personal Drive links | Material lost within weeks |
| P2 | Assignment deadlines | Verbal announcements | Missed submissions |
| P3 | Communication | 5–6 parallel platforms | Important updates buried |
| P4 | Academic overview | Does not exist | Constant uncertainty |
| P5 | Attendance | Registers, spreadsheets | Shortage found out too late |
| P6 | Notices | Physical board | Low and unverifiable reach |
| P7 | Past materials | Senior-to-junior contact | Unequal, luck-based access |

<div style="page-break-after: always;"></div>

# 5. Proposed Solution

CampusOS addresses each of the problems above with a specific, deliberately simple feature. The design principle we followed is: **one problem, one obvious place to solve it.**

| Problem | CampusOS Solution | How It Helps |
|---|---|---|
| P1 — Notes lost in WhatsApp | **Notes & Study Material Repository** organised by semester → subject → unit | Material is stored permanently, categorised, and searchable. Nothing expires or gets buried. |
| P2 — Missed deadlines | **Assignment Management** with due dates on the student dashboard, plus reminder notifications | Every assignment is written down, visible in advance, and reminds the student before it closes. |
| P3 — Too many platforms | **Single platform with role-based dashboards** | One official channel. If it is on CampusOS, it is real; if it is not, it is not official. |
| P4 — No central dashboard | **Student Dashboard** showing today's classes, pending work, recent notices, attendance | The "what do I need to know today?" question is answered in one screen. |
| P5 — Scattered attendance | **Attendance Tracking** with faculty marking and student-visible percentages | Students see their own attendance any time and get warned before falling short. |
| P6 — Manual notices | **Digital Notice Board** with targeted audiences and notifications | Notices reach the exact intended group instantly and remain accessible afterwards. |
| P7 — Lost past materials | **Semester Resource Library** archiving material by semester and year | Material from previous batches remains available to juniors automatically. |

## 5.1 Design Philosophy

Three ideas guided our feature decisions:

**1. Match existing habits, don't fight them.**
Faculty already take attendance and set deadlines. CampusOS gives those actions a digital home rather than asking anyone to work in a new way.

**2. Read-heavy for students, write-light for faculty.**
Students mostly consume information, so their screens are optimised for fast reading. Faculty mostly publish, so their screens are optimised for completing an upload or marking attendance in as few clicks as possible.

**3. Nothing should be more than three clicks away.**
If finding something on CampusOS is slower than asking a classmate, students will ask the classmate. Speed of access is a genuine functional requirement, not a nice-to-have.

<div style="page-break-after: always;"></div>

# 6. Core Features

This section describes each feature in detail. Features marked **Phase 1** are part of the core project deliverable. Features marked **Phase 2** will be attempted if time permits. Features marked **Future** are documented for completeness but are not part of this project.

| # | Feature | Phase | Primary User |
|---|---|---|---|
| F01 | Student Dashboard | Phase 1 | Student |
| F02 | Faculty Dashboard | Phase 1 | Faculty |
| F03 | Admin Dashboard | Phase 1 | Admin |
| F04 | Digital Notice Board | Phase 1 | All |
| F05 | Assignment Management | Phase 1 | Student, Faculty |
| F06 | Notes & Study Material Repository | Phase 1 | Student, Faculty |
| F07 | Timetable Management | Phase 1 | All |
| F08 | Attendance Tracking | Phase 1 | Student, Faculty |
| F09 | Academic Calendar | Phase 1 | All |
| F10 | Notifications | Phase 1 | All |
| F11 | Search Functionality | Phase 1 | All |
| F12 | User Profiles | Phase 1 | All |
| F13 | Event Management | Phase 2 | All |
| F14 | Club Management | Phase 2 | Student |
| F15 | Semester Resource Library | Phase 2 | Student |
| F16 | AI Study Assistant | Future | Student |

---

## 6.1 Student Dashboard 🎓

**Phase 1 · Primary user: Student**

The first screen a student sees after logging in, and the most important screen in the entire product. It answers one question: *what do I need to know right now?*

**Key capabilities**

- **Today's Timetable** — the day's classes with time, subject, faculty, and room number. The current or next class is highlighted.
- **Pending Assignments** — upcoming submissions sorted by deadline, with a colour indicator (green for comfortable, amber for due soon, red for due within 24 hours).
- **Recent Notices** — the latest notices relevant to the student, with unread ones marked.
- **Attendance Summary** — overall attendance percentage plus a warning banner if any subject falls below the required threshold.
- **Quick Links** — one-click access to notes, calendar, and profile.

**Design note:** The dashboard is read-only by design. It shows information and links elsewhere for actions. This keeps it fast and uncluttered.

---

## 6.2 Faculty Dashboard 👨‍🏫

**Phase 1 · Primary user: Faculty**

A working screen built around the small set of tasks a faculty member performs regularly.

**Key capabilities**

- **My Classes** — subjects and sections assigned to the faculty member for the current semester.
- **Today's Schedule** — the day's classes, each with a direct "Mark Attendance" button.
- **Submission Overview** — active assignments with a submitted-versus-total count.
- **Quick Actions** — shortcuts to upload notes, create an assignment, or post a notice.
- **Recent Activity** — a short log of the faculty member's recent uploads and posts.

---

## 6.3 Admin Dashboard ⚙️

**Phase 1 · Primary user: Administrator**

The control panel for the platform. Access is strictly restricted.

**Key capabilities**

- **User Management** — create, edit, deactivate, and reset passwords for student and faculty accounts, including bulk creation via CSV upload.
- **Subject & Allocation Management** — define subjects per semester and branch, and assign faculty to them.
- **Campus-Wide Notices** — publish notices targeted at the whole college, a department, or a specific year.
- **Academic Calendar Management** — add and edit holidays, exam periods, and important dates.
- **System Overview** — basic counts of active users, uploaded materials, and notices published.

---

## 6.4 Digital Notice Board 📢

**Phase 1 · Primary user: All**

The official announcement channel, replacing the physical board.

**Key capabilities**

- **Targeted audiences** — a notice can be addressed to everyone, a department, a year, a specific section, or a single subject's students.
- **Categories** — Academic, Examination, Event, Holiday, Urgent. Each category has a distinct visual tag.
- **Priority levels** — Normal, Important, Urgent. Urgent notices are pinned to the top and trigger a notification.
- **Attachments** — notices can include a PDF or image.
- **Read tracking** — the publisher can see how many recipients have opened the notice.
- **Archive** — old notices remain searchable rather than being deleted.

---

## 6.5 Assignment Management 📝

**Phase 1 · Primary users: Student, Faculty**

Handles the full cycle from posting an assignment to collecting submissions.

**Faculty side**

- Create an assignment with title, description, subject, deadline, maximum marks, and an optional attachment.
- Target a specific section or all sections of a subject.
- View a submission list showing who has submitted, who has not, and who submitted late.
- Download all submissions individually or as a single archive.
- Optionally record marks and written feedback against a submission.

**Student side**

- See all assignments with clear status: Pending, Submitted, Late, or Graded.
- Upload a submission file (PDF, DOCX, or ZIP) before the deadline.
- Replace a submission any time before the deadline closes.
- Receive reminder notifications 48 hours and 12 hours before the deadline.
- View marks and feedback once the faculty member has released them.

**Deadline rule:** After a deadline passes, submission is blocked by default. Faculty may enable a "late submission allowed" flag per assignment, in which case late submissions are accepted and clearly marked as late.

---

## 6.6 Notes & Study Material Repository 📚

**Phase 1 · Primary users: Student, Faculty**

A properly organised home for study material — the direct replacement for WhatsApp file sharing.

**Key capabilities**

- **Three-level organisation** — Semester → Subject → Unit/Module. Every file has a defined place.
- **Material types** — Lecture Notes, Presentations, Lab Manuals, Reference Material, Previous Year Papers.
- **Upload metadata** — title, description, unit number, and uploading faculty are recorded with each file.
- **Preview and download** — PDFs can be previewed in the browser before downloading.
- **Version handling** — if a faculty member re-uploads a corrected file, the older version is replaced but the upload date is updated so students know it changed.
- **Access control** — students see material for their own semester and subjects; faculty manage material for subjects allotted to them.

**Supported formats:** PDF, DOCX, PPTX, PNG, JPG, ZIP. Maximum file size 25 MB per upload.

---

## 6.7 Timetable Management 🗓️

**Phase 1 · Primary user: All**

A single authoritative class schedule.

**Key capabilities**

- **Weekly grid view** — the standard timetable layout, showing periods against days.
- **Day view** — a simplified list for mobile, showing only today's classes.
- **Personalised** — students see their section's timetable; faculty see their own teaching schedule assembled across sections.
- **Details per period** — subject, faculty name, room number, and period timing.
- **Temporary changes** — admins and faculty can mark a class as cancelled or rescheduled for a specific date, and affected students are notified.

**Note:** Timetables are entered manually by the admin in this version. Automatic timetable generation is listed as a future enhancement because constraint-based scheduling is a substantial project in its own right.

---

## 6.8 Attendance Tracking ✅

**Phase 1 · Primary users: Student, Faculty**

Makes attendance transparent to the student who is affected by it.

**Faculty side**

- Mark attendance for a class from a simple list of enrolled students with Present/Absent toggles.
- "Mark all present" as a starting point, then flip only the absentees — this keeps a typical class under a minute.
- Edit attendance for a past date within a configurable correction window (default seven days).
- View subject-wise attendance reports and export them as CSV.

**Student side**

- View overall attendance percentage and a subject-wise breakdown.
- See a date-wise record of classes attended and missed.
- Receive an automatic warning when attendance in any subject drops below 75%.
- See how many consecutive classes must be attended to return above the threshold — a small feature, but the one students actually want.

---

## 6.9 Academic Calendar 📅

**Phase 1 · Primary user: All**

The official semester schedule in one view.

**Key capabilities**

- Month view with colour-coded entries.
- Entry types: Holiday, Examination, Assignment Deadline, Event, Last Working Day.
- Assignment deadlines and registered events appear on a student's calendar automatically.
- Filterable by entry type.
- Managed by administrators; visible to everyone.

---

## 6.10 Event Management 🎉

**Phase 2 · Primary user: All**

Handles technical fests, workshops, seminars, and departmental events.

**Key capabilities**

- Event listing with title, description, date, time, venue, and poster image.
- Online registration with an optional participant limit.
- A registered-students list that the organiser can export.
- Registration confirmation and event reminder notifications.
- Registered events automatically appear in the student's academic calendar.
- Past events are archived with the participant list retained.

---

## 6.11 Club Management 🏛️

**Phase 2 · Primary user: Student**

Gives student clubs an official presence instead of relying on Instagram pages and personal groups.

**Key capabilities**

- A profile page per club with description, logo, and coordinator contact.
- Member joining, with approval by the club coordinator.
- Club-specific announcements visible to members only.
- Club-hosted events published through the Event Management module.
- A directory of all clubs, so first-year students can actually discover them.

---

## 6.12 Semester Resource Library 🗂️

**Phase 2 · Primary user: Student**

The archive that solves the senior-to-junior material problem permanently.

**Key capabilities**

- Browse material by semester and academic year, independent of current enrolment.
- Access previous years' notes, question papers, and lab manuals.
- Read-only for students; contributions are moderated by faculty or admin.
- Filter by subject, year, and material type.

**Why this matters:** Once CampusOS has been in use for two or three semesters, this library becomes the most valuable thing in the system — a genuine institutional archive that currently does not exist anywhere.

---

## 6.13 Notifications 🔔

**Phase 1 · Primary user: All**

Ensures information actually reaches people rather than waiting to be discovered.

**Notification triggers**

| Event | Recipients |
|---|---|
| New assignment posted | Students of the target section |
| Assignment deadline approaching (48h / 12h) | Students who have not yet submitted |
| New notes uploaded | Students enrolled in that subject |
| New notice published | The notice's target audience |
| Attendance falls below 75% | The affected student |
| Class cancelled or rescheduled | Students of that section |
| Assignment graded | The submitting student |
| Event registration confirmed | The registering student |

**Delivery**

- **In-app** (Phase 1) — a notification bell with an unread count and a notification centre.
- **Email** (Phase 1) — for high-priority items such as urgent notices and deadline reminders.
- **Push** (Future) — requires the mobile application.

Users can control which categories they receive by email from their profile settings.

---

## 6.14 Search Functionality 🔍

**Phase 1 · Primary user: All**

A single search box that covers everything a user has access to.

**Key capabilities**

- Global search across notes, assignments, notices, events, and subjects.
- Results grouped by type with the most relevant category first.
- Filters for type, subject, and date range.
- Results respect permissions — a search never returns something the user is not allowed to open.
- Recent searches are retained for quick repetition.

---

## 6.15 User Profiles 👤

**Phase 1 · Primary user: All**

Each user's identity and settings within the system.

**Student profile:** name, roll number, branch, semester, section, email, phone, profile photo, and academic summary (attendance percentage, assignments submitted).

**Faculty profile:** name, employee ID, department, designation, subjects allotted, email, phone, and profile photo.

**Editable by the user:** profile photo, phone number, and notification preferences.

**Editable by admin only:** name, roll or employee number, branch, semester, section, and role. This prevents students from altering their own academic identity.

**Also included:** password change, and a simple activity log showing recent logins and downloads.

---

## 6.16 AI Study Assistant 🤖

**Future Enhancement · Primary user: Student**

Documented here because it is the natural next step for CampusOS once the material repository has real content in it, but explicitly **not part of this project's deliverable**.

**Envisioned capabilities**

- Answer questions using the notes already uploaded for a subject.
- Generate short summaries of long lecture PDFs.
- Produce practice questions from a selected unit.
- Suggest which units to revise based on previous years' question papers.

**Why it is deferred:** A useful AI assistant requires a populated document repository, text extraction and embedding infrastructure, vector storage, and either paid API access or local model hosting. Attempting it alongside the core platform in one semester would risk delivering neither well. Our database and file storage design does, however, keep this path open.

<div style="page-break-after: always;"></div>

# 7. Functional Requirements

Functional requirements are grouped by module and identified as **FR-XX**. Priority is marked as **High** (must be delivered), **Medium** (should be delivered), or **Low** (delivered if time permits).

## 7.1 Authentication and User Management

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | The system shall allow users to log in using a registered email address or roll number along with a password. | High |
| FR-02 | The system shall authenticate users and issue a secure session token valid for a defined duration. | High |
| FR-03 | The system shall redirect each user to their role-specific dashboard after successful login. | High |
| FR-04 | The system shall allow users to reset a forgotten password through a link sent to their registered email. | High |
| FR-05 | The system shall allow users to change their password after verifying the current password. | High |
| FR-06 | The system shall allow administrators to create, edit, deactivate, and delete student and faculty accounts. | High |
| FR-07 | The system shall allow administrators to create multiple user accounts at once by uploading a CSV file. | Medium |
| FR-08 | The system shall lock an account for 15 minutes after five consecutive failed login attempts. | Medium |
| FR-09 | The system shall log the user out automatically after 30 minutes of inactivity. | Medium |

## 7.2 Dashboards

| ID | Requirement | Priority |
|---|---|---|
| FR-10 | The system shall display a student dashboard containing today's timetable, pending assignments, recent notices, and attendance summary. | High |
| FR-11 | The system shall display a faculty dashboard containing assigned classes, today's schedule, and assignment submission counts. | High |
| FR-12 | The system shall display an admin dashboard containing user counts, recent activity, and management shortcuts. | High |
| FR-13 | The system shall highlight assignments due within 24 hours using a distinct visual indicator. | Medium |

## 7.3 Notice Board

| ID | Requirement | Priority |
|---|---|---|
| FR-14 | The system shall allow faculty and administrators to create notices with a title, description, category, and priority. | High |
| FR-15 | The system shall allow the notice creator to target the notice at all users, a department, a year, or a specific section. | High |
| FR-16 | The system shall display notices to users in reverse chronological order, with urgent notices pinned at the top. | High |
| FR-17 | The system shall allow a file attachment of up to 10 MB to be added to a notice. | Medium |
| FR-18 | The system shall allow the creator to edit or delete a notice they published. | Medium |
| FR-19 | The system shall record which users have viewed each notice and display the count to the creator. | Low |

## 7.4 Assignment Management

| ID | Requirement | Priority |
|---|---|---|
| FR-20 | The system shall allow faculty to create an assignment with title, description, subject, deadline, and maximum marks. | High |
| FR-21 | The system shall allow students to upload a submission file for an assignment before its deadline. | High |
| FR-22 | The system shall prevent submissions after the deadline unless late submission has been explicitly enabled for that assignment. | High |
| FR-23 | The system shall clearly mark submissions received after the deadline as late. | High |
| FR-24 | The system shall allow a student to replace their submission any number of times before the deadline. | Medium |
| FR-25 | The system shall allow faculty to view the list of submitted and non-submitted students for each assignment. | High |
| FR-26 | The system shall allow faculty to download individual submissions or all submissions as a single archive. | Medium |
| FR-27 | The system shall allow faculty to record marks and written feedback for a submission. | Medium |
| FR-28 | The system shall display assignment status to students as Pending, Submitted, Late, or Graded. | High |

## 7.5 Notes and Study Material

| ID | Requirement | Priority |
|---|---|---|
| FR-29 | The system shall allow faculty to upload study material tagged with subject, unit, and material type. | High |
| FR-30 | The system shall organise study material in a Semester → Subject → Unit hierarchy. | High |
| FR-31 | The system shall allow students to view and download material for subjects they are enrolled in. | High |
| FR-32 | The system shall allow in-browser preview of PDF material before download. | Medium |
| FR-33 | The system shall reject uploads larger than 25 MB or of an unsupported file type. | High |
| FR-34 | The system shall allow faculty to edit the details of, or delete, material they uploaded. | Medium |

## 7.6 Timetable and Attendance

| ID | Requirement | Priority |
|---|---|---|
| FR-35 | The system shall allow administrators to create and edit the weekly timetable for each section. | High |
| FR-36 | The system shall display each student their own section's timetable and each faculty member their own teaching schedule. | High |
| FR-37 | The system shall allow faculty to mark attendance as present or absent for each student in a class on a given date. | High |
| FR-38 | The system shall calculate and display subject-wise and overall attendance percentages for each student. | High |
| FR-39 | The system shall allow faculty to correct previously marked attendance within seven days of the class date. | Medium |
| FR-40 | The system shall notify a student when their attendance in any subject falls below 75%. | Medium |
| FR-41 | The system shall allow faculty to export attendance records for a subject as a CSV file. | Low |

## 7.7 Calendar, Events, and Clubs

| ID | Requirement | Priority |
|---|---|---|
| FR-42 | The system shall display an academic calendar containing holidays, examinations, and important dates. | High |
| FR-43 | The system shall automatically add a student's assignment deadlines and registered events to their calendar. | Medium |
| FR-44 | The system shall allow faculty and administrators to create events with date, venue, and description. | Medium |
| FR-45 | The system shall allow students to register for an event and enforce any participant limit set for it. | Medium |
| FR-46 | The system shall allow event organisers to view and export the list of registered participants. | Low |
| FR-47 | The system shall allow administrators to create clubs and assign coordinators. | Low |
| FR-48 | The system shall allow students to request to join a club and coordinators to approve or reject the request. | Low |

## 7.8 Notifications, Search, and Profiles

| ID | Requirement | Priority |
|---|---|---|
| FR-49 | The system shall generate an in-app notification when an assignment, notice, or study material relevant to the user is published. | High |
| FR-50 | The system shall display an unread notification count and a notification centre listing all notifications. | High |
| FR-51 | The system shall send email notifications for urgent notices and approaching assignment deadlines. | Medium |
| FR-52 | The system shall allow users to configure which categories of notification they receive by email. | Low |
| FR-53 | The system shall provide a global search across notes, assignments, notices, and events. | High |
| FR-54 | The system shall restrict search results to content the requesting user is authorised to access. | High |
| FR-55 | The system shall display a profile page containing the user's personal and academic details. | High |
| FR-56 | The system shall allow users to update their profile photo, phone number, and notification preferences. | Medium |
| FR-57 | The system shall restrict editing of academic identity fields such as roll number, branch, and semester to administrators only. | High |

**Total: 57 functional requirements** — 30 High, 20 Medium, 7 Low priority.

<div style="page-break-after: always;"></div>

# 8. Non-Functional Requirements

Non-functional requirements describe *how well* the system should work, rather than what it should do. Each is identified as **NFR-XX**.

## 8.1 Performance

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | Page load time for dashboard screens under normal conditions | ≤ 3 seconds |
| NFR-02 | API response time for standard read operations | ≤ 500 ms |
| NFR-03 | Search results returned for a typical query | ≤ 2 seconds |
| NFR-04 | Concurrent users supported without noticeable degradation | 200 |
| NFR-05 | File upload of a 10 MB document completed on a standard campus connection | ≤ 30 seconds |

## 8.2 Security

| ID | Requirement |
|---|---|
| NFR-06 | Passwords shall be stored using a strong one-way hashing algorithm (bcrypt) and never in plain text. |
| NFR-07 | All communication between client and server shall use HTTPS. |
| NFR-08 | Authentication shall use signed JWT tokens with a defined expiry period. |
| NFR-09 | Every API endpoint shall verify the user's role before performing a protected action. |
| NFR-10 | All user input shall be validated on both client and server to prevent SQL injection and cross-site scripting. |
| NFR-11 | Uploaded files shall be validated for type and size, and stored outside the web root with generated filenames. |
| NFR-12 | A user shall never be able to access another user's data by changing an identifier in a URL. |

## 8.3 Scalability

| ID | Requirement |
|---|---|
| NFR-13 | The system shall support at least 2,000 registered users without architectural changes. |
| NFR-14 | The database schema shall support multiple departments, branches, and academic years. |
| NFR-15 | The backend shall be stateless so that additional instances can be added behind a load balancer if required. |
| NFR-16 | File storage shall be abstracted so that local storage can be replaced with cloud storage without changing application logic. |

## 8.4 Availability

| ID | Requirement |
|---|---|
| NFR-17 | The system shall target 99% uptime during college working hours (8 AM – 8 PM). |
| NFR-18 | Planned maintenance shall be performed outside working hours and announced in advance. |
| NFR-19 | A database backup shall be taken at least once every 24 hours. |

## 8.5 Maintainability

| ID | Requirement |
|---|---|
| NFR-20 | The codebase shall follow a modular structure with clear separation between routes, business logic, and data access. |
| NFR-21 | The project shall follow a documented coding standard and consistent naming conventions. |
| NFR-22 | All API endpoints shall be documented, with interactive documentation generated automatically. |
| NFR-23 | The system shall log errors with enough context to identify the cause without exposing internal details to users. |
| NFR-24 | All source code shall be maintained in Git with meaningful commit messages and a defined branching strategy. |

## 8.6 Usability

| ID | Requirement |
|---|---|
| NFR-25 | A new user shall be able to complete core tasks without training or a manual. |
| NFR-26 | Any primary feature shall be reachable within three clicks from the dashboard. |
| NFR-27 | The interface shall be fully responsive on screens from 360 px to 1920 px in width. |
| NFR-28 | Error messages shall state clearly what went wrong and what the user should do next. |
| NFR-29 | Interactive elements shall have a minimum touch target of 44 × 44 pixels on mobile. |
| NFR-30 | Colour shall never be the only means of conveying information. |

## 8.7 Reliability

| ID | Requirement |
|---|---|
| NFR-31 | Submitted assignments and uploaded material shall never be lost due to an application error. |
| NFR-32 | Database operations spanning multiple tables shall be transactional, so a partial failure leaves no inconsistent data. |
| NFR-33 | A failed file upload shall report the failure clearly and leave no partial file in storage. |
| NFR-34 | Attendance records, once marked, shall be modifiable only within the defined correction window and only by authorised users. |

## 8.8 Compatibility

| ID | Requirement |
|---|---|
| NFR-35 | The application shall function correctly on the latest two versions of Chrome, Firefox, Edge, and Safari. |
| NFR-36 | The application shall be usable on Android and iOS mobile browsers. |
| NFR-37 | Downloadable files shall be provided in widely supported formats (PDF, DOCX, PPTX, CSV). |
| NFR-38 | The system shall degrade gracefully on slower connections rather than failing outright. |

<div style="page-break-after: always;"></div>

# 9. User Roles and Permissions

CampusOS uses **Role-Based Access Control (RBAC)**. Every user is assigned exactly one role, and every action is checked against that role on the server side.

## 9.1 Role Definitions

| Role | Description | Typical Count |
|---|---|---|
| **Student** | Enrolled student. Primarily consumes information relevant to their own semester and section. | ~1,800 |
| **Faculty** | Teaching staff. Publishes material and manages academics for allotted subjects only. | ~150 |
| **Administrator** | Department coordinator or designated staff. Full management access to the platform. | ~5 |
| **Club Coordinator** | A student with additional permissions limited to their own club. *(Phase 2)* | ~20 |

## 9.2 Permission Matrix

Legend: ✅ Full access · 🟡 Limited / own records only · ❌ No access

| Feature / Action | Student | Faculty | Admin |
|---|:---:|:---:|:---:|
| Log in and manage own profile | ✅ | ✅ | ✅ |
| View own dashboard | ✅ | ✅ | ✅ |
| View notices | ✅ | ✅ | ✅ |
| Create / edit notices | ❌ | 🟡 own classes | ✅ |
| Delete any notice | ❌ | 🟡 own only | ✅ |
| View study material | 🟡 own subjects | ✅ | ✅ |
| Upload study material | ❌ | 🟡 own subjects | ✅ |
| Delete study material | ❌ | 🟡 own uploads | ✅ |
| View assignments | 🟡 own subjects | 🟡 own subjects | ✅ |
| Create assignments | ❌ | 🟡 own subjects | ❌ |
| Submit assignment | ✅ | ❌ | ❌ |
| View all submissions | ❌ | 🟡 own assignments | ✅ |
| Grade submissions | ❌ | 🟡 own assignments | ❌ |
| View timetable | 🟡 own section | 🟡 own schedule | ✅ |
| Create / edit timetable | ❌ | ❌ | ✅ |
| Mark attendance | ❌ | 🟡 own classes | ✅ |
| View attendance | 🟡 own record | 🟡 own classes | ✅ |
| Export attendance | ❌ | 🟡 own classes | ✅ |
| View academic calendar | ✅ | ✅ | ✅ |
| Manage academic calendar | ❌ | ❌ | ✅ |
| View events | ✅ | ✅ | ✅ |
| Create events | ❌ | ✅ | ✅ |
| Register for events | ✅ | ❌ | ❌ |
| Join clubs | ✅ | ❌ | ❌ |
| Create / manage clubs | ❌ | ❌ | ✅ |
| Create / manage user accounts | ❌ | ❌ | ✅ |
| Manage subjects and allocations | ❌ | ❌ | ✅ |
| Search | 🟡 permitted content | 🟡 permitted content | ✅ |

## 9.3 Access Control Rules

1. **Server-side enforcement.** Hiding a button in the interface is not access control. Every protected endpoint independently verifies the caller's role and ownership.
2. **Ownership checks.** Faculty can modify only records they created or subjects allotted to them, verified against the database on each request.
3. **Scoped data.** A student's requests are automatically filtered to their own semester, branch, and section.
4. **Least privilege.** A new user receives the minimum permissions required for their role; elevation is possible only by an administrator.
5. **Immutable identity fields.** Roll number, branch, semester, section, and role cannot be modified by the user they belong to.

<div style="page-break-after: always;"></div>

# 10. User Flow

## 10.1 Primary Student Flow

The complete journey described in the project brief — from login to receiving a notification.

```
   ┌──────────────────┐
   │   1. LOGIN       │  Student enters roll number / email + password
   └────────┬─────────┘
            │  Server validates credentials, issues JWT, identifies role
            ▼
   ┌──────────────────┐
   │  2. DASHBOARD    │  Today's timetable · Pending assignments
   │                  │  Recent notices · Attendance summary
   └────────┬─────────┘
            │  Student notices "DBMS Assignment 2 — due in 2 days"
            ▼
   ┌──────────────────┐
   │  3. NOTES        │  Navigates: Notes → Semester 5 → DBMS → Unit 3
   │                  │  Previews the PDF, then downloads it
   └────────┬─────────┘
            │  Studies the material and prepares the assignment
            ▼
   ┌──────────────────┐
   │  4. SUBMIT       │  Assignments → DBMS Assignment 2 → Upload file
   │                  │  System validates type & size, checks deadline
   └────────┬─────────┘
            │  Status changes: Pending → Submitted
            ▼
   ┌──────────────────┐
   │  5. NOTIFICATIONS│  "Submission received" confirmation
   │                  │  Later: "Assignment graded — 18/20"
   └──────────────────┘
```

### Step-by-step description

**Step 1 — Login.**
The student opens CampusOS and enters their roll number or college email with their password. The server verifies the credentials against the hashed password, issues a JWT containing the user ID and role, and the frontend stores it securely. If credentials are wrong, a clear error is shown; after five failed attempts the account is temporarily locked.

**Step 2 — Dashboard.**
The student lands on their personalised dashboard. In a single screen they see the day's classes with the next one highlighted, assignments sorted by deadline with colour indicators, unread notices, and their attendance percentage with a warning if any subject is below 75%. A red indicator on "DBMS Assignment 2 — due in 2 days" catches their attention.

**Step 3 — Download notes.**
The student opens the Notes module. Material is organised as Semester 5 → DBMS → Unit 3. They preview the normalisation notes in the browser to confirm it is the right file, then download it. The system records the download in their activity log.

**Step 4 — Submit the assignment.**
After completing the work, the student opens the assignment, reads the description and deadline, and uploads their PDF. The system checks that the file type is allowed, the size is within 25 MB, and the deadline has not passed. On success, the status changes from Pending to Submitted, with the submission timestamp recorded.

**Step 5 — Receive notifications.**
An immediate in-app notification confirms the submission. Two days later, when the faculty member grades the work, another notification informs the student that marks and feedback are available. Both remain in the notification centre until dismissed.

## 10.2 Faculty Flow — Posting an Assignment

```
Login → Faculty Dashboard → Select Subject → Create Assignment
   → Enter title, description, deadline, max marks → Attach file (optional)
   → Select target section(s) → Publish
   → System notifies all targeted students
   → Faculty monitors submission count on dashboard
   → After deadline: download submissions → grade → release marks
   → System notifies students that grades are available
```

## 10.3 Faculty Flow — Marking Attendance

```
Login → Dashboard shows today's schedule → Click "Mark Attendance" on a class
   → Student list loads, all marked Present by default
   → Toggle the absentees → Submit
   → System saves records and recalculates percentages
   → Any student crossing below 75% is notified automatically
```

## 10.4 Admin Flow — Publishing a Campus Notice

```
Login → Admin Dashboard → Notices → Create Notice
   → Enter title, description, category, priority
   → Select audience (All / Department / Year / Section)
   → Attach document (optional) → Publish
   → System delivers in-app notifications; urgent notices also trigger email
   → Admin can later view the read count for the notice
```

<div style="page-break-after: always;"></div>

# 11. Technology Stack

Our stack was chosen on three criteria: our team already knows it or can learn it quickly, it has good documentation and community support, and it can be hosted for free or very cheaply.

## 11.1 Selected Stack

| Layer | Technology | Reason for Choosing |
|---|---|---|
| **Frontend** | React 18 (Vite) | Component-based, large ecosystem, and the framework our team is most comfortable with. Vite gives near-instant development builds. |
| **Styling** | Tailwind CSS | Rapid, consistent UI development without maintaining large custom stylesheets. Responsive design is straightforward. |
| **UI Components** | shadcn/ui | Accessible, well-designed components we can customise, saving significant UI time. |
| **State / Data** | TanStack Query (React Query) | Handles server state, caching, and loading states cleanly. Removes a lot of manual fetch code. |
| **Backend** | Python 3.11 + FastAPI | Fast to write, strong request validation through Pydantic, and automatic interactive API documentation via Swagger. |
| **ORM** | SQLAlchemy 2.0 | Mature, well-documented, and keeps database logic separate from route logic. |
| **Database** | PostgreSQL 15 | Reliable relational database with strong support for the relationships in our schema. Free tier hosting is widely available. |
| **Authentication** | JWT + bcrypt (via `python-jose` and `passlib`) | Stateless authentication that suits our API design, with industry-standard password hashing. |
| **File Storage** | Local filesystem (development) → Cloudinary or AWS S3 (production) | Abstracted behind a storage service class so switching requires no change to application logic. |
| **Email** | SMTP via SendGrid free tier | Sufficient volume for a college project without cost. |
| **Version Control** | Git + GitHub | Branch-based workflow with pull requests for code review within the team. |
| **API Testing** | Postman / Swagger UI | Swagger comes free with FastAPI; Postman for shared collections. |
| **Testing** | Pytest (backend), Vitest (frontend) | Standard testing tools for the respective stacks. |
| **Deployment** | Render or Railway (backend + database), Vercel (frontend) | Generous free tiers, Git-based automatic deployment, minimal configuration. |
| **Mobile (Optional)** | React Native or a Progressive Web App | A PWA is our preferred approach since it reuses the existing frontend. |

## 11.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                        │
│         React + Tailwind (Browser / Mobile Web)         │
└───────────────────────────┬─────────────────────────────┘
                            │  HTTPS / REST + JWT
┌───────────────────────────▼─────────────────────────────┐
│                   APPLICATION LAYER                     │
│                    FastAPI Backend                      │
│  ┌────────────┬────────────┬────────────┬────────────┐  │
│  │   Auth &   │  Business  │   File     │Notification│  │
│  │    RBAC    │   Logic    │  Handling  │  Service   │  │
│  └────────────┴────────────┴────────────┴────────────┘  │
└──────────────┬──────────────────────────┬───────────────┘
               │  SQLAlchemy ORM          │
┌──────────────▼──────────────┐ ┌─────────▼───────────────┐
│      PostgreSQL Database    │ │   File Storage (S3 /    │
│   Users · Academics · Files │ │   Cloudinary / Local)   │
└─────────────────────────────┘ └─────────────────────────┘
```

## 11.3 Alternatives Considered

| Decision | Alternative | Why We Chose Otherwise |
|---|---|---|
| FastAPI | Node.js + Express | Our team is stronger in Python, and FastAPI's automatic validation and documentation save meaningful development time. |
| PostgreSQL | MongoDB | Our data is highly relational (students ↔ subjects ↔ attendance ↔ assignments). A relational database is the natural fit. |
| JWT | Server-side sessions | JWT keeps the backend stateless, which simplifies deployment on free-tier hosting. |
| React | Plain HTML + JavaScript | Component reuse across dashboards would be painful to maintain without a framework. |

<div style="page-break-after: always;"></div>

# 12. Database Overview

This section lists the major entities and their relationships. Full schemas, data types, and constraints will be documented separately in the Database Design Document.

## 12.1 Major Entities

| # | Entity | Purpose | Key Attributes |
|---|---|---|---|
| E01 | **User** | Base record for every person in the system | user_id, email, password_hash, role, is_active, created_at |
| E02 | **Student** | Student-specific academic details | student_id, user_id, roll_number, branch, semester, section, admission_year |
| E03 | **Faculty** | Faculty-specific details | faculty_id, user_id, employee_id, department, designation |
| E04 | **Department** | Academic departments | dept_id, dept_name, dept_code, hod_faculty_id |
| E05 | **Subject** | Subjects offered per semester | subject_id, subject_code, subject_name, semester, credits, dept_id |
| E06 | **FacultySubject** | Which faculty teaches which subject to which section | id, faculty_id, subject_id, section, academic_year |
| E07 | **Enrollment** | Which student is enrolled in which subject | id, student_id, subject_id, academic_year |
| E08 | **Timetable** | Weekly class schedule | timetable_id, subject_id, faculty_id, section, day_of_week, period, room, start_time, end_time |
| E09 | **Attendance** | Per-class attendance records | attendance_id, student_id, subject_id, date, status, marked_by, marked_at |
| E10 | **Assignment** | Assignments created by faculty | assignment_id, subject_id, faculty_id, title, description, deadline, max_marks, allow_late, attachment_url |
| E11 | **Submission** | Student submissions against assignments | submission_id, assignment_id, student_id, file_url, submitted_at, is_late, marks, feedback |
| E12 | **Notes** | Study material | note_id, subject_id, uploaded_by, title, unit_number, material_type, file_url, uploaded_at |
| E13 | **Notice** | Notices and announcements | notice_id, created_by, title, content, category, priority, target_audience, attachment_url, created_at |
| E14 | **NoticeRead** | Tracks which user read which notice | id, notice_id, user_id, read_at |
| E15 | **Event** | Campus events | event_id, title, description, venue, event_date, organiser_id, max_participants, poster_url |
| E16 | **EventRegistration** | Student registrations for events | id, event_id, student_id, registered_at |
| E17 | **Club** | Student clubs | club_id, club_name, description, coordinator_id, logo_url |
| E18 | **ClubMember** | Club membership | id, club_id, student_id, status, joined_at |
| E19 | **AcademicCalendar** | Holidays, exams, important dates | calendar_id, title, description, entry_type, start_date, end_date |
| E20 | **Notification** | In-app notifications | notification_id, user_id, title, message, type, is_read, reference_id, created_at |

## 12.2 Key Relationships

| Relationship | Type | Description |
|---|---|---|
| User → Student / Faculty | 1 : 1 | Each user record maps to exactly one student or faculty profile. |
| Department → Subject | 1 : N | A department offers many subjects. |
| Faculty ↔ Subject | M : N | Resolved through **FacultySubject**; a faculty member may teach several subjects and a subject may have several faculty across sections. |
| Student ↔ Subject | M : N | Resolved through **Enrollment**. |
| Subject → Assignment | 1 : N | A subject has many assignments. |
| Assignment → Submission | 1 : N | An assignment collects many submissions, at most one active per student. |
| Student → Attendance | 1 : N | A student accumulates many attendance records. |
| Subject → Notes | 1 : N | A subject holds many study materials. |
| Event ↔ Student | M : N | Resolved through **EventRegistration**. |
| Club ↔ Student | M : N | Resolved through **ClubMember**. |
| User → Notification | 1 : N | A user receives many notifications. |

## 12.3 Design Notes

- **Separate User table.** Keeping authentication data in `User` and academic data in `Student` / `Faculty` avoids duplicating login fields and makes adding a new role straightforward.
- **Soft deletes.** Records are deactivated rather than deleted, so historical attendance and submissions remain intact when a student graduates.
- **File references only.** The database stores file URLs and metadata, never file binaries. This keeps the database small and fast.
- **Academic year on join tables.** Including `academic_year` on `Enrollment` and `FacultySubject` allows the same subject to be re-offered every year without losing historical records — this is what makes the Semester Resource Library possible.
- **Indexes.** Planned on frequently filtered columns: `roll_number`, `subject_id`, `student_id + date` on attendance, and `deadline` on assignments.

<div style="page-break-after: always;"></div>

# 13. UI Modules

Each screen is described briefly, along with its main components. Detailed wireframes appear in the UI/UX Design Document.

| # | Screen | User | Description |
|---|---|---|---|
| U01 | **Login** | All | Clean single-card layout with the college logo, roll number/email field, password field with a show/hide toggle, and a "Forgot Password" link. Errors appear inline below the relevant field. |
| U02 | **Forgot / Reset Password** | All | Email entry followed by a token-based reset form with password strength feedback. |
| U03 | **Student Dashboard** | Student | Card-based grid: Today's Timetable, Pending Assignments, Recent Notices, Attendance Summary. Stacks into a single column on mobile. |
| U04 | **Faculty Dashboard** | Faculty | My Classes list, today's schedule with inline "Mark Attendance" buttons, submission counts, and quick action buttons. |
| U05 | **Admin Dashboard** | Admin | Summary statistic cards, recent activity feed, and a management sidebar for users, subjects, timetable, and calendar. |
| U06 | **Notice Board** | All | Vertical list of notice cards with category tags and priority colours. Urgent notices pinned on top. Filters for category and date. |
| U07 | **Notice Detail** | All | Full notice content, publisher, timestamp, attachment download, and read count for the creator. |
| U08 | **Create Notice** | Faculty, Admin | Form with title, rich-text description, category and priority dropdowns, audience selector, and file upload. |
| U09 | **Assignment List** | Student | Tabs for Pending, Submitted, and Graded. Each card shows subject, title, deadline, and a colour-coded remaining-time indicator. |
| U10 | **Assignment Detail (Student)** | Student | Full description, attachment, deadline countdown, upload area with drag-and-drop, and current submission status. |
| U11 | **Assignment Manager (Faculty)** | Faculty | Table of assignments with submission counts, plus a detail view listing submitted and pending students with download and grading controls. |
| U12 | **Create Assignment** | Faculty | Form with title, description, subject, section, deadline picker, maximum marks, late-submission toggle, and attachment. |
| U13 | **Notes Repository** | Student, Faculty | Breadcrumb navigation across Semester → Subject → Unit, with a file grid showing type icon, title, uploader, date, and download button. |
| U14 | **Upload Notes** | Faculty | Drag-and-drop upload area with fields for subject, unit, material type, title, and description. Shows an upload progress bar. |
| U15 | **Timetable** | All | Weekly grid on desktop with subject, faculty, and room in each cell. Switches to a vertical day list on mobile. Cancelled classes shown struck through. |
| U16 | **Mark Attendance** | Faculty | Class header with date, student list with Present/Absent toggles, "Mark all present" shortcut, and a live absent counter before submitting. |
| U17 | **Attendance View** | Student | Overall percentage as a progress ring, subject-wise bars colour-coded against the 75% threshold, and an expandable date-wise record. |
| U18 | **Academic Calendar** | All | Month grid with colour-coded entries, a side panel listing the selected day's items, and type filters. |
| U19 | **Events** | All | Card grid with poster, title, date, venue, and a Register button showing remaining slots. Separate tabs for upcoming and past events. |
| U20 | **Event Detail** | All | Full description, organiser, venue, schedule, registration button, and participant count. |
| U21 | **Clubs Directory** | Student | Grid of club cards with logo, name, short description, member count, and a Join button. |
| U22 | **Club Page** | Student | Club description, coordinator details, member list, club announcements, and upcoming club events. |
| U23 | **Search Results** | All | Single search bar with results grouped by content type, each group showing the top matches with a "view all" link. Filters in a sidebar. |
| U24 | **Notification Centre** | All | Chronological list with unread items highlighted, grouped by day, with "mark all as read" and per-item navigation to the source. |
| U25 | **Profile** | All | Profile photo, personal details, academic details, notification preferences, and a change-password section. |
| U26 | **User Management** | Admin | Searchable, paginated user table with role filters, inline edit and deactivate actions, and CSV bulk-upload. |
| U27 | **Subject Management** | Admin | Subject list per semester and branch, with faculty allocation controls. |
| U28 | **404 / Error** | All | Friendly error page with a clear message and a link back to the dashboard. |

## 13.1 Common UI Conventions

- **Layout.** Persistent top navigation bar with logo, global search, notification bell, and profile menu. A collapsible sidebar holds primary navigation on desktop and becomes a bottom bar on mobile.
- **Loading states.** Skeleton placeholders rather than spinners, so the layout does not shift when content arrives.
- **Empty states.** Every list has a designed empty state that explains what will appear there and, where relevant, what to do next.
- **Confirmation.** Destructive actions such as deleting a notice or assignment always require confirmation.
- **Feedback.** Successful actions show a brief toast message; failures show an inline error explaining the next step.

<div style="page-break-after: always;"></div>

# 14. Assumptions

These are the conditions we have assumed to be true while planning this project. If any of them turn out to be false, scope or timelines will need revisiting.

| # | Assumption |
|---|---|
| A01 | Every student and faculty member has a smartphone or laptop with internet access. |
| A02 | The college can provide, or we can generate, a list of students and faculty for initial account creation. |
| A03 | Users have basic familiarity with web applications and require no formal training. |
| A04 | Account creation is handled by administrators. Users do not self-register, which prevents unauthorised access. |
| A05 | The college follows a standard semester system with a fixed weekly timetable. |
| A06 | The minimum attendance requirement is 75%, configurable if the college rule differs. |
| A07 | Study material shared through the platform is legitimately shareable and does not violate copyright. |
| A08 | Free-tier hosting is sufficient for demonstration and a limited pilot. |
| A09 | Faculty are willing to mark attendance and upload material digitally. |
| A10 | Internet connectivity on campus is stable enough for regular use. |
| A11 | Individual file uploads will not exceed 25 MB. |
| A12 | The system is used for a single institution; multi-college support is out of scope. |
| A13 | Examination results and fee management remain in the existing college systems. |
| A14 | Our team has approximately one semester (14–16 weeks) of part-time development effort available. |

<div style="page-break-after: always;"></div>

# 15. Constraints

## 15.1 Project Constraints

| # | Constraint | Impact on the Project |
|---|---|---|
| C01 | **Limited development time** — roughly 14–16 weeks, alongside regular coursework, labs, and examinations. | Feature scope must be strictly prioritised. Phase 2 features are conditional on progress. |
| C02 | **Small team** — 3 to 4 student developers, none working full time. | Parallel work must be organised carefully to avoid blocking each other. |
| C03 | **Limited budget** — no funding for paid hosting, domains, or third-party APIs. | Only free-tier services can be used, which caps storage, bandwidth, and uptime guarantees. |
| C04 | **Learning curve** — team members are learning parts of the stack while building. | Early velocity will be slower than later velocity. Schedule accounts for this. |
| C05 | **No access to official college data** — student and faculty records cannot be obtained from the college ERP. | The system will be demonstrated with realistic sample data. |
| C06 | **No integration with existing college software** — the ERP has no public API. | CampusOS operates as a standalone system in this version. |
| C07 | **Academic priorities** — examinations and other coursework will interrupt development. | Buffer weeks are built into the project plan around examination periods. |
| C08 | **Free-tier hosting limitations** — services may sleep when idle and offer limited storage. | Acceptable for demonstration; production deployment would require paid hosting. |

## 15.2 Technical Constraints

| # | Constraint |
|---|---|
| C09 | Maximum file upload size limited to 25 MB by hosting and storage tiers. |
| C10 | Free-tier database storage limited to approximately 1 GB. |
| C11 | Email sending limited to roughly 100 messages per day on the free tier. |
| C12 | Push notifications are not available without a native mobile application. |
| C13 | The application requires an active internet connection; no offline mode is provided. |

## 15.3 Scope Boundaries

To keep the project achievable, the following are explicitly **excluded**:

- Examination and result management
- Fee payment and financial modules
- Library book issue and return management
- Hostel and transport management
- Video conferencing or live class delivery
- Integration with the existing college ERP
- Native Android or iOS applications
- Multi-college or multi-tenant support

<div style="page-break-after: always;"></div>

# 16. Future Enhancements

These features are outside the current scope but are natural extensions of CampusOS. They are listed here to show the direction the platform could take and are ordered roughly by how practical each would be to add next.

| # | Enhancement | Description | Effort |
|---|---|---|---|
| FE-01 | **QR Code Attendance** | Faculty displays a rotating QR code at the start of class; students scan it to mark themselves present. Includes time-window and location checks to prevent proxy attendance. | Medium |
| FE-02 | **AI Chatbot Assistant** | A conversational assistant that answers questions such as "when is my next DBMS class?" or "how many assignments are pending?" by querying the student's own data. | Medium |
| FE-03 | **AI Note Summariser** | Generates concise summaries and key-point lists from uploaded lecture PDFs, helping students revise long material quickly. | High |
| FE-04 | **Smart Timetable Generator** | Automatically generates conflict-free timetables from subjects, faculty availability, and room constraints. A genuinely interesting constraint-satisfaction problem. | High |
| FE-05 | **Native Mobile Application** | React Native applications for Android and iOS with true push notifications and offline access to downloaded notes. | High |
| FE-06 | **Resume Builder** | Generates a formatted resume from the student's profile, achievements, projects, and event participation already stored in CampusOS. | Low |
| FE-07 | **Placement Portal** | Company listings, eligibility filtering based on academic records, application tracking, and interview scheduling. | High |
| FE-08 | **Internship Tracker** | Students log internships with company, duration, and certificates; faculty verify and track them for records. | Low |
| FE-09 | **Campus Marketplace** | A moderated space for students to buy, sell, or exchange books, calculators, lab coats, and equipment within the college. | Medium |
| FE-10 | **Hostel Management** | Room allocation, leave requests, complaint registration, and mess menu information. | High |
| FE-11 | **Fee Payment Integration** | Online fee payment through a payment gateway with receipt generation and payment history. | High |
| FE-12 | **Discussion Forums** | Subject-wise question and answer boards where students help each other, moderated by faculty. | Medium |
| FE-13 | **Analytics for Faculty** | Visual insight into class performance, submission trends, and attendance patterns to identify students who need support early. | Medium |
| FE-14 | **Multi-Language Support** | Interface available in regional languages alongside English. | Low |
| FE-15 | **Alumni Network** | Graduated students retain limited access to mentor juniors and share placement experience. | Medium |

## 16.1 Suggested Order of Development

Were the project to continue beyond this semester, we would prioritise as follows:

1. **QR Attendance** — highest practical value per unit of effort, and it removes the single most tedious remaining manual step.
2. **AI Chatbot** — high perceived value, and the data it needs already exists in the database.
3. **Native Mobile App** — students are mobile-first; real push notifications would meaningfully improve reach.
4. **Discussion Forums** — turns CampusOS from a distribution tool into a place students actively participate in.
5. **Placement Portal** — very high value to final-year students, but a large module in its own right.

<div style="page-break-after: always;"></div>

# 17. Risks

Every project has risks. Identifying them early is more useful than discovering them in the final week.

## 17.1 Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|:---:|:---:|---|
| R01 | **Scope creep** — adding features beyond the plan and finishing none properly. | High | High | Features are split into Phase 1 / Phase 2 / Future in this document. Nothing outside Phase 1 begins until Phase 1 is complete and tested. |
| R02 | **Time shortage** — examinations and coursework reduce available development time. | High | High | Buffer weeks scheduled around examination periods. Weekly checkpoints to detect slippage early. |
| R03 | **Learning curve on the stack** — slower initial progress than estimated. | Medium | Medium | Two weeks allocated at the start for tutorials and a small practice module before feature work begins. |
| R04 | **Team coordination issues** — merge conflicts, duplicated work, uneven contribution. | Medium | Medium | Clear module ownership per member, a documented Git branching strategy, pull request reviews, and short weekly sync meetings. |
| R05 | **Data loss during development** — losing code or the database. | Low | High | All code pushed to GitHub daily. Automated daily database backups. No work kept only on a local machine. |
| R06 | **Free-tier hosting limitations** — services sleeping, storage or bandwidth limits during the demonstration. | Medium | Medium | Keep the deployed instance warm before the demonstration. Maintain a local fallback deployment. Compress uploaded files. |
| R07 | **Low user adoption in a pilot** — faculty or students do not use the system. | Medium | Medium | Involve two faculty members early for feedback. Keep faculty workflows short. Pilot with a single section first. |
| R08 | **Security vulnerability** — an exposed endpoint or a broken access check. | Medium | High | Server-side role checks on every endpoint, input validation, a security review checklist before final submission, and no real personal data in the demonstration. |
| R09 | **File storage exhaustion** — uploads exceed the free-tier limit. | Medium | Low | Enforce a 25 MB per-file limit, restrict file types, and periodically clean up test uploads. |
| R10 | **Requirement changes from the guide** — the faculty guide requests significant additions mid-project. | Medium | Medium | Review this PRD with the guide before development starts and obtain written sign-off on scope. |
| R11 | **A team member becomes unavailable** — illness or other commitments. | Low | High | Avoid single points of knowledge: document each module, ensure at least two members understand every part, and keep code readable. |
| R12 | **Integration problems between frontend and backend** — mismatched API contracts. | Medium | Medium | Define and freeze the API contract early using Swagger documentation. Use mock responses so frontend work is never blocked. |

## 17.2 Risk Summary

| Risk Level | Count | Risk IDs |
|---|---|---|
| High priority (needs active management) | 4 | R01, R02, R05, R08 |
| Medium priority (monitor regularly) | 7 | R03, R04, R06, R07, R10, R11, R12 |
| Low priority (accept and review) | 1 | R09 |

<div style="page-break-after: always;"></div>

# 18. Success Criteria

The project will be considered successful if it meets the following criteria. We have deliberately kept them measurable so that success is a matter of verification rather than opinion.

## 18.1 Functional Success Criteria

| ID | Criterion | Measure |
|---|---|---|
| SC-01 | All Phase 1 features are implemented and working | 12 of 12 Phase 1 features functional |
| SC-02 | All High-priority functional requirements are met | 30 of 30 High-priority FRs verified |
| SC-03 | All three user roles have working dashboards with correct access control | Student, Faculty, and Admin verified independently |
| SC-04 | The complete primary user flow works end to end | Login → dashboard → download notes → submit assignment → receive notification |
| SC-05 | The application is deployed and publicly accessible | A live URL that works from outside the campus network |

## 18.2 Technical Success Criteria

| ID | Criterion | Measure |
|---|---|---|
| SC-06 | Dashboard pages load within the performance target | ≤ 3 seconds on a standard connection |
| SC-07 | The interface is usable on mobile devices | Verified on screens from 360 px upward |
| SC-08 | No user can access data belonging to another user | Access control tested by attempting unauthorised requests |
| SC-09 | Backend test coverage on core modules | ≥ 60% coverage on authentication, assignments, and attendance |
| SC-10 | No critical or high-severity bugs remain at submission | Bug tracker shows zero open critical or high issues |
| SC-11 | API documentation is complete and accurate | Every endpoint documented in Swagger |

## 18.3 Usability Success Criteria

| ID | Criterion | Measure |
|---|---|---|
| SC-12 | A new user can complete core tasks without help | 8 out of 10 test users succeed without guidance |
| SC-13 | Faculty can mark attendance for a class quickly | Under 2 minutes for a class of 60 students |
| SC-14 | A student can locate specific notes quickly | Under 30 seconds from login |
| SC-15 | Positive feedback from a pilot group | Average rating of 4 or above out of 5 from at least 20 test users |

## 18.4 Academic Success Criteria

| ID | Criterion | Measure |
|---|---|---|
| SC-16 | Complete project documentation delivered | PRD, SRS, architecture, database design, and test reports |
| SC-17 | The project is demonstrated successfully to the evaluation panel | Live demonstration completed without a blocking failure |
| SC-18 | The codebase is well organised and documented | Clean structure, README, setup instructions, and meaningful commit history |
| SC-19 | Every team member can explain the full system | Each member able to answer questions on any module during viva |

## 18.5 Minimum Viable Outcome

If time runs short, the following represents the smallest set that still constitutes a successful project:

> Working authentication with three roles · Student and faculty dashboards · Notes upload and download · Assignment creation and submission · Digital notice board · In-app notifications · Deployed and publicly accessible.

Everything beyond this is an improvement on an already successful outcome.

<div style="page-break-after: always;"></div>

# 19. Conclusion

CampusOS began with an observation that every student in our college recognises immediately: the information we need every day exists, but it is scattered across so many places that finding it is harder than it should be. Notes are in a chat group somewhere. Deadlines were announced in a class we may have missed. Attendance is known only to the person holding the register.

None of these are difficult problems technically. They persist because no one has put them in one place.

That is exactly what CampusOS does. It is not an ambitious attempt to reinvent how colleges work — it is a careful attempt to take the things colleges already do and give them a reliable digital home. A student opens one application and knows what is due, what was announced, where their attendance stands, and where to find the material they need. A faculty member uploads once and reaches everyone. An administrator publishes a notice that actually arrives.

This document has defined the problem, the users, 57 functional requirements, 38 non-functional requirements, the technology we will use, the data we will store, and the screens we will build. It has also been honest about what we are *not* building: examinations, fees, hostel management, and AI features that would be interesting but unrealistic within one semester. We consider that honesty a feature of this document rather than a limitation of the project — a clearly bounded system that works completely is worth considerably more than an ambitious one that works partially.

Our aim is to finish this semester with a system that is genuinely deployed, genuinely usable, and genuinely useful to at least one section of students who choose to keep using it after the evaluation is over. That last point is our real measure of success. A project that gets a good grade and is then never opened again has solved a submission requirement. A project that students keep using has solved an actual problem.

CampusOS is our attempt at the second one.

<div style="page-break-after: always;"></div>

# 20. Glossary

| Term | Meaning |
|---|---|
| **API** | Application Programming Interface — the set of endpoints through which the frontend communicates with the backend. |
| **bcrypt** | A password hashing algorithm designed to be slow, making brute-force attacks impractical. |
| **CRUD** | Create, Read, Update, Delete — the four basic operations performed on stored data. |
| **CSV** | Comma-Separated Values — a plain text format used here for bulk user upload and attendance export. |
| **FR** | Functional Requirement — a statement of something the system must do. |
| **JWT** | JSON Web Token — a signed token used to prove a user's identity on each request without storing sessions on the server. |
| **NFR** | Non-Functional Requirement — a statement of how well the system must perform a function. |
| **ORM** | Object Relational Mapper — a library that lets application code work with database rows as objects. |
| **PRD** | Product Requirements Document — this document. |
| **PWA** | Progressive Web App — a website that can be installed and behaves like a mobile application. |
| **RBAC** | Role-Based Access Control — restricting actions based on the user's assigned role. |
| **REST** | Representational State Transfer — the architectural style used for our API design. |
| **Responsive Design** | Interface design that adapts to different screen sizes. |
| **SRS** | Software Requirements Specification — the formal requirements document that will follow this PRD. |
| **Swagger** | Interactive API documentation generated automatically by FastAPI. |

---

<div align="center">

### End of Document

**CampusOS — Product Requirements Document · Version 1.0**

*Prepared by Spark Squad · MCKVIE · 1 August 2026*

---

| Prepared By           | Reviewed By        | Approved By        |
|-----------------------|--------------------|--------------------|
| *Sayan Garai*         | *Pending*          | *Pending*          |
| Date: 1st August 2026 | Date: ____________ | Date: ____________ |

</div>
