<div align="center">

# CampusOS

### Market and Technical Research Report

**College ERP · Campus Management · SIS · LMS Ecosystem Study**

---

| | |
|---|---|
| **Project Name** | CampusOS |
| **Document Type** | Market and Technical Research Report |
| **Version** | 1.0 |
| **Team Name** | Spark Squad |
| **Date** | 3 August 2026 |
| **Status** | Research Complete |
| **Purpose** | Understand existing products, gaps, and technical direction before building CampusOS |

---

</div>

> **How to read this report**
>
> - **Verified fact** means the claim comes from an official website, product documentation, GitHub repository, or a published survey.
> - **Reported opinion** means the claim comes from user reviews, forums, or secondary articles. Treat these as signals, not absolute truth.
> - Pricing figures change often. Where vendors do not publish prices, that is stated clearly.

<div style="page-break-after: always;"></div>

## Document Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 3 August 2026 | CampusOS Team | First complete research report |

## Table of Contents

| Section | Title |
|---|---|
| 1 | Overview |
| 2 | Existing Products |
| 3 | Feature Comparison |
| 4 | Common Problems |
| 5 | Current Industry Trends (2026) |
| 6 | Feature Gap Analysis |
| 7 | Best UI/UX Practices |
| 8 | Technical Architecture |
| 9 | Security Features |
| 10 | Recommendations for CampusOS |
| 11 | References |

<div style="page-break-after: always;"></div>

# 1. Overview

## 1.1 What Is a College ERP?

A **College ERP** (Enterprise Resource Planning system for education) is software that connects many administrative and academic operations of a college into one platform.

In a company, ERP usually covers finance, HR, and inventory. In a college, the same idea is applied to:

- Student admissions and records
- Fees and accounts
- Attendance and timetable
- Examinations and results
- Faculty and payroll (in larger systems)
- Hostel, transport, and library (in full campus suites)

