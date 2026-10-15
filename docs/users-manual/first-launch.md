# First Launch

## Overview
After installing Prompt Workstation, this section guides you through the first launch experience.

## What Happens on First Launch

### Initial Setup
1. **Catalog Seeding**:
   - The application automatically seeds the local SQLite database with starter prompts. This ensures you have a starting point for your prompts.
   - Starter prompts include:
     - **Rust CLI Tool Builder**: A template for generating a Rust CLI tool.
     - **Technical Blog Post Outline**: A template for creating a structured outline for a technical blog post.
     - **System Architecture Review**: A template for reviewing an architecture diagram and producing a risk assessment.

2. **Default Configuration**:
   - The application loads default LLM settings for `freellm` with a local endpoint (`http://127.0.0.1:31415/v1`).
   - Ensure your local LLM service is running if you want to use these defaults.

### UI Overview
- The application opens to the main dashboard with a sidebar on the left and a main content area on the right.
- The sidebar contains navigation options for:
  - **Catalog**: Browse and manage prompts.
  - **Favorites**: View your favorite prompts.
  - **Triage**: Run the triage engine to categorize and refine prompts.
  - **Settings**: Configure LLM endpoints and application settings.

### Starting Your Work
1. **Open the Catalog View**:
   - Click the **Catalog** option in the sidebar to view and manage your prompts.
   - You will see a list of starter prompts and any prompts you have added.

2. **Edit a Prompt**:
   - Click on a prompt to open its details.
   - Modify the prompt title, description, and content.
   - Click **Save** to update the prompt.

3. **Mark as Favorite**:
   - Click the favorite icon next to a prompt to mark it as a favorite.

### Verify Application Functionality
- Ensure that prompts are saved correctly and that the UI updates reflect your changes.
- Test the LLM integration by navigating to the **Settings** view and clicking the **Test Chat** button to verify the active endpoint.

---