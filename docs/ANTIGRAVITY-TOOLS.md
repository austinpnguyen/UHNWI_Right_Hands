# Antigravity Tool Capabilities (AI Operations)

This document outlines the core capabilities and API tools leveraged by the Antigravity AI assistant to autonomously execute tasks within the UHNWI+ Right Hands enterprise framework.

## 1. File & Code Editing (Overhead Execution)
- **`write_to_file`**: Creates new files (code, markdown, scripts) from scratch.
- **`replace_file_content`**: Replaces specific contiguous code blocks accurately without breaking files.
- **`multi_replace_file_content`**: Edits multiple non-contiguous locations within a single large file concurrently.

## 2. Directory & Path Intelligence
- **`view_file`**: Reads active file content up to 800 lines into memory.
- **`list_dir`**: Explores directory structures (returns JSON representations of file types, sizes, and depth).
- **`find_by_name`**: Blazing fast global workspace search for filenames (similar to `fd`).
- **`grep_search`**: Global text and regex search through codebases to find variables, functions, or keywords (similar to `ripgrep`).

## 3. Terminal & System Execution
- **`run_command`**: Spawns actual shell commands (`git`, `npm`, `python3`, `make`) within the macOS `sandbox-exec` environment.
- **`command_status`**: Polls the asynchronous output of long-running terminal tasks.
- **`read_terminal`**: Captures raw terminal STDOUT/STDERR logs.
- **`send_command_input`**: Sends Y/N interactions or interrupts (`Ctrl+C`) to running terminal processes.

## 4. Web & OS Interaction
- **`browser_subagent`**: Spawns an ephemeral sub-AI that controls a headless Chrome instance. It visually navigates, clicks, types, and verifies web interfaces for QA or performs deep research. Includes automated video recording.
- **`search_web`**: Conducts rapid Google searches for real-time external intelligence.
- **`read_url_content`**: Scrapes raw HTML and converts it into pure Markdown format for documentation extraction.

## 5. Visual Generation
- **`generate_image`**: Invokes visual models to design UI/UX mockups, brand assets, or application layouts without needing external software.

## 6. Project Orchestration (MCP)
- **`task_boundary`**: Builds the interactive task checklist UI to keep the UHNWI (Founder) updated on execution architecture progress.
- **`notify_user`**: The core ping system used to halt autonomous action and request final executive approval.
