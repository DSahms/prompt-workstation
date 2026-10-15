# Major Features

## Overview
Prompt Workstation offers several key features to help you create, manage, and triage prompts effectively.

## Prompt Catalog

### What It Does
The Prompt Catalog allows you to create, edit, save, and delete prompts. You can also import and export prompts as Markdown files and mark prompts as favorites.

### Why You Would Use It
- To organize and manage your prompts in a structured catalog.
- To import and export prompts for sharing and collaboration.
- To mark important prompts as favorites for quick access.

### How to Use It
1. **Navigate to the Catalog View**:
   - Click the **Catalog** option in the sidebar.

2. **Create a New Prompt**:
   - Click the **New Prompt** button.
   - Enter the prompt title, description, and content.
   - Select the domain (e.g., Code, Writing, Planning, Architecture).
   - Add tags to categorize the prompt.
   - Click **Save** to add the prompt to the catalog.

3. **Edit a Prompt**:
   - Click on a prompt to open its details.
   - Modify the prompt title, description, and content.
   - Click **Save** to update the prompt.

4. **Delete a Prompt**:
   - Click the delete icon next to a prompt.
   - Confirm the deletion.

5. **Import a Prompt**:
   - Click the **Import** button.
   - Select a Markdown file containing the prompt.
   - The prompt will be added to the catalog.

6. **Export a Prompt**:
   - Click the export icon next to a prompt.
   - Choose a location to save the Markdown file.

7. **Mark as Favorite**:
   - Click the favorite icon next to a prompt to mark it as a favorite.

### What You Should See
- A list of prompts in the catalog.
- Details of the selected prompt, including title, description, and content.

### What Happens Next
- The prompt is saved to the local SQLite database.
- The catalog updates to reflect the changes.

### What Can Go Wrong
- **Failed to Save Prompt**: Ensure the database connection is active and the prompt data is valid.
- **Failed to Import Prompt**: Ensure the Markdown file is correctly formatted.

### What Does This Terminology Mean?
- **Domain**: The category or area of expertise for the prompt (e.g., Code, Writing, Planning, Architecture).
- **Tags**: Keywords or phrases that categorize the prompt.

### Privacy / Security
- Prompts are stored locally in an SQLite database.
- No sensitive data is transmitted to external services.

---

## Triage Engine

### What It Does
The Triage Engine categorizes prompts into domains and complexity levels, and refines them to ensure they are ready for use.

### Why You Would Use It
- To categorize and refine prompts for better organization and clarity.
- To ensure prompts are complete and ready for use.

### How to Use It
1. **Navigate to the Triage View**:
   - Click the **Triage** option in the sidebar.

2. **Run Level 1 Triage**:
   - Enter the prompt content in the input field.
   - Click **Run Level 1** to categorize the prompt into a domain and complexity level.

3. **Run Level 3 Triage**:
   - Answer the questions provided by the triage engine to refine the prompt.
   - Click **Run Level 3** to generate a final prompt.

### What You Should See
- The categorized domain and complexity level of the prompt.
- Questions to refine the prompt.
- The final refined prompt.

### What Happens Next
- The prompt is categorized and refined based on the answers provided.
- The final prompt is ready for use.

### What Can Go Wrong
- **Failed to Categorize Prompt**: Ensure the prompt content is valid and the LLM endpoint is active.
- **Failed to Refine Prompt**: Ensure the answers provided are clear and complete.

### What Does This Terminology Mean?
- **Domain**: The category or area of expertise for the prompt (e.g., Code, Writing, Planning, Architecture).
- **Complexity Level**: The level of detail and refinement required for the prompt.

### Privacy / Security
- Prompts are processed locally using the LLM endpoint.
- No sensitive data is transmitted to external services.

---

## LLM Integration

### What It Does
The LLM Integration allows you to configure and test LLM endpoints for generating and refining prompts.

### Why You Would Use It
- To configure and test LLM endpoints for generating and refining prompts.
- To ensure the LLM endpoint is active and responsive.

### How to Use It
1. **Navigate to the Settings View**:
   - Click the **Settings** option in the sidebar.

2. **Configure LLM Endpoints**:
   - Enter the base URL and API key for the `freellm` endpoint.
   - Enter the base URL for the `koboldcpp` endpoint.
   - Select the active endpoint.

3. **Test Chat Functionality**:
   - Click the **Test Chat** button to verify the active endpoint.
   - Enter a test message and click **Send** to test the chat functionality.

### What You Should See
- The configured LLM endpoints and settings.
- The test chat interface with the response from the LLM endpoint.

### What Happens Next
- The LLM endpoint is configured and tested.
- The chat functionality is verified.

### What Can Go Wrong
- **Failed to Configure LLM Endpoint**: Ensure the base URL and API key are correct.
- **Failed to Test Chat Functionality**: Ensure the LLM endpoint is active and responsive.

### What Does This Terminology Mean?
- **LLM Endpoint**: The URL and API key for the LLM service.
- **API Key**: The authentication key for the LLM service.

### Privacy / Security
- LLM endpoints are configured locally and used for generating and refining prompts.
- No sensitive data is transmitted to external services.

---