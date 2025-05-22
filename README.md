![Player illustration](/public/illustration.png)
# Spotify Playback Controller [- try on my website](https://adrien.schndr.pro/spotify-player/)
A sleek and modern web application built with React and Material-UI (Material Design 3) that allows you to control your Spotify playback (pause, play, skip previous, skip next) and display the currently playing song. This project leverages a secure serverless function on Val Town to handle Spotify API authentication.
## ✨ Features
- **Display Current Song:** Shows the name, artist(s), and album art of the track currently playing on your active Spotify device.
- **Play/Pause Toggle:** A single button to seamlessly switch between playing and pausing your music.
- **Skip Tracks:** Buttons to easily skip to the next or previous song.
- **Automatic Updates:** Periodically polls the Spotify API to keep the displayed song information and playback state in sync with your Spotify client.
- **Material Design 3:** Styled with Material-UI for a modern, clean, and responsive user interface.
- **Secure Authentication:** Utilizes a Val Town serverless function to securely handle Spotify API credentials and refresh tokens, keeping them out of your client-side code.

## 🚀 Technologies Used
- **Frontend:**
  - [React](https://react.dev) (with TypeScript)
  - [Vite](https://vitejs.dev) (for fast development and bundling)
  - [Material-UI (MUI)](https://mui.com) (for Material Design 3 components and styling)
- **Backend:**
  - [Val Town](https://www.val.town/) (Serverless function for secure Spotify token retrieval)
  - [Spotify Web API](https://developer.spotify.com/documentation/web-api/)

## 📋 Prerequisites

Before you begin, ensure you have the following installed and set up:
- **Node.js** (LTS version recommended)
- **npm or Yarn** (Node.js package manager)
- **Git**
- **GitHub Account**
- **Spotify Developer Account:**
  - Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
  - Create a new application.
  - Note down your `Client ID` and `Client Secret`.
  - Under "Edit Settings" for your app, add a "Redirect URI". For local development, `http://localhost:3000/callback` (or your preferred local callback URL) is common. For production, this would be your deployed frontend URL.
- **OAuth 2.0 Authorization Code Flow with Refresh Token:** You will need to perform the initial authorization flow (e.g., using a tool like [Spotify's Authorization Guide](https://developer.spotify.com/documentation/web-api/tutorials/code-flow) or a simple script) to obtain a `refresh_token`. This `refresh_token` is crucial for your Val Town function to get new access tokens without requiring the user to re-authenticate constantly.
- **Required Spotify API Scopes:** Ensure your authorization flow requests the following scopes:
  - `user-modify-playback-state` (essential for controlling playback)
  - `user-read-playback-state` (for reading current state)
  - `user-read-currently-playing` (for getting song details)

## ⚙️ Setup

This project consists of two main parts: a Val Town serverless backend and a React frontend.

### 1. Val Town Backend Setup

This Val Town function will securely retrieve your Spotify access token using your `client_id`, `client_secret`, and `refresh_token`.

1. **Create a New Val:**
    - Go to Val Town and log in.
    - Click on "New Val".
2. **Paste Backend Code:**
    - Copy the code from the [web.tsx](https://github.com/adrien-schndr/spotify-player/blob/main/src/web.tsx) file.
    - Paste it into your new Val.
3. **Set Val Type to HTTP:**
    - In the Val Town dashboard for this Val, ensure its type is set to **HTTP**.

4. **Set Environment Variables:**
    - In the Val Town dashboard for this Val, go to the "Environment Variables" section.
    - Add the following variables with your Spotify credentials:
      - `client_id`: Your Spotify Application Client ID.
      - `client_secret`: Your Spotify Application Client Secret.
      - `refresh_token`: The refresh token obtained from your initial Spotify OAuth flow.
    - **Important:** These variables are sensitive and should never be hardcoded in your Val's code.
5. **Note Your Val URL:**
    - After saving, Val Town will provide a unique URL for your Val (e.g., `https://<your-username>.val.town/<your-val-name>`). Copy this URL; you'll need it for the frontend.

### Frontend Setup

This is your React application that will interact with your Val Town backend and the Spotify Web API.

1. **Clone the Repository (or create a new project):**
    ```sh
    git clone https://github.com/adrien-schndr/spotify-player.git
    cd spotify-player
    ```
2. **Install dependencies:**
    ```sh
    npm install
    # OR
    yarn install
    ```
3. **Create .env File:**
    - In the root directory of your frontend project (where `package.json` is), create a file named `.env`.
    - Add your Val Town API URL to it:
      ```
      VITE_SPOTIFY_TOKEN_API_URL=https://<your-username>.val.town/<your-val-name>
      ```
      **Replace** `https://<your-username>.val.town/<your-val-name>` with the actual URL you noted from Val Town.
    - **Important:** Add `.env` to your `.gitignore` file to prevent it from being committed to version control.

## ▶️ Running the Application

1. **Ensure Val Town is Running:** Make sure your Val Town function is deployed and accessible.

2. **Start Frontend Development Server:**
    - Open your terminal in the root of your frontend project.
    - Run:
      ```
      npm run dev
      # OR
      yarn dev
      ```
    - Your application will typically open in your browser at http://localhost:5173 (Vite default).
3. **Active Spotify Device:** For the playback controls to work, you must have the Spotify desktop application, mobile app, or web player open and actively playing or paused on a device. The Spotify Web API controls an active device.