# Data, Files, and Storage

## Overview
This section explains where user-created files and data are stored, how to back them up, and what happens when the application is uninstalled.

## Where User-Created Files Are Stored
- **Prompts**: User-created prompts are stored in an SQLite database located in the app's local data directory.
  - **Windows**: `%APPDATA%	auriesources	auri-store	auri.db`
  - **macOS**: `~/Library/Application Support/tauri/resources/tauri-store/tauri.db`
  - **Linux**: `~/.config/tauri/resources/tauri-store/tauri.db`

## Where Exported Files Go
- **Markdown Files**: When you export a prompt as a Markdown file, it is saved to the location you specify.

## Backup Locations
- **Database Backup**: You can manually back up the SQLite database by copying the `tauri.db` file to a secure location.
  - **Steps to Backup**:
    1. Locate the SQLite database file as described above.
    2. Copy the file to a backup location on your computer.
    3. Ensure the backup file is stored securely.

## Import Locations
- **Markdown Files**: You can import prompts by selecting a Markdown file from your local storage.

## Configuration Storage
- **Settings**: Application settings, including LLM endpoint configurations, are stored in memory and persist between sessions.

## Cache Behavior
- **Temporary Cache**: The application uses a temporary cache for LLM responses and other intermediate data. This cache is cleared when the application is closed.

## Logs When the User May Need Them
- **Application Logs**: Logs are generated during application runtime and can be useful for troubleshooting.
  - **Location**: Logs are typically stored in the application's data directory.

## What Happens When the Application Is Uninstalled
- **Application Files**: The application files and temporary files are removed.
- **User Data**: User-created prompts and settings are **not** automatically deleted. You can manually back up the SQLite database before uninstalling.

## Whether Uninstalling Removes User Data
- **No**: Uninstalling the application does not remove user data unless you manually delete the SQLite database file.

## Whether the User Should Back Anything Up First
- **Yes**: It is recommended to back up the SQLite database file before uninstalling the application to ensure your prompts and settings are preserved.

---