# Updates

## Overview
This section explains how updates are delivered and how to check for updates.

## How Updates Are Delivered
- **Manual Updates**: The application does not currently support automatic updates. Users must manually update the application.

## How to Check for Updates
- **GitHub Releases**: Check the project's GitHub repository for the latest releases.
  - Visit the repository: [https://github.com/your-repo/prompt-workstation](https://github.com/your-repo/prompt-workstation)
  - Navigate to the **Releases** section to view the latest updates.

## Manual Update Procedure
1. **Download the Latest Release**:
   - Visit the GitHub repository and download the latest release for your platform.

2. **Replace the Application Files**:
   - Replace the existing application files with the newly downloaded files.

3. **Restart the Application**:
   - Launch the updated application to ensure everything works correctly.

## What Happens During an Update
- **Application Files**: The application files are replaced with the latest version.
- **User Data**: User-created prompts and settings are preserved in the SQLite database.

## Whether User Data Is Preserved
- **Yes**: User data is preserved during manual updates. Ensure you back up the SQLite database before updating if you want an additional layer of security.

## How to Determine the Installed Version
- **Application UI**: The current version of the application is displayed in the UI.
- **Command Line**: You can also check the version by running the following command in the terminal:
  ```bash
  npm run tauri info
  ```

---