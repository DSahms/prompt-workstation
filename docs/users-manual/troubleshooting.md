# Something Went Wrong

## Overview
This section provides guidance on diagnosing and resolving common issues in Prompt Workstation.

## What You See
Describe the visible symptoms of the issue you are encountering. For example:
- The application crashes on startup.
- Prompts are not saved.
- The LLM endpoint is unresponsive.
- The UI freezes or becomes unresponsive.

## What It Probably Means
Provide a plain explanation of the likely cause of the issue.

## Check This First
Provide the simplest diagnostic action.

## Fix It
Provide exact user steps to resolve the issue.

## Why That Works
Give a short explanation of why the steps resolve the issue.

## Still Broken?
Provide the next appropriate step.

--- 

### Issue: Application Crashes on Startup

#### What You See
- The application fails to launch or crashes immediately after opening.

#### What It Probably Means
- The application may not have the required dependencies installed or may have encountered an error during initialization.

#### Check This First
- Ensure you have installed Rust and Node.js as prerequisites.
- Verify that all dependencies are installed by running:
  ```bash
  npm install
  ```

#### Fix It
1. **Reinstall Dependencies**:
   - Run the following command to reinstall dependencies:
     ```bash
     npm install
     ```

2. **Rebuild the Application**:
   - Run the following command to rebuild the application:
     ```bash
     npm run build
     ```

3. **Run the Application in Development Mode**:
   - Launch the application using:
     ```bash
     npm run tauri dev
     ```

#### Why That Works
- Reinstalling dependencies ensures all required packages are correctly installed.
- Rebuilding the application ensures the application is built with the latest dependencies.

#### Still Broken?
- If the issue persists, check the Tauri logs for detailed error messages.
- Ensure your local LLM services (`freellm` and `koboldcpp`) are running if you are using them.

--- 

### Issue: Prompts Are Not Saved

#### What You See
- Prompts are not saved after editing or creating them.

#### What It Probably Means
- The database connection may be failing, or there may be an issue with the prompt data.

#### Check This First
- Verify that the database connection is active by checking the logs.
- Ensure the prompt data is valid and correctly formatted.

#### Fix It
1. **Verify Database Connection**:
   - Check the logs for any errors related to the database connection.

2. **Manually Test Prompt Saving**:
   - Open the application and manually save a prompt to ensure the prompt data is valid.

3. **Restart the Application**:
   - Restart the application to clear any temporary issues.

#### Why That Works
- Ensuring the database connection is active allows prompts to be saved correctly.
- Valid prompt data ensures the prompt is saved successfully.

#### Still Broken?
- If the issue persists, check the database logs for detailed errors.
- Ensure the prompt content does not contain invalid characters or formatting.

--- 

### Issue: LLM Endpoint Unresponsive

#### What You See
- The LLM endpoint is unresponsive, and chat functionality fails.

#### What It Probably Means
- The LLM service may not be running, or the endpoint configuration is incorrect.

#### Check This First
- Ensure the LLM service (`freellm` or `koboldcpp`) is running.
- Verify the base URL and API key for the active endpoint are correct.

#### Fix It
1. **Check LLM Service Status**:
   - Ensure the LLM service is running by checking its logs or process manager.

2. **Configure the LLM Endpoint**:
   - Go to the **Settings** view and configure the correct base URL and API key for the active endpoint.

3. **Test Chat Functionality**:
   - Use the **Test Chat** button to verify the LLM endpoint is active and responsive.

#### Why That Works
- Ensuring the LLM service is running allows the endpoint to respond correctly.
- Correct configuration of the endpoint ensures the chat functionality works.

#### Still Broken?
- If the issue persists, check the LLM service logs for detailed error messages.
- Ensure the API key is valid and not expired.

--- 

### Issue: UI Freezes or Unresponsive

#### What You See
- The application UI freezes or becomes unresponsive.

#### What It Probably Means
- The application may be stuck on a background task or there may be a resource issue.

#### Check This First
- Check the Tauri logs for any errors or warnings.
- Ensure there are no long-running background tasks that could cause the UI to freeze.

#### Fix It
1. **Close and Reopen the Application**:
   - Close the application and reopen it to clear any temporary issues.

2. **Check Logs for Errors**:
   - Look for any errors or warnings in the Tauri logs.

3. **Restart the Application**:
   - If the issue persists, restart the application to ensure all resources are cleared.

#### Why That Works
- Closing and reopening the application can resolve temporary issues.
- Checking logs helps identify and resolve underlying errors.

#### Still Broken?
- If the issue persists, consider reducing the number of open tabs or background tasks.
- Ensure there are no memory leaks or resource constraints.

---