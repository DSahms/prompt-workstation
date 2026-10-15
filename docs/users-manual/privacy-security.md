# Privacy and Security

## Overview
This section explains the privacy and security considerations for Prompt Workstation.

## What Information Leaves the Computer
- **LLM Endpoint Communication**: When using an LLM endpoint, the application sends prompts and receives responses. This communication occurs over the network and is dependent on the endpoint's security practices.

## What External Services Receive Information
- **LLM Endpoints**: The application communicates with external LLM endpoints (e.g., `freellm`, `koboldcpp`).
  - **freellm**: Uses the provided base URL and API key.
  - **koboldcpp**: Uses the provided base URL.

## Authentication
- **API Key**: The application uses an API key for authenticating with the `freellm` endpoint. Ensure the API key is kept secure.

## Local Storage
- **SQLite Database**: User-created prompts and settings are stored locally in an SQLite database. This data is not transmitted to external services.

## Encryption
- **No Encryption**: The application does not encrypt data at rest or in transit by default. Ensure you use secure LLM endpoints if sensitive data is involved.

## Backups
- **Manual Backups**: Users are responsible for manually backing up the SQLite database file to ensure their prompts and settings are preserved.

## Permissions
- **Local File Access**: The application requires access to local files for importing and exporting prompts.
- **Network Access**: The application requires network access to communicate with LLM endpoints.

## Sensitive Information Considerations
- **API Keys**: Ensure API keys are kept secure and not shared publicly.
- **Prompt Content**: Be cautious when sharing prompts that contain sensitive information.

---