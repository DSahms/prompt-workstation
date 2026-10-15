# Get Started / Installation

## Overview
Prompt Workstation is a local prompt generation engine and catalog workstation. It allows you to create, manage, and triage prompts for various domains such as code, writing, planning, and architecture.

This section guides you through the installation process.

## Installation

### Prerequisites
Before installing Prompt Workstation, ensure you have the following:

- **Rust**: Install the latest version of Rust from [rust-lang.org](https://www.rust-lang.org/tools/install).
- **Node.js**: Install Node.js (version 18 or later) from [nodejs.org](https://nodejs.org/).

### Installation Methods

#### Method 1: Using Tauri CLI
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-repo/prompt-workstation.git
   cd prompt-workstation
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Application**:
   ```bash
   npm run build
   ```

4. **Run the Application**:
   ```bash
   npm run tauri dev
   ```
   This will launch the application in development mode.

5. **Build for Production**:
   ```bash
   npm run build
   ```
   This will generate a production-ready binary in the `dist` folder.

6. **Launch the Application**:
   - On **Windows**: Navigate to the `dist` folder and run `prompt-workstation.exe`.
   - On **macOS**: Navigate to the `dist` folder and run `prompt-workstation`.
   - On **Linux**: Navigate to the `dist` folder and run `./prompt-workstation`.

#### Method 2: Manual Build
If you prefer to build the application manually:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-repo/prompt-workstation.git
   cd prompt-workstation
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Application**:
   ```bash
   npm run build
   ```

4. **Run the Application**:
   - Use the Tauri CLI to run the application:
     ```bash
     npm run tauri dev
     ```

### Installation Path
- The application will be installed in your local data directory, typically at:
  - **Windows**: `%APPDATA%	auriesources	auri-store`
  - **macOS**: `~/Library/Application Support/tauri/resources/tauri-store`
  - **Linux**: `~/.config/tauri/resources/tauri-store`

### Launching the Application
- After installation, launch the application from your desktop shortcut or via the command line.

### First Launch
- On first launch, the application will seed the catalog with starter prompts. This ensures you have a starting point for your prompts.

### Verifying Installation
- Open the application and check that the UI loads correctly. You should see the main dashboard with prompts and settings options.

### Uninstallation
- To uninstall the application, follow the platform-specific instructions below:

  - **Windows**: Use the standard Windows uninstaller or delete the application files from `%APPDATA%	auriesources	auri-store` and the desktop shortcut.
  - **macOS**: Use the standard macOS uninstaller or delete the application files from `~/Library/Application Support/tauri` and the dock icon.
  - **Linux**: Use the standard Linux uninstaller or delete the application files from `~/.config/tauri` and the application menu.

---