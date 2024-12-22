(function() {
  const TARGET_HOST = "www.skool.com";
  const PATH_PREFIX = "/reaction-channel-academy";
  const SPOILER_API_BASE = "https://skool-chrome-extension.onrender.com";

  let isInitialized = false;
  let spoilerData = new Set(); // Initialize as a Set
  let imageObserver = null;
  let urlObserver = null;

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
  }

  async function initExtension() {
    console.log("[DEBUG] initExtension()");
    spoilerData = await fetchSpoilerData();
    console.log("[DEBUG] Spoiler Data:", spoilerData);
    processImages();
    setupMutationObserver();
  }

  function cleanupExtension() {
    console.log("[DEBUG] cleanupExtension()");
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
    console.log("[DEBUG] processImages() => found", images.length, "imgs");

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
            console.log("[DEBUG] Canceled spoiler toggle");
          }
        );
      });
    });
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
              console.log("[DEBUG] Found", newImgs.length, "new images in mutation");
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
})();