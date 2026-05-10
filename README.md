# 🏏 Live Gully Cricket Scoring Web App

A fast, intuitive, and real-time web application designed for scoring gully cricket matches. Built to eliminate manual scoring challenges, this app delivers a smooth live match experience with instant updates, smart controls, and detailed statistics, all optimized for local gameplay scenarios.

---

## 📌 Overview

Gully cricket is widely played but often lacks structured scoring. This project solves that problem by providing a digital scoring system that is:

* ⚡ Real-time with zero noticeable delay
* 📱 Simple and user-friendly
* 📊 Data-driven with detailed match and player insights
* 🔄 Smartly optimized with local-first data handling

---

## 🚀 Key Features

* Create and manage teams and players
* Start and manage live matches with full control
* Real-time score updates with instant UI feedback
* Ball-by-ball scoring system
* Advanced match flow handling (overs, wickets, innings switch)
* Undo functionality for mistake correction
* Local storage during match for speed, with cloud sync after completion
* Comprehensive statistics dashboard
* Dark/Light theme support

---

## 🧩 Application Structure

The application consists of multiple pages, each designed for a specific purpose.

---

# 🏠 Home Page

The Home Page acts as the central dashboard.

### Features:

* **New Match Button** to quickly start a match
* Overview stats:

  * Total Matches Played
  * Total Teams
  * Total Players
* **Recent Matches Section**

  * Displays both completed and incomplete matches
* **Sync Button**

  * Allows manual synchronization of locally stored data with the database

  <img width="1080" height="2348" alt="Screenshot_20260502-164017" src="https://github.com/user-attachments/assets/6c718d2c-cccb-4a69-b2dc-6222616ecc60" />

---

# 🎮 Live Match Setup Page

This is where a match is configured before starting.

### Match Setup Flow:

1. Select **Team 1 and Team 2**
2. Choose **Number of Overs**
3. Select **Batting First Team**
4. Choose:

   * Opening Batsmen (Dropdown)
   * Opening Bowler (Dropdown)

All setup actions are performed on a single screen for convenience.

<img width="540" height="1459" alt="2" src="https://github.com/user-attachments/assets/2f731720-5d2c-4fae-b7f7-1dcbcd42e0ee" />



---

# 📊 Live Match Scoring Page

Once the match starts, the app transitions into the live scoring interface.

### Top Section:

* Total Score
* Overs and Balls
* Run Rate

### Middle Section:

* Batsmen Stats:

  * Runs, Balls, Strike Rate
* Bowler Stats:

  * Overs, Runs, Wickets

### Scoring Controls:

* Dot Ball
* 1 Run
* 4 Runs
* 6 Runs
* Wide
* Wicket
* No Ball

  * Additional option appears to select runs along with no-ball



---

## 🔄 Advanced Match Controls

### ✔ Undo Button

* Reverts the last action instantly

### ✔ Player Retirement

* Click on a batsman to retire them

### ✔ Wicket Handling

* On dismissal, a new batsman selection list appears

### ✔ Over Completion

* Prompts selection of next bowler

---

# 🔁 Second Innings Handling

After the first innings:

* Automatically switches to second batting team
* Displays:

  * Target Score
  * Runs Needed
  * Required Run Rate
  * Current Run Rate

The UI remains consistent while adapting to chase dynamics.

<img width="540" height="1411" alt="WhatsApp Image 2026-05-02 at 4 51 21 PM" src="https://github.com/user-attachments/assets/a80adb24-7d67-41bc-90e7-f7078a93dab9" />


---

# ⚡ Performance Optimization (Core Feature)

A major highlight of this project is its **hybrid data handling strategy**:

### Problem:

Using a cloud database during live matches caused input delays.

### Solution:

* During the match → **All data stored locally**
* After match completion → **Automatic sync to cloud database**
* Optional **Manual Sync Button** also available

### Result:

* Instant UI updates
* Zero lag scoring
* Smooth real-time experience

---

# 📺 Live Page

A dedicated page for initiating and managing live matches.

### Features:

* Start a new match
* Resume ongoing matches

<img width="1060" height="2169" alt="Screenshot_20260502-164033" src="https://github.com/user-attachments/assets/23390920-1edc-4d10-84d0-a1b40e9205c0" />


---

# 👥 Teams & Players Management Page

This section allows full CRUD operations for teams and players.

### Features:

* Add new teams
* Edit existing teams
* Delete teams
* Add players to teams
* Modify player names

<img width="1077" height="2178" alt="Screenshot_20260502-164044" src="https://github.com/user-attachments/assets/58c185cf-4d29-4bb5-9a1c-734fd72ec19b" />
<img width="1073" height="1976" alt="Screenshot_20260502-164057" src="https://github.com/user-attachments/assets/677a4cdc-2d6d-430d-9b31-0d9488e75284" />


---

# 📈 Statistics Page

A comprehensive analytics dashboard for performance tracking.

### Sections:

#### 🏆 Team Performance

* Teams ranked by number of wins

#### 🔥 Top Scorers

* Players with highest total runs

#### 🎯 Top Bowlers

* Players with most wickets

#### 💥 Boundary Stats

* Most Fours
* Most Sixes

<img width="1080" height="4194" alt="Screenshot_20260502-164130" src="https://github.com/user-attachments/assets/d0ab875c-f317-4bda-a252-f3ac602f39a8" />


---

# ⚙️ Settings Page

A simple customization page.

### Features:

* Toggle between:

  * 🌙 Dark Mode
  * ☀️ Light Mode

<img width="1077" height="2171" alt="Screenshot_20260502-164140" src="https://github.com/user-attachments/assets/9b82f32a-0882-4fea-9142-bb69634a69b3" />


---

# 🛠️ Technologies Used

* **Frontend:** React.js
* **State Management:** React Hooks / Context API
* **Styling:** CSS / Tailwind (or similar modern styling approach)
* **Data Handling:** Local Storage + Cloud Database Sync
* **Architecture:** Component-based modular design

---

# 📂 Project Highlights

* Designed specifically for **real-world gully cricket use cases**
* Focus on **speed, usability, and practicality**
* Handles full match lifecycle seamlessly
* Scalable for future features like:

  * Online multiplayer scoring
  * Match sharing
  * Advanced analytics

---

# 📎 Future Improvements

* Player profiles with history
* Match sharing via link
* Leaderboards
* Mobile app version

---

# 🙌 Conclusion

This project transforms traditional gully cricket scoring into a structured, fast, and enjoyable digital experience. By combining real-time responsiveness with smart data handling, it provides a practical solution for everyday players.

