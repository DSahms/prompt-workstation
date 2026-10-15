# Settings

## Overview
The Settings section allows you to configure LLM endpoints and application settings for Prompt Workstation.

## LLM Endpoints

### What It Controls
The LLM endpoints section allows you to configure the base URL, API key, and model for the `freellm` and `koboldcpp` endpoints.

### Default Value
- **freellm Base URL**: `http://127.0.0.1:31415/v1`
- **freellm API Key**: `freellmapi-2b17fe48864ac41d5db3c181a0332bd0275556e58e8ae16a`
- **freellm Model**: `gpt-4o-mini`
- **koboldcpp Base URL**: `http://127.0.0.1:5001/v1`
- **koboldcpp Model**: `koboldcpp/gemma-4-E4B-it-Q8_0`
- **Active Endpoint**: `freellm`

### When You Would Change It
- To configure a different LLM endpoint for generating and refining prompts.
- To change the active endpoint for testing chat functionality.

### Recommended Value
- Ensure the base URL and API key are correct for the LLM endpoint you want to use.

### What Effect Changing It Has
- Changes the LLM endpoint configuration and active endpoint.
- Affects the chat functionality and prompt generation.

### Does Changing It Require Restarting the Application?
- No, changes to the LLM endpoints are applied immediately.

### Privacy / Security
- LLM endpoints are configured locally and used for generating and refining prompts.
- No sensitive data is transmitted to external services.

---

## Application Settings

### What It Controls
The application settings section allows you to configure general application settings.

### Default Value
- No specific default values are provided for general application settings.

### When You Would Change It
- To customize the application behavior and appearance.

### Recommended Value
- Configure settings based on your preferences and requirements.

### What Effect Changing It Has
- Changes the application behavior and appearance.

### Does Changing It Require Restarting the Application?
- No, changes to the application settings are applied immediately.

### Privacy / Security
- Application settings are stored locally and do not affect privacy or security.

---