# Uninstallation

## Overview
This section explains how to remove Prompt Workstation from your system.

## How to Uninstall
### Windows
1. **Close the Application**:
   - Close all instances of Prompt Workstation.

2. **Uninstall via Windows Settings**:
   - Press `Win + S` to open the search bar.
   - Type `Apps & features` and open the app.
   - Find Prompt Workstation in the list and click **Uninstall**.

3. **Delete Application Files**:
   - Navigate to `%APPDATA%	auriesources	auri-store` and delete the folder.
   - Delete the desktop shortcut if you created one manually.

### macOS
1. **Close the Application**:
   - Close all instances of Prompt Workstation.

2. **Uninstall via macOS Settings**:
   - Open **Finder** and go to **Applications**.
   - Drag Prompt Workstation from the Applications folder to the Trash.

3. **Delete Application Files**:
   - Navigate to `~/Library/Application Support/tauri` and delete the folder.
   - Delete the dock icon if you created one manually.

### Linux
1. **Close the Application**:
   - Close all instances of Prompt Workstation.

2. **Uninstall via Linux Package Manager**:
   - If installed via a package manager, use the appropriate command to remove the package.
   - Alternatively, manually delete the application files.

3. **Delete Application Files**:
   - Navigate to `~/.config/tauri` and delete the folder.
   - Delete the application menu entry if you created one manually.

## What Happens to Application Files
- The application files and temporary files are removed during uninstallation.

## What Happens to User Data
- **User-created prompts and settings are not automatically deleted**.
  - Ensure you back up the SQLite database file (`tauri.db`) before uninstalling.

## Whether Settings Remain
- **No**: Settings and configuration files are removed during uninstallation.

## Whether the User Should Back Anything Up First
- **Yes**: It is recommended to back up the SQLite database file before uninstalling the application to ensure your prompts and settings are preserved.

---