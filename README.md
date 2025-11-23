# O'Reilly Course Link Extractor

A Node.js tool designed to extract video download links (MP4) and subtitles (VTT) from O'Reilly Learning courses. It interacts with the O'Reilly and Kaltura APIs to generate a structured JSON file containing all course assets.

## Features

- **Full Course Extraction**: Fetches the complete Table of Contents (TOC) for a specific course.
- **Smart Grouping**: Groups videos by chapters for easy organization.
- **Direct Links**: Retrieves direct download links for video files (MP4).
- **Subtitles**: Retrieves English subtitles (VTT) where available.
- **Concurrent Processing**: Uses a configurable concurrency limit (default: 5) to speed up fetching without overwhelming the server.
- **Resumable/Safe**: Checks if the output file exists before writing to prevent accidental overwrites.

## Prerequisites

- **Node.js**: Version 18.0.0 or higher (required for native `fetch` support).
- **O'Reilly Account**: You must have a valid, active subscription to access the content.

## Installation

1. Clone this repository or download the source code.
2. Navigate to the project directory:
   ```bash
   cd oreilly-course-download
   ```
3. No external NPM dependencies are required (this tool uses the standard Node.js library).

## Configuration

### 1. Authentication (`cookies.txt`)

The script requires valid session cookies to authenticate with the O'Reilly API.

1. Log in to [learning.oreilly.com](https://learning.oreilly.com) in your browser.
2. Export your cookies to a **Netscape HTTP Cookie File** format (tab-separated).
   - **Chrome/Firefox**: You can use extensions like "Get cookies.txt LOCALLY".
3. Save the exported file as `cookies.txt` in the root directory of this project.

> **Important:** The script expects the cookie file to be in the standard Netscape format (7 tab-separated columns).

### 2. Course Selection (`index.js`)

Open `index.js` and modify the `COURSE_CONFIG` object at the top of the file to match the course you want to download.

```javascript
const COURSE_CONFIG = {
  ID: "9781805127826", // The ISBN or Course ID found in the URL
  PATH: "modern-javascript-from", // The URL slug of the course
  OUTPUT_FILE: "./data/final.json", // Path where the result will be saved
};
```

**How to find these values:**
If the course URL is: `https://learning.oreilly.com/library/view/modern-javascript-from/9781805127826/`

- **ID**: `9781805127826`
- **PATH**: `modern-javascript-from`

## Usage

Run the script using Node.js:

```bash
node index.js
```

### What happens next?

1. The script reads your `cookies.txt` for authentication.
2. It fetches the course structure (Table of Contents).
3. It iterates through chapters and videos, fetching download links in parallel.
4. Progress is logged to the console (e.g., `Progress: 5/120`).
5. The final result is saved to the path defined in `OUTPUT_FILE`.

> **Note:** If the output file already exists, the script will log "Đã tồn tại files" and **will not** overwrite it. Delete the existing file if you want to regenerate it.

## Output Structure

The output JSON file contains an array of chapters, each with a list of video items:

```json
[
  {
    "chapterTitle": "Chapter 1: Introduction",
    "items": [
      {
        "reference_id": "video-ref-id",
        "kaltura_entry_id": "0_entryid",
        "video": {
          "downloadUrl": "https://cdnapisec.kaltura.com/...",
          "captionEn": "https://cdnapisec.kaltura.com/..."
        }
      }
    ]
  }
]
```

## Disclaimer

This tool is for **educational and personal archiving purposes only**. Please respect the copyright and terms of service of O'Reilly Media. Do not distribute downloaded content.