**Verified fact:** Buyer guides in 2026 describe university ERP as the system that connects student records with finance, exams, faculty workflows, and reporting across the institution. ([UniCloud360 University ERP Guide, 2026](https://unicloud360.com/blog/university-erp-systems-guide/))

## 1.2 What Is a Campus Management System?

A **Campus Management System** (also called Campus Management Software) focuses on day-to-day campus activities such as:

- Scheduling and attendance
- Notices and communication
- Facility and event coordination
- Student and faculty portals

**Important distinction (verified):** Campus management software may cover many workflows, but it does not always act as the official “system of record” for student data. An SIS or ERP usually owns that role. ([UniCloud360, 2026](https://unicloud360.com/blog/university-erp-systems-guide/))

CampusOS sits closer to a **student-facing campus management platform** with selected SIS-like academic features, not a full finance/HR ERP.

## 1.3 Difference Between ERP, SIS, and LMS

These three terms are often mixed up. They are related, but they solve different problems.

| System | Full Form | Main Job | Typical Users | Example Data |
|---|---|---|---|---|
| **LMS** | Learning Management System | Deliver teaching and learning | Faculty, students | Course content, assignments, quizzes, discussion forums |
| **SIS** | Student Information System | Keep official student records | Registrars, admins, advisers | Enrolment, transcripts, grades as official record, attendance history |
| **ERP** | Enterprise Resource Planning | Run institution-wide operations | Finance, HR, leadership, admins | Fees, payroll, procurement, plus often SIS modules |

A useful analogy used in industry guides:

> **LMS = classroom · SIS = filing cabinet · ERP = back-office engine**
> ([VigiLearn LMS vs SIS vs ERP Guide](https://vigilearn.com/lms-vs-sis-vs-erp/))

### Grades: a common source of confusion

- An LMS records grades as part of teaching (assignment scores, quiz scores).
- An SIS stores grades as the **official academic record** (transcripts, promotion).
- They should ideally sync, but they are not the same system.

**Verified fact:** Multiple education technology guides in 2025–2026 state that an LMS is not a substitute for an SIS, and an SIS alone does not replace an LMS. Most institutions use both, either as separate products or as modules inside a larger platform. ([openSIS blog](https://opensis.com/blog/sis-vs-lms-understanding-the-difference-between-student-data-and-learning-platforms), [Classter, 2026](https://www.classter.com/blog/edtech/sis-vs-lms-vs-sms-in-2026-what-schools-actually-need-today/))

## 1.4 Why Institutions Use These Systems

Colleges adopt ERP / SIS / LMS platforms to:

1. **Reduce paperwork** — admissions, fees, attendance, and results become digital.
2. **Keep one source of truth** — student data is not scattered across Excel sheets and WhatsApp groups.
3. **Improve communication** — notices and reminders reach the right people.
4. **Support compliance and reporting** — accreditation bodies and government reports need clean data.
5. **Give students self-service** — check timetable, fees, attendance, and grades without visiting an office.
6. **Help faculty reduce admin load** — mark attendance once, upload materials once, collect submissions in one place.

**CampusOS angle:** Many Indian college students still live in a fragmented world of WhatsApp groups, physical notice boards, and incomplete portals. CampusOS targets that daily-life gap first, rather than trying to replace a full finance ERP on day one.

<div style="page-break-after: always;"></div>

# 2. Existing Products

This section covers major commercial and open-source products. For each product, facts are separated from opinions.

---

## 2.1 Commercial Products

### 2.1.1 ERPNext Education / Frappe Education

| Field | Detail |
|---|---|
| **Type** | Open-source Education Management System (also sold via cloud hosting) |
| **Official site** | https://frappe.io/erpnext/for-education |
| **GitHub** | https://github.com/frappe/education |
| **License** | GNU GPL v3 (open source) |

**Overview (verified):** Frappe Education is an open-source education management system built on the ERPNext / Frappe ecosystem. It covers admissions, student and teacher profiles, fee structures, course scheduling, attendance, assessments, and a student portal.

**Target users:** Schools, colleges, and private educational institutes that want an affordable, customisable platform.

**Major features (verified from GitHub and Frappe docs):**
- Student and teacher management
- Admission workflows
- Fee structure and payments
- Course scheduling and exam planning
- Attendance tracking
- Assessment planning and results
- Student portal (timetable, attendance, fees, grades)
- Reports (attendance, fees, assessments)

**Technology stack (verified):**
- Backend: Python (Frappe Framework)
- Frontend: JavaScript / Vue.js (Frappe UI)
- Database: MariaDB / MySQL
- Hosting: Self-host or Frappe Cloud

**Pricing:**
- Software itself: free (open source)
- Frappe Cloud hosting: paid (vendor quotes; commonly described as site-based cloud pricing rather than per-student licensing)

**Advantages:**
- Full source code access
- Strong customisation through DocTypes and workflows
- API-first design
- Active open-source community

**Disadvantages / limitations:**
- Setup and customisation require technical skill
- UI is functional but not always “consumer-app polished”
- Education features are strong for admin workflows; deep LMS features may still need a separate tool

**UI reference:** Screenshots are published on the [frappe/education GitHub README](https://github.com/frappe/education).

---

### 2.1.2 Fedena

| Field | Detail |
|---|---|
| **Type** | School / college management ERP |
| **Vendor** | Foradian Technologies |
| **Official site** | https://fedena.com/ |
| **Core open-source note** | Historical core modules were released open source (Apache 2.0); commercial Fedena Pro / cloud plans are the main product today |

**Overview (verified):** Fedena is a web-based school and college ERP covering admissions, fees, exams, attendance, HR, hostel, transport, library, and related modules. Foradian markets it as an all-in-one institute operations platform with many plugins.

**Target users:** K-12 schools, colleges, universities, and training institutes.

**Major features:**
- Admissions and student information
- Attendance and timetable
- Examination and gradebook
- Fee collection and payment gateway integration
- Hostel, transport, library
- Placement and alumni (higher plans)
- Mobile app (paid plans)
- LMS / online learning add-ons (higher plans)

**Technology stack (verified from vendor materials):** Ruby on Rails.

**Pricing (reported by third-party directories; verify with vendor):**
- Web plans often listed around **USD 999–1699 / year**
- Web + mobile often listed around **USD 1599–2299 / year**
- Enterprise: custom quote

**Advantages:**
- Broad module coverage
- Relatively affordable compared with Western university ERPs
- Plugin-based expansion
- Multi-language support claimed by vendor

**Disadvantages (reported opinion):**
- Feature depth varies by plan and plugin
- Some institutions report that “all-in-one” suites become cluttered
- Exact current pricing requires sales contact

---

### 2.1.3 Academia ERP (Serosoft)

| Field | Detail |
|---|---|
| **Type** | Education ERP / SIS (India-focused, also international) |
| **Vendor** | Serosoft |
| **Official site** | https://www.academiaerp.com/ |

**Overview (verified):** Academia by Serosoft is a cloud-native education ERP / SIS with portals for students, faculty, and admins. Module lists for higher education include admissions, timetable, attendance, fees, assignments, exams, hostel, transport, placement, alumni, events, and analytics.

**Target users:** Universities, colleges, training organisations, and multi-campus education groups.

**Major features (verified from Academia Higher Ed plans page):**
- Student Information System
- Timetable and attendance
- Fees and examinations
- Assignment management
- Student / faculty / applicant portals
- Mobile apps (higher plans)
- Placement, hostel, transport, alumni, events
- Analytics and Outcome-Based Education modules (higher plans)

**Technology stack:** Not fully disclosed in public docs. Marketed as cloud-native SaaS / licensed deployment.

**Pricing:**
- Not publicly fixed on the website
- SaaS model: annual per-user subscription (details via sales)
- One public commercial proposal example (IMI Noida, May 2025, secondary source) listed multi-year licence figures in lakhs INR for ~1500 students — treat as **illustrative only**, not a standard price list

**Advantages:**
- Strong coverage for Indian higher-education workflows
- Many modules in one suite
- Dedicated portals and mobile apps

**Disadvantages:**
- Pricing opacity
- Implementation and change management still required
- Overlaps many modules CampusOS does **not** need for V1 (fees, hostel, payroll)

---

### 2.1.4 Ellucian Banner / Ellucian Student

| Field | Detail |
|---|---|
| **Type** | Enterprise higher-education ERP / SIS |
| **Official site** | https://www.ellucian.com/ |
| **Scale (vendor claim)** | ~3,000 customers, 50 countries, 21M+ students |

**Overview (verified):** Ellucian provides Banner and related Student / HCM / Finance products for higher education. It covers the student lifecycle (admissions, records, financial aid, billing) plus institutional finance and HR in the broader suite.

**Target users:** Colleges and universities (especially US and large international institutions).

**Major features:**
- Student Information System
- Admissions and registration
- Financial aid
- Student accounts / billing
- Faculty and curriculum tools
- Analytics and reporting
- Integrations with LMS platforms (Canvas, Blackboard, etc.)
- Mobile / portal access (modern Ellucian Experience / Student products)

**Technology stack:** Proprietary enterprise stack; historically Oracle-database oriented for Banner; cloud/SaaS options available.

**Pricing:**
- **Not published publicly**
- Third-party estimates for implementation often range from tens of thousands to millions USD depending on size — treat as **estimates**, not official quotes

**Advantages:**
- Deep higher-ed domain coverage
- Strong compliance / reporting focus (FERPA and related institutional needs)
- Large partner ecosystem

**Disadvantages (reported opinions from Software Advice / review aggregators):**
- Steep learning curve
- Older Banner screens often described as acronym-heavy and hard to navigate
- Expensive licensing and long implementations
- Patch / update friction reported by some admins
- Mobile experience historically weak (improving in newer products)

**UI reference:** Ellucian product pages and Experience portal demos on ellucian.com.

---

### 2.1.5 PowerSchool SIS

| Field | Detail |
|---|---|
| **Type** | Student Information System (primarily K-12) |
| **Official site** | https://www.powerschool.com/ |
| **Scale (reported)** | Tens of millions of students worldwide |

**Overview (verified):** PowerSchool is the dominant K-12 SIS for enrolment, attendance, grading, scheduling, and compliance reporting. It is sometimes discussed in higher-ed comparisons, but its core strength is school districts, not universities.

**Target users:** K-12 schools and districts; limited direct fit for Indian college workflows.

**Major features:**
- Student demographics and enrolment
- Attendance and scheduling
- Gradebook (PowerTeacher Pro)
- Transcripts and reporting
- Parent / teacher mobile apps
- Integrations for rostering and analytics

**Pricing:** Custom per-student pricing; not publicly listed. Industry estimates often cite a few dollars per student per year for core SIS (verify with vendor).

**Advantages:** Scale, mature gradebook, strong compliance tooling for K-12.

**Disadvantages for CampusOS context:** Not designed primarily for Indian undergraduate college life (clubs, semester notes culture, placement, WhatsApp-replacement workflows).

---

### 2.1.6 Blackbaud (Higher Education / Education Management)

| Field | Detail |
|---|---|
| **Type** | Connected campus suite (SIS + LMS + enrolment + billing) |
| **Official site** | https://www.blackbaud.com/ |

**Overview (verified):** Blackbaud markets a “Connected Campus” combining enrolment management, SIS, LMS, and billing so students and faculty use one ecosystem for applications, courses, assignments, grades, and tuition.

**Target users:** Especially private K-12 and higher-ed institutions in Blackbaud’s market.

**Major features:**
- Enrolment / admissions workflows
- Student information and attendance
- LMS tools (assignments, gradebook, calendaring)
- Billing and tuition payments
- APIs and OneRoster / LTI compliance claims

**Pricing:** Custom / not public.

**Advantages:** Unified SIS+LMS+billing story; long education software history.

**Disadvantages (reported opinions):** Reporting sometimes described as dated; implementation complexity; integrations between Blackbaud products not always as seamless as marketing claims.

---

### 2.1.7 Oracle PeopleSoft Campus Solutions

| Field | Detail |
|---|---|
| **Type** | Enterprise Campus Solutions / SIS |
| **Official site** | https://www.oracle.com/ (PeopleSoft Campus Solutions) |
| **Docs** | Oracle PeopleSoft Campus Solutions documentation |

**Overview (verified):** PeopleSoft Campus Solutions manages recruiting, admissions, student records, academic advisement, financial aid, and student financials. Oracle continues to deliver quarterly feature updates. Self-service is available as a related product.

**Target users:** Large and complex universities, often multi-campus.

**Major features:**
- Campus Community (person / org master data)
- Recruiting and Admissions
- Student Records
- Academic Advisement
- Financial Aid
- Student Financials
- Campus Self Service

**Technology stack:** PeopleSoft / Oracle stack; Fluid UI for modern screens; deployable on-prem or on Oracle Cloud Infrastructure.

**Pricing:** Enterprise quote-based; typically far beyond college-project budgets.

**Advantages:** Extremely deep student lifecycle coverage; strong for large institutions.

**Disadvantages:** Cost, complexity, long implementation cycles; not realistic as a CampusOS competitor for a student project — useful mainly as a reference for “what full SIS looks like.”

---

### 2.1.8 TCS iON Digital Campus

| Field | Detail |
|---|---|
| **Type** | Modular Digital Campus / education ERP |
| **Official site** | https://www.tcsion.com/ |
| **Product page** | TCS iON Digital Campus |

**Overview (verified from TCS iON product pages and brochure):** TCS iON Digital Campus digitises student lifecycle (admission, fees, timetable, attendance, exams, library, hostel, transport), faculty lifecycle (leave, payroll, appraisal, academic tasks), and institute administration (finance, HR, procurement).

**Target users:** Indian schools, colleges, and universities seeking a large-vendor managed platform.

**Major features:**
- Admissions and student affairs
- Timetable and attendance
- Exam planning, scoring, results
- Fees, library, hostel, transport
- Faculty HR / payroll
- LMS and collaboration add-ons
- Compliance / ranking support claims (NAAC, NIRF-related reporting themes)

**Technology stack:** Proprietary TCS iON cloud platform (details not fully public).

**Pricing:** Enterprise / institutional quote.

**Advantages:** Broad India-specific coverage; strong vendor brand; managed services options.

**Disadvantages:** Heavy for small colleges; customisation and ownership limits typical of large SaaS ERPs; student UX quality varies by implementation.

---

### 2.1.9 Teachmint

| Field | Detail |
|---|---|
| **Type** | Mobile-first Integrated School Platform (ISP) |
| **Official site** | https://www.teachmint.com/ |
| **Vendor claim** | 15M+ users, 25+ countries (from company careers / marketing materials) |

**Overview (verified from product directories):** Teachmint combines school administration (SIS-like tools, fees, admissions, exams) with LMS and live-class features in a mobile-first product.

**Target users:** Schools and institutes that want admin + live teaching in one app-heavy product.

**Major features:**
- Student information
- Live classes / LMS
- Fee management
- Admissions
- Exam planner
- Mobile apps for stakeholders
- Integrations (Zoom, Google Meet, payment gateways)

**Technology stack:** Not fully public; company hires for modern backend/frontend roles (typical of SaaS startups). Exact production stack not verified from official docs.

**Pricing:** Plan-based / sales-assisted (check current site).

**Advantages:** Strong mobile experience; combined admin + classroom tools.

**Disadvantages:** More school/coaching oriented than full university ERP; live-class focus may be more than CampusOS needs.

---

### 2.1.10 Campus365

| Field | Detail |
|---|---|
| **Type** | All-in-one School ERP |
| **Official site** | https://www.campus365.io/ |

**Overview (verified from features page):** Campus365 provides dashboards for teachers, students, parents, and management. Modules include timetable, attendance, exams, gradebooks, notices, hostel, library, transport, calendar, events, HR/payroll, finance/fees, LMS features, alumni, and campus recruitment.

**Target users:** K-12, higher-ed, and training institutes.

**Major features:**
- Paperless admissions and online fees
- SIS, attendance (including ID-card scanning claims)
- Notice boards and portals
- Finance, scholarships, donations
- LMS (quizzes, discussions, live lectures, materials)
- Alumni and campus recruitment add-ons
- Native iOS / Android apps

**Pricing:** Plans advertised with unlimited students (details via sales); reseller options exist.

**Advantages:** Very wide feature catalogue; mobile apps; integrated LMS + ERP narrative.

**Disadvantages:** “Everything” suites can feel shallow in places; parent-heavy design may not match pure college needs.

---

## 2.2 Open-Source Products

### 2.2.1 OpenEduCat

| Field | Detail |
|---|---|
| **Type** | Open-source Educational ERP |
| **Official site** | https://openeducat.org/ |
| **GitHub** | https://github.com/openeducat/openeducat_erp |
| **License** | LGPL v3 (Community); Enterprise modules separate |

**Overview (verified):** OpenEduCat is built on the Odoo framework and covers admissions, student information, courses/batches, exams, fees, attendance, timetable, library, transport, hostel, communication, HR, and analytics. Community vs Enterprise feature split exists (biometric, multi-campus, advanced analytics often enterprise).

**Target users:** Schools and colleges wanting Odoo-based education ERP.

**Technology stack (verified):**
- Python
- PostgreSQL
- Odoo / OWL frontend
- Deployable on Linux, Docker, major clouds

**Pricing:** Community free; Enterprise paid.

**Advantages:** Modular; PostgreSQL-based; strong admin ERP coverage.

**Disadvantages:** Odoo learning curve; community edition may miss advanced modules; UI is Odoo-like, not always student-app polished.

---

### 2.2.2 Moodle

| Field | Detail |
|---|---|
| **Type** | World’s most widely used open-source LMS |
| **Official site** | https://moodle.org/ |
| **GitHub** | https://github.com/moodle/moodle |
| **License** | GPL v3 |

**Overview (verified):** Moodle is a learning platform for courses, activities, quizzes, assignments, gradebooks, forums, and plugins. It is **not** a full college ERP/SIS.

**Target users:** Schools, universities, and corporate training.

**Major features:**
- Course content and activities
- Assignments and quizzes
- Gradebook
- Forums and collaboration
- Huge plugin ecosystem (2,000+ commonly cited)
- Mobile app
- Web services / APIs
- LTI and standards support

**Technology stack (verified):** PHP; MySQL/MariaDB/PostgreSQL; large plugin architecture.

**Pricing:** Free software; MoodleCloud / partner hosting paid.

**Advantages:** Mature, flexible, enormous community.

**Disadvantages:** UI often needs theming; setup and plugin management can be heavy; does not replace SIS/ERP.

---

### 2.2.3 Chamilo

| Field | Detail |
|---|---|
| **Type** | Open-source LMS |
| **Official site** | https://chamilo.org |
| **GitHub** | https://github.com/chamilo/chamilo-lms |
| **License** | GPL v3 |

**Overview (verified):** Chamilo is a lighter LMS alternative to Moodle, with courses, quizzes, announcements, skills, APIs, and security features including MFA support in modern versions.

**Technology stack (verified from GitHub):** PHP 8.2/8.3, MariaDB; newer versions move toward Symfony + Vue.

**Advantages:** Simpler than Moodle for many teams; lower resource use.

**Disadvantages:** Smaller ecosystem than Moodle; English docs sometimes lag.

---

### 2.2.4 Sakai

| Field | Detail |
|---|---|
| **Type** | Open-source higher-ed LMS / collaboration environment |
| **Docs / intro** | Apereo Sakai project documentation |
| **License** | Educational Community License 2.0 (ECL-2.0) |

**Overview (verified):** Sakai provides course sites with assignments, gradebook, tests/quizzes, lessons, forums, calendar, announcements, and chat. Built by and for higher education communities.

**Technology stack (verified from Sakai docs):**
- Java 17
- Apache Tomcat
- Spring Framework
- Hibernate
- Frontend: modern JS / Web Components / Bootstrap
- Databases: MySQL/MariaDB, Oracle, SQL Server

**Advantages:** Strong higher-ed collaboration focus; modular tools.

**Disadvantages:** Heavier Java ops footprint; smaller mindshare than Moodle/Canvas in many regions.

---

### 2.2.5 openSIS (OS4ED)

| Field | Detail |
|---|---|
| **Type** | Open-source Student Information System |
| **Official site** | https://www.os4ed.com / https://opensis.com |
| **GitHub** | https://github.com/OS4ED/openSIS-Classic |
| **License** | GPL |
| **Community edition** | v9.3 (release note dated June 2026 on GitHub README) |

**Overview (verified):** openSIS Classic manages student/staff/school data, courses, scheduling, attendance, grades, teacher gradebook, report cards, transcripts, and built-in communication. Paid SaaS / Professional editions add more.

**Technology stack (verified):** PHP 8.x, MySQL/MariaDB, Apache.

**Advantages:** True SIS focus; free community edition; can integrate with Moodle.

**Disadvantages:** Older PHP app feel in Classic edition; not a modern React-style student experience out of the box.

---

## 2.3 Product Landscape Map

```
                    OFFICIAL RECORDS
                           │
              ┌────────────┼────────────┐
              │            │            │
           openSIS    Ellucian     PeopleSoft
           Academia   Banner       Campus Solutions
              │            │            │
              └────────────┼────────────┘
                           │
                    FULL CAMPUS ERP
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ERPNext Ed        OpenEduCat        TCS iON
    Fedena            Campus365         Academia ERP
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                         LMS
                           │
              ┌────────────┼────────────┐
              │            │            │
           Moodle       Chamilo       Sakai
                                       (+ Canvas commercial)
                           │
                    STUDENT DAILY LIFE
                           │
                    ★ CampusOS focus ★
         (dashboard, notes, notices, assignments,
          attendance visibility, timetable, events)
```

<div style="page-break-after: always;"></div>

# 3. Feature Comparison

Legend:

| Symbol | Meaning |
|---|---|
| ✅ | Supported as a core / advertised feature |
| 🟡 | Partial, plugin, paid add-on, or limited |
| ❌ | Not a primary focus / not typically present |
| ? | Not clearly verified from public materials |

> Comparison is based on official product pages, docs, and GitHub READMEs as of research date (Aug 2026). Implementations vary by plan and configuration.

| Feature | ERPNext Ed | Fedena | Academia | Ellucian | PowerSchool | Blackbaud | PeopleSoft | TCS iON | Teachmint | Campus365 | OpenEduCat | Moodle | Chamilo | Sakai | openSIS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Student Portal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Faculty Portal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin Portal | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Attendance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ✅ |
| Timetable | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ |
| Assignments | 🟡 | ✅ | ✅ | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 |
| Study Materials | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ❌ |
| Notice Board | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Library | 🟡 | ✅ | 🟡 | 🟡 | ❌ | ❌ | 🟡 | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fees | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | 🟡 |
| Examination | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gradebook | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI Features | 🟡 | 🟡 | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| Hostel | 🟡 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Transport | 🟡 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Placement | 🟡 | ✅ | ✅ | 🟡 | ❌ | ❌ | 🟡 | 🟡 | ❌ | ✅ | 🟡 | ❌ | ❌ | ❌ | ❌ |
| Alumni | 🟡 | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | 🟡 | ❌ | ❌ | ❌ | ❌ |
| Events | 🟡 | ✅ | ✅ | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | 🟡 | ✅ | 🟡 |
| Clubs | ❌ | 🟡 | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🟡 | ❌ | ❌ | ❌ | 🟡 | ❌ |
| Messaging | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mobile App | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 | 🟡 | 🟡 |
| Role-Based Access | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| API Support | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Cloud Support | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analytics Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 |

### Reading the table for CampusOS

Most enterprise products are strong in **fees, exams, HR, and official records**.
Many are weaker or uneven in:

- Clean **student daily dashboard**
- Permanent **semester notes repository**
- Lightweight **club / campus life** tools
- Modern **search across campus content**
- Practical **AI study assistants** grounded in college notes (RAG)

Those gaps matter for CampusOS positioning.

<div style="page-break-after: always;"></div>

# 4. Common Problems

This section mixes **verified industry observations** with **reported user opinions**. Opinions are labelled clearly.

## 4.1 Poor / Outdated UI

**Reported opinions (Ellucian Banner reviews on Software Advice / review sites):**
- Screens accessed by cryptic acronyms
- Steep learning curve for non-technical staff
- Portal experiences described as outdated or fragile
- Mobile readability historically poor

**Reported opinions (Blackbaud GetApp reviews):**
- Creating assignments and understanding student view can be confusing
- Reporting described as antiquated by some long-term users

**Why this matters:** Students abandon tools that are slower than asking a friend on WhatsApp.

## 4.2 Slow Performance and Fragility

**Reported opinions:** Admins report patches breaking modules, pages failing intermittently, and heavy systems feeling slow during peak registration.

**Industry observation:** Large ERPs carry decades of customisation. Custom code increases upgrade risk. ([EDUCAUSE-related commentary summarised in LMS/SIS/ERP guides](https://vigilearn.com/lms-vs-sis-vs-erp/))

## 4.3 Too Many Modules

**Verified product pattern:** Fedena, Campus365, Academia, and TCS iON advertise very large module catalogues (often 40–100+ capabilities depending on packaging).

**Practical problem:** Institutions buy “everything,” enable too much, and users cannot find the five things they need daily.

## 4.4 Difficult Setup and Long Implementation

**Verified / commonly documented:** Enterprise SIS/ERP implementations (Ellucian, PeopleSoft, large Academia / TCS projects) often take months and need dedicated implementation teams.

**College-project lesson:** CampusOS must be installable and demoable by a student team in one semester.

## 4.5 Expensive Licensing

**Verified:** Ellucian, Oracle, Blackbaud, and many Indian enterprise ERPs use quote-based pricing.

**Reported estimates:** Banner implementations can reach very high five–seven figure USD totals for large campuses (third-party estimates; not official).

**Indian context:** Even “affordable” ERPs can be costly for small private colleges after implementation, training, SMS gateways, and mobile add-ons.

## 4.6 Weak Mobile Experience

**Reported opinions:** Legacy portals were desktop-first. Newer vendors (Teachmint, Campus365, PowerSchool apps) improved this, but many college portals remain awkward on phones.

**Student reality:** Most Indian students access campus info primarily from mobile.

## 4.7 Limited Useful AI

**Verified industry surveys:**
- Ellucian’s 2025 AI in Higher Education Survey (published into 2026 discussions) found institution-wide AI adoption rising (49% → 66% in their survey window), with strongest confidence in operational analytics and cybersecurity, and more caution around high-stakes academic decisions. ([Ellucian AI Report PDF](https://lp.ellucian.com/rs/085-MHT-312/images/Ellucian_2026-AI-Report.pdf))

**Gap:** Marketing often says “AI-powered,” but students rarely get a reliable assistant that answers “Where are Unit 3 DBMS notes?” using their own course files.

## 4.8 Weak Search and Notifications

**Common student complaint pattern (case studies / UX research):**
- Critical alerts buried in menus
- No single search across notes, notices, and assignments
- Notification spam or no notifications at all

Canvas student co-design research emphasises that students want a **today/this-week overview**, not a buried alert centre. ([Instructure Community, Canvas student dashboard research](https://community.instructure.com/en/discussion/663735/designing-the-canvas-student-experience-with-student))

## 4.9 Summary of Pain Points

| Pain Point | Who Feels It Most | Evidence Type |
|---|---|---|
| Outdated UI / acronym screens | Staff + students | User reviews |
| Expensive licences | College management | Vendor pricing models + estimates |
| Overbuilt modules | Everyone | Product catalogues |
| Long implementation | IT + leadership | Implementation case patterns |
| Poor mobile UX | Students | Reviews + UX studies |
| Shallow AI claims | Students + admins | Industry AI surveys vs student needs |
| Fragmented tools still remain | Students | Campus field observation + SIS/LMS split literature |

<div style="page-break-after: always;"></div>

# 5. Current Industry Trends (2026)

## 5.1 From System of Record to System of Intelligence

**Verified trend language (2026):** Analyst and vendor content increasingly describes ERPs moving from passive databases to systems that analyse and act on data — forecasting enrolment, flagging at-risk students, and automating routine workflows. ([Talentus Global ERP Strategy 2026](https://talentusglobal.com/blog/erp-strategy-2026-systems-of-intelligence), [Clast AI ERP guide](https://clast.io/blog/ai-erp-for-education))

## 5.2 AI Assistants and Chatbots

**Verified:** Higher-ed AI surveys show rising institutional adoption and dedicated budgets, with operational use cases trusted more than fully automated admissions/learning decisions. ([Ellucian 2026 AI Report](https://lp.ellucian.com/rs/085-MHT-312/images/Ellucian_2026-AI-Report.pdf), [USBA Council 2026 AI readiness summary](https://www.usbacouncil.org/post/state-of-artificial-intelligence-in-higher-education-2026-executive-readiness-investment-and-stra))

**Practical chatbot uses already common in marketing:**
- “When is my fee due?”
- “What is tomorrow’s timetable?”
- “How do I apply for a transcript?”

**CampusOS opportunity:** Start with campus FAQ + personal academic data queries later; avoid overselling autonomous grading.

## 5.3 Predictive Analytics

Common use cases in 2026 guides:
- At-risk student detection (attendance + grades + engagement)
- Enrolment forecasting
- Resource / classroom utilisation

**Constraint noted in research:** AI fails when institutional data is siloed. Data maturity matters more than model choice.

## 5.4 Digital Campus and Mobile-First Design

Vendors increasingly sell:
- One login for student services
- Native apps or high-quality PWAs
- Paperless admissions and online fees

Teachmint and Campus365 explicitly market mobile-first / native apps. Enterprise vendors are modernising portals after years of student complaints.

## 5.5 QR / Biometric / Face Attendance

**Verified product claims:**
- Campus365 advertises ID-card scanning attendance
- OpenEduCat Enterprise lists biometric attendance
- Multiple AI-ERP guides describe QR attendance as a standard automation

**Caution:** Face recognition raises privacy and consent issues. For a college project, QR attendance is more realistic than face recognition.

## 5.6 Smart Timetable Generation

Automatic conflict-free timetable generation appears in higher Fedena / OpenEduCat enterprise feature lists and in modern school SaaS products. It is computationally non-trivial (constraint solving).

## 5.7 Cloud-Native ERP

**Verified direction:** New university ERP deployments are commonly cloud or hybrid. Benefits claimed: lower CapEx, automatic updates, elastic scale. Data residency and compliance still push some institutions to hybrid models. ([UnityEdu university ERP guide, 2026](https://unityedu.ai/university-erp/))

## 5.8 LLM Integration and RAG Knowledge Assistants

Emerging pattern in education tech:
- LLM chat over institutional policies
- RAG (Retrieval-Augmented Generation) over lecture notes and FAQs
- Human-in-the-loop for grades and admissions

**Best practice for CampusOS:** Treat RAG study assistant as a **future phase** after the notes repository has real content.

## 5.9 Trend Relevance Matrix for CampusOS

| Trend | Adopt in V1? | Why |
|---|---|---|
| Mobile-responsive web | ✅ Yes | Students are mobile-first |
| Notifications | ✅ Yes | Solves missed deadlines |
| Cloud deploy (free tier) | ✅ Yes | Needed for demo |
| Role-based dashboards | ✅ Yes | Core product |
| QR attendance | 🟡 Later | Valuable but extra scope |
| AI chatbot | 🟡 Later | Needs data + API cost management |
| Face recognition | ❌ No | Privacy + complexity |
| Full predictive analytics | ❌ No | Needs long historical data |
| Smart timetable generator | ❌ No (V1) | Hard optimisation problem |

<div style="page-break-after: always;"></div>

# 6. Feature Gap Analysis

## 6.1 What Existing Systems Already Do Well

| Area | Who Does It Well | Note |
|---|---|---|
| Official student records | Ellucian, PeopleSoft, openSIS, Academia | Hard for CampusOS to beat in V1 |
| Fees + finance | TCS iON, Academia, Fedena, ERPNext | Out of CampusOS V1 scope by design |
| Deep LMS coursework | Moodle, Sakai, Chamilo, Blackbaud LMS | CampusOS should not reinvent Moodle |
| Huge module catalogues | Campus365, Fedena, OpenEduCat | Quantity ≠ student delight |

## 6.2 What Is Missing or Weak

### Gap A — Student daily life is still fragmented

Even where colleges have an ERP, students still use WhatsApp for notes, verbal announcements for deadlines, and separate apps for everything else.

**CampusOS differentiation:** Be the **daily academic home screen**, not the finance system.

### Gap B — Notes are temporary, not institutional

Most ERPs store documents as attachments. Few treat semester notes as a durable, searchable library organised by Semester → Subject → Unit.

**CampusOS differentiation:** Permanent notes repository + later previous-year archive.

### Gap C — Dashboards answer admin questions, not student questions

Enterprise dashboards often show enrolment charts and fee collection. Students ask:

1. What is due?
2. Where do I need to be today?
3. Is my attendance safe?
4. What was announced?

**CampusOS differentiation:** Student dashboard designed around those four questions.

### Gap D — Clubs and campus life are afterthoughts

Comparison shows clubs are rarely first-class. Events exist, but student organisations are weak.

**CampusOS differentiation:** Events + clubs as Phase 2 campus-life modules.

### Gap E — AI is marketed more than delivered for study help

Vendors emphasise analytics and chatbots. Few ship trustworthy note-grounded study assistants.

**CampusOS differentiation:** Future RAG assistant over uploaded notes — only after repository quality is real.

### Gap F — Setup cost excludes small colleges and student builders

Open-source options exist (ERPNext Education, OpenEduCat, openSIS, Moodle), but they are either admin-heavy or LMS-only.

**CampusOS differentiation:** Narrow scope, modern stack, demonstrable in one semester.

## 6.3 Opportunity Summary

| Opportunity | Why It Matters | CampusOS Response |
|---|---|---|
| Unified student home | Reduces WhatsApp dependency | Role dashboards |
| Notes longevity | Seniors’ material vanishes every year | Notes + Semester Library |
| Deadline reliability | Marks lost to missed announcements | Assignments + reminders |
| Attendance transparency | Shortage discovered too late | Student attendance views + alerts |
| Clean UX | Legacy ERPs frustrate users | Modern responsive UI |
| Honest AI roadmap | Avoid fake “AI-powered” labels | AI only after data foundation |

<div style="page-break-after: always;"></div>

# 7. Best UI/UX Practices

## 7.1 Dashboards

**Research-backed pattern (Canvas student co-design):**
- Answer “what do I need today / this week?” first
- Use widgets that can expand/collapse
- Avoid stress-inducing comparisons by default
- Keep the interface scannable between classes

**Practical CampusOS dashboard content:**
1. Today’s timetable
2. Pending assignments (sorted by deadline)
3. Recent notices
4. Attendance summary with warning if below threshold

## 7.2 Navigation

Best practices from LMS UX guidance:
- Persistent top bar: search, notifications, profile
- Clear primary destinations (max ~5–7 for students)
- Bottom navigation on mobile
- Reach core tasks in ≤3 clicks

## 7.3 Timetable

Good patterns:
- Desktop: weekly grid
- Mobile: day list (today-first)
- Show subject, faculty, room, time
- Visually mark cancelled / rescheduled classes

## 7.4 Attendance

Faculty:
- Default “all present,” toggle absentees only
- Finish a class of ~60 in under 2 minutes

Students:
- Overall % + subject breakdown
- Colour thresholds (e.g., below 75%)
- Date-wise history on demand

## 7.5 Assignment Workflow

Clear status language:
- Pending → Submitted → Late → Graded

Student screen must show:
- Deadline countdown
- Upload area
- Current status
- Feedback after grading

Faculty screen must show:
- Submitted vs pending counts
- Bulk download
- Simple grading entry

## 7.6 Notifications

Do:
- Notify on new assignment, urgent notice, attendance risk, grade release
- Allow category preferences

Don’t:
- Spam for every minor update
- Force undismissable popups

## 7.7 Mobile Experience

| Practice | Example |
|---|---|
| Mobile-first layouts | Teachmint-style app priority |
| Large tap targets | 44×44 px minimum |
| Day-first timetable | Canvas mobile redesign studies |
| Read-mostly speed | Fast glance companion pattern |
| Progressive Web App option | Installable web app before native |

## 7.8 Inspiration Sources (not copies)

| Product / Study | Steal This Idea |
|---|---|
| Canvas student dashboard research | Today/This Week widgets |
| UniVerse student portal case study | Attendance + schedule + deadlines above the fold |
| Modern school apps (Teachmint) | Mobile-first flows |
| Notion / Linear (general UX) | Clean density, keyboard-friendly later |

<div style="page-break-after: always;"></div>

# 8. Technical Architecture

## 8.1 What Real Products Use

| Product | Backend | Frontend | Database |
|---|---|---|---|
| ERPNext Education | Python / Frappe | JS / Vue | MariaDB/MySQL |
| OpenEduCat | Python / Odoo | OWL | PostgreSQL |
| Fedena | Ruby on Rails | Web UI | Relational DB |
| Moodle | PHP | Themes / JS | MySQL/MariaDB/PostgreSQL |
| Chamilo | PHP (+ Symfony/Vue in newer lines) | Vue (newer) | MariaDB |
| Sakai | Java / Spring | Web Components / Bootstrap | MySQL/Oracle/SQL Server |
| openSIS Classic | PHP | Classic web UI | MySQL/MariaDB |
| Modern indie school SaaS examples | Node/Nest/Express | React/Next | PostgreSQL + Prisma |

## 8.2 Most Common Patterns in 2025–2026 Education SaaS

From modern open education/SaaS repositories and engineering articles:

| Layer | Common Choice | Why |
|---|---|---|
| Frontend | React (often Vite or Next.js) | Component reuse, hiring familiarity |
| Backend | Node.js (Express/Nest) or Python (Django/FastAPI) | Fast API development |
| Database | **PostgreSQL** | Relational academic data fits SQL well |
| ORM | Prisma / SQLAlchemy / Eloquent | Safer queries, migrations |
| Auth | JWT or session + OAuth/OIDC | Stateless APIs or SSO |
| Cache / queues | Redis | Sessions, rate limits, jobs |
| Files | S3-compatible object storage | Notes and submissions |
| Deploy | Docker + cloud PaaS | Repeatable demos |

## 8.3 Architecture Style Recommendation Context

For CampusOS (already starting as Node.js + Express ESM backend):

```
┌──────────────────────────────┐
│ React Web Client (later)     │
│ Tailwind + component library │
└──────────────┬───────────────┘
               │ HTTPS + JWT
┌──────────────▼───────────────┐
│ Express API (apps/backend)   │
│ routes → controllers → svc   │
│ middleware: auth, rbac, valid│
└──────┬───────────────┬───────┘
       │               │
┌──────▼──────┐ ┌──────▼──────┐
│ PostgreSQL  │ │ File store  │
│ (Prisma)    │ │ local / S3  │
└─────────────┘ └─────────────┘
```

**Opinion (team recommendation, not industry law):** PostgreSQL + Prisma fits CampusOS better than MongoDB because attendance, enrolments, and submissions are highly relational.

## 8.4 Why Not Copy Enterprise Stacks Blindly

| Enterprise Choice | Why CampusOS Should Avoid Blind Copy |
|---|---|
| PeopleSoft / Oracle | Too heavy, proprietary, not student-buildable |
| Full Odoo/OpenEduCat | Fast to install, hard to own as original project |
| Moodle-only | Solves LMS, not campus daily ops |
| Microservices + Kubernetes on day 1 | Over-engineering for a college project |

<div style="page-break-after: always;"></div>

# 9. Security Features

Educational platforms handle sensitive personal and academic data. Even a student project should apply core controls.

## 9.1 Authentication

**Common industry practices:**
- Email/roll-number + password login
- Password hashing (bcrypt / Argon2)
- JWT access tokens or secure server sessions
- Password reset via email token
- Optional SSO (OAuth2 / OIDC) in larger products
- MFA / TOTP in mature LMS platforms (e.g., Chamilo lists MFA; enterprise suites support SSO+MFA)

**CampusOS V1 minimum:** bcrypt passwords, JWT, reset flow, lockout after repeated failures.

## 9.2 Role-Based Access Control (RBAC)

Almost every product reviewed advertises roles (Student, Faculty, Admin, Parent, etc.).

**Best practice:** Enforce permissions on the **server**, not only by hiding buttons.

CampusOS roles (from PRD): Student, Faculty, Admin (+ Club Coordinator later).

## 9.3 Multi-Factor Authentication

**Verified:** Present in many enterprise and some open-source LMS products.

**CampusOS:** Optional future enhancement; not required for V1 demo if passwords + lockout exist.

## 9.4 Audit Logs

Needed especially for:
- Grade changes
- Attendance edits
- Role changes
- Data exports

Enterprise SIS products treat auditability as compliance-critical (FERPA context in US systems).

## 9.5 Encryption

| Layer | Practice |
|---|---|
| In transit | HTTPS / TLS |
| At rest | Disk encryption on hosted DB; hashed passwords |
| Sensitive fields | Extra encryption for highly sensitive PII if stored |

## 9.6 Data Privacy

Depending on country:
- **FERPA** (US education records)
- **GDPR** (EU personal data)
- **India DPDP Act** considerations for personal data

CampusOS should:
- Collect only needed fields
- Restrict profile edits for identity fields
- Avoid using real student data in public demos

## 9.7 Backup and Disaster Recovery

Industry baseline:
- Daily database backups
- File-storage redundancy
- Tested restore process

Free-tier college deployments should still script backups before demos.

## 9.8 Security Checklist for CampusOS V1

| Control | V1 Priority |
|---|---|
| Password hashing | Must |
| HTTPS in production | Must |
| JWT expiry + auth middleware | Must |
| Server-side RBAC | Must |
| Input validation | Must |
| File type/size limits | Must |
| Audit log for critical writes | Should |
| MFA | Later |
| Field-level PII encryption | Later |

<div style="page-break-after: always;"></div>

# 10. Recommendations for CampusOS

These recommendations combine the research above with CampusOS project constraints (student team, one semester, Node/Express backend already started).

## 10.1 Core Features for Version 1

Build these first. They map to real gaps and are demonstrable.

| Priority | Feature | Why |
|---|---|---|
| P0 | Auth + RBAC (Student/Faculty/Admin) | Foundation for everything |
| P0 | Student / Faculty / Admin dashboards | Main differentiation vs cluttered ERPs |
| P0 | Digital notice board | Replaces unreliable physical boards |
| P0 | Notes repository (Semester → Subject → Unit) | Solves WhatsApp notes loss |
| P0 | Assignment create / submit / track | Solves missed deadlines |
| P0 | Timetable view | Daily “where do I go?” question |
| P0 | Attendance mark + student visibility | Solves late shortage discovery |
| P0 | In-app notifications (+ email for urgent) | Makes information actually arrive |
| P1 | Academic calendar | Context for deadlines and holidays |
| P1 | Global search | Fixes weak findability in legacy systems |
| P1 | User profiles | Basic identity and preferences |

## 10.2 Nice-to-Have Features (if time remains)

| Feature | Why Useful | Risk if Forced Early |
|---|---|---|
| Events + registration | Campus life value | Extra CRUD surface |
| Clubs | Differentiation | Moderation overhead |
| Semester resource library | Long-term archive value | Needs multi-year data |
| Attendance CSV export | Faculty convenience | Low complexity, good if spare time |
| Notice read receipts | Admin confidence | Extra writes/reads |

## 10.3 Future AI Features

Only after core data exists:

1. **Campus chatbot** — timetable, deadlines, notice FAQs
2. **RAG note assistant** — answer from uploaded subject PDFs
3. **Note summariser** — unit revision sheets
4. **At-risk attendance alerts** (rule-based first, ML later)
5. **QR attendance**

Avoid face recognition and autonomous grading in early versions.

## 10.4 Recommended Technology Stack

Aligned with current CampusOS repo direction and industry SaaS patterns:

| Layer | Recommendation | Why suitable for a college project |
|---|---|---|
| Runtime | Node.js (ES Modules) | Already chosen; fast to build APIs |
| Framework | Express | Simple, widely taught, enough for V1 |
| Database | PostgreSQL | Relational fit for academic data |
| ORM | Prisma | Clear schema, migrations, TypeScript-friendly later |
| Auth | JWT + bcrypt | Stateless, easy to reason about |
| Frontend (next) | React + Vite + Tailwind | Modern UI speed; matches hiring/skills |
| Validation | Zod or Joi | Prevent bad input early |
| Files | Local now → Cloudinary/S3 later | Keeps V1 simple |
| Email | Free SMTP / SendGrid tier | Deadline reminders |
| Deploy | Render/Railway + Vercel (or similar) | Free/cheap demo hosting |

## 10.5 Suggested Architecture

Keep a **modular monolith**:

- `routes` → HTTP endpoints
- `controllers` → request/response shaping
- `services` → business rules
- `models` / Prisma → data access
- `middleware` → auth, RBAC, errors
- `modules` → feature boundaries (attendance, notes, assignments)

Do **not** split into microservices for V1.

## 10.6 Database Approach

- Relational schema first (see existing ER research / PRD entities)
- Soft deletes for users where history matters
- Store file URLs, not binaries, in DB
- Unique constraints for attendance and submissions
- Index hot paths: `student_id`, `subject_id`, `deadline`, unread notifications

## 10.7 Deployment Approach

| Stage | Approach |
|---|---|
| Local development | Docker Postgres + Node API |
| Team integration | GitHub + branch PRs |
| Demo / evaluation | Cloud deploy with seed data |
| Data policy | Synthetic students only in public demos |

## 10.8 Positioning Statement (for the team)

> **CampusOS is not trying to replace Ellucian, TCS iON, or Moodle.**
>
> It is trying to be the clean, student-first layer that Indian college students actually open every day for notices, notes, deadlines, timetable, and attendance — with a path to AI later.

That positioning is supported by the gaps found in this research.

<div style="page-break-after: always;"></div>

# 11. References

## 11.1 Definitions and Buyer Guides

1. VigiLearn — *LMS vs SIS vs ERP: University System Guide*  
   https://vigilearn.com/lms-vs-sis-vs-erp/
2. UniCloud360 — *University ERP Systems: 2026 Buyer Guide*  
   https://unicloud360.com/blog/university-erp-systems-guide/
3. openSIS Blog — *SIS vs LMS*  
   https://opensis.com/blog/sis-vs-lms-understanding-the-difference-between-student-data-and-learning-platforms
4. Classter — *SIS vs LMS vs SMS in 2026*  
   https://www.classter.com/blog/edtech/sis-vs-lms-vs-sms-in-2026-what-schools-actually-need-today/
5. Clast — *SIS vs ERP*  
   https://clast.io/blog/sis-vs-erp-school-management-software

## 11.2 Commercial Product Sites

6. ERPNext / Frappe Education — https://frappe.io/erpnext/for-education  
7. Fedena — https://fedena.com/  
8. Foradian — https://foradian.com/  
9. Academia ERP — https://www.academiaerp.com/  
10. Ellucian — https://www.ellucian.com/  
11. PowerSchool — https://www.powerschool.com/  
12. Blackbaud Higher Education — https://www.blackbaud.com/solutions/organizational-and-program-management/education-management/higher-education  
13. Oracle PeopleSoft Campus Solutions — https://www.oracle.com/  
14. TCS iON Digital Campus — https://www.tcsion.com/  
15. Teachmint — https://www.teachmint.com/  
16. Campus365 — https://www.campus365.io/

## 11.3 Open Source Repositories and Docs

17. Frappe Education GitHub — https://github.com/frappe/education  
18. OpenEduCat GitHub — https://github.com/openeducat/openeducat_erp  
19. OpenEduCat site — https://openeducat.org/  
20. Moodle GitHub — https://github.com/moodle/moodle  
21. Moodle.org — https://moodle.org/  
22. Chamilo GitHub — https://github.com/chamilo/chamilo-lms  
23. openSIS Classic GitHub — https://github.com/OS4ED/openSIS-Classic  
24. OS4ED products — https://www.os4ed.com/products-and-services  
25. Sakai project documentation (Apereo) — search “Sakai CLE documentation”

## 11.4 Reviews, Surveys, and Trend Sources

26. Software Advice — Ellucian profile / user reviews  
    https://www.softwareadvice.com/erp/ellucian-profile/
27. Ellucian AI in Higher Education Report (PDF)  
    https://lp.ellucian.com/rs/085-MHT-312/images/Ellucian_2026-AI-Report.pdf
28. USBA Council — *State of AI in Higher Education 2026* summary  
    https://www.usbacouncil.org/post/state-of-artificial-intelligence-in-higher-education-2026-executive-readiness-investment-and-stra
29. Clast — *AI ERP for Education*  
    https://clast.io/blog/ai-erp-for-education
30. UnityEdu — *University ERP Guide (2026)*  
    https://unityedu.ai/university-erp/
31. Talentus Global — *ERP Strategy 2026*  
    https://talentusglobal.com/blog/erp-strategy-2026-systems-of-intelligence
32. Instructure Community — Canvas student dashboard co-design discussion  
    https://community.instructure.com/en/discussion/663735/designing-the-canvas-student-experience-with-student
33. GetApp — Blackbaud SIS reviews  
    https://www.getapp.co.uk/software/2059370/blackbaud-sis

## 11.5 Technical / Security References

34. DEV Community — *Building Smart Learning Platforms (2025 stack practices)*  
    https://dev.to/gloobia/building-smart-learning-platforms-modern-tech-stack-best-practices-for-2025-4n6c
35. Modern education SaaS examples (architecture patterns): Nest/Express + React + PostgreSQL + Prisma repositories on GitHub (pattern reference, not CampusOS dependency)

## 11.6 Internal CampusOS Documents

36. CampusOS PRD — `docs/01_Product_Requirements_Document.md`  
37. Temporary ER research — `TEMP_ER_Diagram.md`

---

## Appendix A — Research Method Notes

| Step | What Was Done |
|---|---|
| Product scan | Official websites + docs for each listed product |
| Open-source check | GitHub READMEs for stack, licence, features |
| Complaint scan | Aggregated review sites (Software Advice, GetApp, etc.) |
| Trend scan | 2025–2026 higher-ed AI / ERP guides and vendor surveys |
| UX scan | Canvas co-design notes + LMS UX articles |
| Limitation | Some pricing is quote-only; some stacks are not fully public |

## Appendix B — What CampusOS Should Not Try to Beat in V1

1. Ellucian/PeopleSoft-level financial aid compliance  
2. Full finance + payroll ERP  
3. Moodle-level plugin LMS ecosystem  
4. Biometric multi-campus enterprise attendance  
5. National reporting suites (NIRF/NAAC automation as a product promise)

---

<div align="center">

### End of Report

**CampusOS — Market and Technical Research Report · Version 1.0**

*Prepared for the CampusOS engineering team · 3 August 2026*

*Use this document together with the PRD before writing more code.*

</div>
