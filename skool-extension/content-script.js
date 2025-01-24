(function() {

  // Inject FontAwesome CSS
  const fontAwesomeCSS = chrome.runtime.getURL('css/all.min.css');
  const linkElement = document.createElement('link');
  linkElement.rel = 'stylesheet';
  linkElement.href = fontAwesomeCSS;
  document.head.appendChild(linkElement);
  
  const TARGET_HOST = "www.skool.com";
  const PATH_PREFIX = "/reaction-channel-academy";
  const SPOILER_API_BASE = "https://skool-chrome-extension.onrender.com";

  let isInitialized = false;
  let spoilerData = new Set(); // Initialize as a Set
  let imageObserver = null;
  let urlObserver = null;

  // Check if we're on the correct page
  function isOnReactionChannelAcademy() {
    const url = new URL(window.location.href);
    return (
      url.hostname === TARGET_HOST &&
      url.pathname.startsWith(PATH_PREFIX)
    );
  }

  /***********************************************************
   * Show a modal prompting the user to confirm or cancel.
   ***********************************************************/
  function showSpoilerConfirmationModal(willHide, onConfirm, onCancel) {
    const overlay = document.createElement("div");
    overlay.className = "skool-spoiler-overlay";

    const modal = document.createElement("div");
    modal.className = "skool-spoiler-modal";

    const header = document.createElement("h3");
    header.textContent = willHide
      ? "Mark as a Spoiler?"
      : "Warning!! This has been marked as a spoiler.";
    modal.appendChild(header);

    const infoText = document.createElement("p");
    infoText.textContent = willHide
      ? "This will mark the image as a spoiler for everyone and blur it.  In order to view the image, they will have to click on the post itself from this point on."
      : "Unmarking it will allow everyone to see it!! If you want to see the image and not ruin it for everyone, you can see the image by clicking on the post itself instead.";
    modal.appendChild(infoText);

    const btnContainer = document.createElement("div");
    btnContainer.className = "skool-spoiler-modal-buttons";

    const confirmBtn = document.createElement("button");
    confirmBtn.classList.add("skool-spoiler-confirm-btn");
    confirmBtn.textContent = willHide ? "Yes, let me shield their eyes" : "Remove Spoiler Mark";
    confirmBtn.addEventListener("click", () => {
      cleanupModal();
      onConfirm();
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.classList.add("skool-spoiler-cancel-btn");
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      cleanupModal();
      onCancel?.();
    });

    btnContainer.appendChild(confirmBtn);
    btnContainer.appendChild(cancelBtn);
    modal.appendChild(btnContainer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function cleanupModal() {
      overlay.remove();
    }
  }

  /**********************************************
   * Check if we are on https://www.skool.com/reaction-channel-academy
   **********************************************/
  function isOnReactionChannelAcademy() {
    const url = new URL(window.location.href);
    return (
      url.hostname === TARGET_HOST &&
      url.pathname.startsWith(PATH_PREFIX)
    );
  }

  function onUrlChange() {
    if (!isOnReactionChannelAcademy()) {


      if (isInitialized) {
        cleanupExtension();
        isInitialized = false;
      }
      return;
    }

    if (!isInitialized) {
      initExtension();
      isInitialized = true;
    }

     // Check for dynamic post overlays (e.g., modal pop-ups)
     const postOverlay = document.querySelector('[data-post-id]');
     if (postOverlay) {
       console.log("Post overlay detected!");
       injectUpdateUsersButton(); // Inject the "Update User IDs" button
     }
 
     // Handle specific post pages directly (e.g., /dont-mind-me-2)
     if (window.location.href.includes("dont-mind-me-2")) {
       injectUpdateUsersButton();
     }
  }

  async function initExtension() {
    spoilerData = await fetchSpoilerData();
    processImages();
    setupMutationObserver();
  }

  function cleanupExtension() {
    document.querySelectorAll(".skool-spoiler-button").forEach((btn) => btn.remove());
    document.querySelectorAll(".skool-spoiler-blurred").forEach((img) => {
      img.classList.remove("skool-spoiler-blurred");
    });
    document.querySelectorAll("img[data-spoilerButton]").forEach((img) => {
      img.removeAttribute("data-spoilerButton");
    });
    if (imageObserver) {
      imageObserver.disconnect();
      imageObserver = null;
    }
    if (urlObserver) {
      urlObserver.disconnect();
      urlObserver = null;
    }
  }

  async function fetchSpoilerData() {
    try {
      const res = await fetch(`${SPOILER_API_BASE}/api/spoilers`);
      if (!res.ok) {
        throw new Error(`HTTP error: ${res.status}`);
      }
      const spoilerArray = await res.json(); // Now returns an array of URLs
      return new Set(spoilerArray); // Convert to a Set for efficient lookup
    } catch (err) {
      console.error("[ERROR] fetchSpoilerData:", err);
      return new Set();
    }
  }

  async function toggleSpoiler(url) {
    try {
      const res = await fetch(`${SPOILER_API_BASE}/api/spoilers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json(); // Expecting { message: "Spoiler added" } or { message: "Spoiler removed" }

      // Update the local Set based on the action
      if (data.message === "Spoiler added") {
        spoilerData.add(url);
        return true;
      } else if (data.message === "Spoiler removed") {
        spoilerData.delete(url);
        return false;
      } else {
        console.warn("[WARN] Unexpected response message:", data.message);
        return spoilerData.has(url);
      }
    } catch (err) {
      console.error("[ERROR] toggleSpoiler:", err);
      throw err;
    }
  }

  function processImages() {
    if (!isInitialized) return;

    const images = document.querySelectorAll(".styled__PreviewImageWrapper-sc-vh0utx-21.gUydVb img");

    images.forEach((img) => {
      if (img.dataset.spoilerButton) return;
      img.dataset.spoilerButton = "true";

      const imageUrl = img.src;

      // Create spoiler button
      const btn = document.createElement("button");
      btn.classList.add("skool-spoiler-button");
      if (spoilerData.has(imageUrl)) { // Updated check
        img.classList.add("skool-spoiler-blurred");
        btn.innerHTML = '<i class="fa-regular fa-eye"></i>';
      } else {
        btn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
      }

      // Find the post wrapper element
      const postWrapper = img.closest(".styled__PostItemWrapper-sc-e4ns84-7.bdLLTH");
      if (!postWrapper) return;

      // Check if the post wrapper contains a pinned banner
      const hasPinnedBanner = postWrapper.querySelector(".styled__PinnedPostBanner-sc-vh0utx-2.lictXL");

      // Adjust the button position dynamically based on whether a pinned banner exists
      postWrapper.style.position = "relative";
      btn.style.position = "absolute";

      // Adjust the "top" or "bottom" value based on the pinned state
      if (hasPinnedBanner) {
        // If there's a pinned banner, position the button lower
        btn.style.top = "50px"; // Adjust as needed
        btn.style.right = "17px";
      } else {
        // No pinned banner, position the button closer to the top
        btn.style.top = "15px"; // Adjust as needed
        btn.style.right = "17px";
      }

      // Append the button to the post wrapper
      postWrapper.appendChild(btn);


      // 4) Handle button click => show confirm, toggle spoiler
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const currentlySpoiler = spoilerData.has(imageUrl);
        const willHide = !currentlySpoiler;

        showSpoilerConfirmationModal(
          willHide,
          async () => {
            try {
              const isSpoilerNow = await toggleSpoiler(imageUrl);
              if (isSpoilerNow) {
                img.classList.add("skool-spoiler-blurred");
                btn.innerHTML = '<i class="fa-regular fa-eye"></i>';
              } else {
                img.classList.remove("skool-spoiler-blurred");
                btn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
              }
            } catch (err) {
              console.error("[ERROR] Confirm toggleSpoiler:", err);
            }
          },
          () => {
          }
        );
      });
    });
  }

  // 1) Check if we’re on the specific post URL
  function isOnDontMindMePost() {
    return window.location.href.includes("dont-mind-me-2");
  }

  // 2) Gather user IDs from all comment spans
  function getUserIdsFromComments() {
    // Find all comment wrappers (only comments)
    const commentBubbles = document.querySelectorAll('.styled__CommentItemBubble-sc-1lql1qn-3.eYiPqT');
    
    // Extract the user handles (@UserName) within each comment
    const userIds = Array.from(commentBubbles).map(bubble => {
      // Look for the specific paragraph element within the comment bubble
      const paragraph = bubble.querySelector('.styled__Paragraph-sc-y5pp90-3.eHgPWw');
      return paragraph ? paragraph.textContent.trim() : null;
    }).filter(Boolean); // Remove any null or undefined results
  
    // Optionally remove duplicates
    return Array.from(new Set(userIds));
  }

  // 3) Create the “Update User IDs List” button
  function createUpdateUsersButton() {
    const button = document.createElement("button");
    button.textContent = "Update User IDs List";
    button.style.cursor = "pointer";
    button.style.marginLeft = "8px";
    button.style.padding = "6px 10px";
    button.style.border = "1px solid #ccc";
    button.style.borderRadius = "4px";
    button.style.background = "#fff";
    // Feel free to style more

    // On click, gather user IDs & POST to your server
    button.addEventListener("click", async () => {
      const userIds = getUserIdsFromComments();
      if (!userIds.length) {
        alert("No user IDs found in the comments!");
        return;
      }

      try {
        const response = await fetch("https://skool-chrome-extension.onrender.com/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds })
        });
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        const data = await response.json();
        alert(`Server response: ${data.message}`);
      } catch (err) {
        console.error("Error updating user IDs:", err);
        alert("Failed to update user IDs on server.");
      }
    });

    return button;
  }

  function setupMutationObserver() {
    // Observe the body for added nodes (e.g., post overlays)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          // Check if the post overlay is loaded
          const postOverlay = document.querySelector(".styled__PostContent-sc-g7syap-11");
          if (postOverlay) {
            // Ensure the button is injected when the post overlay appears
            injectUpdateUsersButton();
          }
        }
      }
    });
  
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 4) Insert the new button next to the existing “Follow” button (or whichever button is in the post header)
  function injectUpdateUsersButton() {
  // Locate the parent container of the post header
  const parentContainer = document.querySelector('.styled__PostDetailHeader-sc-g7syap-18');

  if (!parentContainer) {
    console.log("Parent container for the 'Update Users' button not found.");
    return;
  }

  // Check if the button already exists to avoid duplicates
  if (parentContainer.querySelector(".update-users-btn")) {
    console.log("'Update Users' button already exists.");
    return;
  }

  // Create the new "Update Users" button
  const updateBtn = document.createElement("button");
  updateBtn.textContent = "Update User IDs";
  updateBtn.className = "update-users-btn";
  updateBtn.style.cursor = "pointer";
  updateBtn.style.marginLeft = "8px";
  updateBtn.style.padding = "6px 10px";
  updateBtn.style.border = "1px solid #ccc";
  updateBtn.style.borderRadius = "4px";
  updateBtn.style.background = "#fff";

  // Add click functionality to fetch and send user IDs
  updateBtn.addEventListener("click", async () => {
    const userIds = getUserIdsFromComments();
    if (!userIds.length) {
      alert("No user IDs found in the comments!");
      return;
    }

    try {
      const response = await fetch("https://skool-chrome-extension.onrender.com/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds })
      });
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const data = await response.json();
      alert(`Server response: ${data.message}`);
    } catch (err) {
      console.error("Error updating user IDs:", err);
      alert("Failed to update user IDs on server.");
    }
  });

  // Append the new button to the parent container
  parentContainer.appendChild(updateBtn);
}

  // 5) Run initialization: if on “dont-mind-me-2” page, inject the button
  function init() {
    if (isOnDontMindMePost()) {
      injectUpdateUsersButton();
    }
    if (isOnReactionChannelAcademy()) {
      injectSubscribeAllButton();  
      // injectUpdateUsersButton(); (if you also want the “Update User IDs” button on this page)
      // etc.
    }
  }

  // If Skool is a single-page app, you might watch for URL changes. Otherwise, just run once:
  document.addEventListener("DOMContentLoaded", init);
  // Or simply call init() if you know the DOM is ready
  init();


  function createSubscribeAllButton() {
    const button = document.createElement('button');
    button.textContent = "Subscribe to All";
    button.style.cursor = 'pointer';
    button.style.padding = '8px 12px';
    button.style.margin = '8px 0';
    button.style.borderRadius = '4px';
    button.style.backgroundColor = '#2196F3';
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.width = '100%';  // Optional, if you want it to match the existing button’s full width
  
    // When clicked, fetch user IDs from your server and open them in batches
    button.addEventListener('click', async () => {
      try {
        // 1) Fetch user IDs from your server
        const resp = await fetch("https://skool-chrome-extension.onrender.com/api/users");
        if (!resp.ok) {
          throw new Error(`Failed to fetch user IDs. Status = ${resp.status}`);
        }
        const userIds = await resp.json(); // e.g. ["@evansoasis", "@someoneElse"]
  
        if (!userIds.length) {
          alert("No user IDs found on the server!");
          return;
        }
  
        // 2) Ask how many at a time
        const userBatchSize = prompt('How many users to open at once?', '10');
        const batchSize = parseInt(userBatchSize, 10) || 10;
  
        // 3) Send them to the background script to open in batches
        chrome.runtime.sendMessage({
          action: 'openUsersInBatches',
          payload: {
            userIds,
            batchSize
          }
        }, (response) => {
          if (response && response.success) {
            console.log('Batch opening started...');
            if (response.message) {
              alert(response.message); 
            }
          } else {
            console.error('Failed to open user IDs in batches', response?.error);
          }
        });
      } catch (err) {
        console.error("Error fetching or opening user IDs:", err);
        alert("Error fetching user IDs from server. Check console.");
      }
    });
  
    return button;
  }

  function injectSubscribeAllButton() {
    // 1) Find the existing “highlighted” button in your screenshot
    const existingBtn = document.querySelector('.styled__ButtonWrapper-sc-dscagy-1.kkQuiY');
    if (!existingBtn) {
      console.log("Could not find the existing side button to place our 'Subscribe to All' button.");
      return;
    }
  
    // 2) Create our new button
    const subscribeBtn = createSubscribeAllButton();
  
    // 3) Insert it in the DOM right before the existing button
    existingBtn.parentNode.insertBefore(subscribeBtn, existingBtn);
  }

  
  function setupMutationObserver() {
    if (imageObserver) {
      imageObserver.disconnect();
    }
    imageObserver = new MutationObserver((mutations) => {
      if (!isInitialized) return;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const newImgs = node.querySelectorAll(".styled__PreviewImageWrapper-sc-vh0utx-21.gUydVb img");
            if (newImgs.length > 0) {
              processImages();
            }
          }
        }
      }
    });
    imageObserver.observe(document.body, { childList: true, subtree: true });
  }

  function watchUrlChanges() {
    let lastUrl = window.location.href;
    let timer;

    urlObserver = new MutationObserver(() => {
      console.log("lastUrl1", lastUrl);
      onUrlChange();
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        clearTimeout(timer);
        timer = setTimeout(() => {
          lastUrl = currentUrl;
          onUrlChange();
        }, 50);
      }
    });
    urlObserver.observe(document, { subtree: true, childList: true });

    window.addEventListener("popstate", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        lastUrl = window.location.href;
        onUrlChange();
      }, 50);
    });

    (function(history) {
      const pushState = history.pushState;
      history.pushState = function() {
        const ret = pushState.apply(history, arguments);
        window.dispatchEvent(new Event("pushstate"));
        window.dispatchEvent(new Event("locationchange"));
        return ret;
      };
      const replaceState = history.replaceState;
      history.replaceState = function() {
        const ret = replaceState.apply(history, arguments);
        window.dispatchEvent(new Event("replacestate"));
        window.dispatchEvent(new Event("locationchange"));
        return ret;
      };
    })(window.history);

    window.addEventListener("locationchange", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        lastUrl = window.location.href;
        onUrlChange();
      }, 50);
    });
  }


  function initialize() {
    watchUrlChanges();
    onUrlChange(); // check once on load
  }

  initialize();

   // Initialize the "Subscribe to All" button feature
   function initBatchSubscribeFeature() {
    if (isOnReactionChannelAcademy()) {
      injectSubscribeAllButton();
    }
  }

  // Ensure this is called after the DOM is loaded
  document.addEventListener("DOMContentLoaded", initBatchSubscribeFeature);
})();
