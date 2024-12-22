# RCA Academy Extension

## Overview
This project is a browser extension designed specifically for use with the RCA Academy platform hosted on `www.skool.com`. It provides tools and features tailored to enhance the user experience under the `reaction-channel-academy` path. The current version includes functionality for managing spoilers for images, but future updates will expand to include additional features.

---

## Features
- **Image Spoiler Management:** Users can mark specific images as spoilers, hiding them for everyone, and toggle visibility using a button overlay on each image.
- **Dynamic Content Handling:** The extension detects newly loaded images (e.g., from scrolling or navigation) and processes them automatically.
- **Confirmation Modal:** A modal prompts users to confirm before changing a spoiler's status.
- **URL Normalization:** Ensures consistent URL comparisons when checking against the server database.

---

## How It Works
1. **Initialization:**
   - On page load or navigation, the extension checks if the user is on the correct host (`www.skool.com`) and path (`reaction-channel-academy`).
   - If valid, it fetches the latest data from the server and initializes image processing logic.

2. **Image Processing:**
   - Images in the DOM are scanned, normalized, and checked against the server database.
   - A toggle button is added to each image, allowing users to mark/unmark spoilers.

3. **Content Updates:**
   - The extension detects newly added images and dynamically updates them based on the server database.

4. **Future Expansion:**
   - Planned features include additional tools for community management, content moderation, and enhanced analytics for RCA Academy users.

---

## API Endpoints
- **GET `/api/spoilers`**
  - Fetches all currently marked spoiler URLs.
  - Response format: `[{ "url": "<image-url>" }, ...]`

- **POST `/api/spoilers`**
  - Toggles the spoiler state of a given URL.
  - Request body: `{ "url": "<normalized-image-url>" }`
  - Response format: `{ "data": [{ "url": "<image-url>" }, ...] }`

---

## Code Structure
### Key Functions
- **`normalizeUrl(url)`**
  - Ensures consistency in URL formatting by enforcing HTTPS, removing query parameters and hash fragments, and converting to lowercase.

- **`isSpoilerUrl(url)`**
  - Checks if a given URL is marked as a spoiler by comparing against the fetched data.

- **`fetchSpoilerData()`**
  - Fetches the current list of spoilers from the server.

- **`toggleSpoiler(url)`**
  - Sends a request to toggle the spoiler state for a specific URL and updates the local cache.

- **`processImages()`**
  - Scans all images on the page, normalizes their URLs, and adds toggle buttons based on their spoiler state.

- **`setupMutationObserver()`**
  - Monitors the DOM for dynamically added content and reprocesses images as necessary.

- **`watchUrlChanges()`**
  - Detects SPA navigation or URL changes and reinitializes the extension if needed.

### Event Listeners
- **Click Event on Toggle Button:**
  - Triggers the spoiler toggle logic and displays the confirmation modal.
- **MutationObserver:**
  - Detects newly added images or DOM changes.
- **URL Change Detection:**
  - Handles navigation in single-page applications (SPAs).

---

## Installation
1. Clone the repository.
   ```bash
   git clone <repository-url>
   ```
2. Open your browser and navigate to the extensions page.
   - For Chrome: `chrome://extensions/`
   - For Firefox: `about:addons`
3. Enable developer mode (if applicable).
4. Load the extension as an unpacked extension from the cloned directory.

---

## Usage
1. Navigate to `https://www.skool.com/reaction-channel-academy`.
2. Current functionality includes:
   - **Spoiler Toggle:**
     - **Eye Icon (Open):** Indicates the image is currently marked as a spoiler.
     - **Eye Icon (Slashed):** Indicates the image is not marked as a spoiler.
     - Click the button to toggle the spoiler state. A confirmation modal will appear.
     - Confirm the action to update the spoiler state for all users.

---

## Debugging
Enable debugging by viewing the browser console:
- Look for `[DEBUG]` messages to trace image processing, URL normalization, and API interactions.
- Key areas to check:
  - **URL Normalization:** Ensure URLs are correctly normalized before comparison.
  - **API Responses:** Verify the server returns the expected format.

---

## Future Improvements
- **Expanded Features:**
  - Add tools for community moderation and user analytics.
  - Introduce content tagging and categorization options.
  - Provide enhanced customization options for users and admins.
- **Better Error Handling:**
  - Display user-friendly messages for API errors or network issues.
- **Batch Updates:**
  - Enable batch updates for multiple images or posts.

---

## Contributing
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and open a pull request.

---

## License
This project is licensed under the MIT License.

## Buy Me a Coffee
If you'd like to help a brother out, feel free to buy me a cup of coffee :) 
buymeacoffee.com/evansoasis
