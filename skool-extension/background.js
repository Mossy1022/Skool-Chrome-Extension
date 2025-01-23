chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openUsersInBatches') {
      const { userIds, batchSize } = request.payload; // e.g., ["@evansoasis","@someoneelse"]
      const actualBatchSize = batchSize || 10;
  
      // Construct subscribe URLs:
      // e.g. https://www.youtube.com/@evansoasis?sub_confirmation=1
      // but we won't even need this array if we store userIds and convert on the fly:
      //  - We'll skip a separate subscribeUrls array and just do it on the fly below.
  
      // 1) Grab previously opened from extension storage
      chrome.storage.local.get(['openedUsers'], (result) => {
        const opened = result.openedUsers || []; // userId strings already opened
        // 2) Filter out any duplicates
        const newUsers = userIds.filter(u => !opened.includes(u));
  
        if (!newUsers.length) {
          console.log("All user handles have already been opened.");
          sendResponse({ success: true, message: "All user handles previously opened." });
          return;
        }
  
        // 3) Open in batches
        openInBatches(newUsers, actualBatchSize, opened)
          .then(() => sendResponse({ success: true }))
          .catch(err => {
            console.error("Error opening user handles in batches:", err);
            sendResponse({ success: false, error: err.toString() });
          });
      });
      return true; // For async response
    }
  });
  
  async function openInBatches(userIds, batchSize, openedSoFar) {
    let idx = 0;
    while (idx < userIds.length) {
      const batch = userIds.slice(idx, idx + batchSize);
      for (const userId of batch) {
        await new Promise((resolve) => {
          const url = `https://www.youtube.com/${userId}?sub_confirmation=1`;
          chrome.tabs.create({ url, active: false }, () => {
            // Mark as opened
            openedSoFar.push(userId);
            // Persist in storage so we know it for next time
            chrome.storage.local.set({ openedUsers: openedSoFar }, () => {
              setTimeout(resolve, 200); // short delay
            });
          });
        });
      }
      idx += batchSize;
  
      // Wait or user-confirm between batches
      console.log(`Opened batch of ${batch.length}; waiting 5s...`);
      await delay(5000);
    }
  }
  
  function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
  }