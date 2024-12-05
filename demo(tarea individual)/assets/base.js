const PLACEHOLDER_TITLE = "Accessible Digital Textbook";
let currentPageContent = null;
let cachedInterface = null;
let cachedNavigation = null;

// Store the current page state before leaving
window.addEventListener('beforeunload', () => {
  cacheInterfaceElements();

  // Save interface state
  const sidebar = document.getElementById('sidebar');
  const navPopup = document.getElementById('navPopup');

  const interfaceState = {
    sidebarOpen: !sidebar.classList.contains('translate-x-full'),
    navOpen: !navPopup.classList.contains('-translate-x-full'),
    scrollPosition: window.scrollY,
    navScrollPosition: document.querySelector('.nav__list')?.scrollTop || 0
  };

  sessionStorage.setItem('interfaceState', JSON.stringify(interfaceState));
});

// Add this function to cache the interface elements
function cacheInterfaceElements() {
  const sidebar = document.getElementById('sidebar');
  const navPopup = document.getElementById('navPopup');

  if (sidebar) {
    cachedInterface = sidebar.outerHTML;
  }
  if (navPopup) {
    cachedNavigation = navPopup.outerHTML;
  }
}

// Add this function to restore cached elements
function restoreInterfaceElements() {
  if (cachedInterface) {
    const interfaceContainer = document.getElementById('interface-container');
    if (interfaceContainer) {
      interfaceContainer.innerHTML = cachedInterface;
    }
  }
  if (cachedNavigation) {
    const navContainer = document.getElementById('nav-container');
    if (navContainer) {
      navContainer.innerHTML = cachedNavigation;
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Immediately restore interface elements before anything else
  const navPopup = document.getElementById("navPopup");
  const sidebar = document.getElementById("sidebar");

  // Remove hidden class immediately if they exist
  if (navPopup) navPopup.classList.remove("hidden");
  if (sidebar) sidebar.classList.remove("hidden");

  //Hide main content
  const mainContent = document.body;
  if (mainContent) {
    mainContent.classList.add('hidden');
    mainContent.classList.add('z-30');
  }
  // Restore interface state immediately
  const savedState = sessionStorage.getItem('interfaceState');
  if (savedState) {
    const state = JSON.parse(savedState);

    // Restore sidebar state
    const sidebar = document.getElementById('sidebar');
    if (sidebar && state.sidebarOpen) {
      sidebar.classList.remove('translate-x-full');
      const mainTag = document.querySelector('main');
      if (mainTag) {
        mainTag.classList.add("lg:ml-32");
        mainTag.classList.remove("lg:mx-auto");
      }
    }

    // Restore nav state
    const navPopup = document.getElementById('navPopup');
    if (navPopup && state.navOpen) {
      navPopup.classList.remove('-translate-x-full');
      navPopup.classList.add('left-2');
    }

    // Restore scroll positions after a slight delay
    setTimeout(() => {
      window.scrollTo(0, state.scrollPosition);
      const navList = document.querySelector('.nav__list');
      if (navList) {
        navList.scrollTop = state.navScrollPosition;
      }
    }, 100);
  }

  // Add navigation event listeners
  document.addEventListener('click', handleNavigation);

  // Set the language on page load to currentLanguage cookie or the html lang attribute.
  let languageCookie = getCookie("currentLanguage");
  if (!languageCookie) {
    currentLanguage = document
      .getElementsByTagName("html")[0]
      .getAttribute("lang");
  } else {
    currentLanguage = languageCookie;
  }

  loadAtkinsonFont();



  // Fetch interface.html and nav.html, and activity.js concurrently
  Promise.all([
    fetch("assets/interface.html").then((response) => response.text()),
    fetch("assets/nav.html").then((response) => response.text()),
    fetch("assets/activity.js").then((response) => response.text()),
    fetch("pipwerks-scorm-api-wrapper.js").then((response) => response.text()),
    fetch("assets/config.html").then((response) => response.text()),
  ])
    .then(async ([interfaceHTML, navHTML, activityJS, scormAPI, configHTML]) => {
      // If we have cached elements, use them instead of fetching
      if (cachedInterface && cachedNavigation) {
        restoreInterfaceElements();
        // Remove hidden class immediately
        const navPopup = document.getElementById("navPopup");
        const sidebar = document.getElementById("sidebar");
        if (navPopup) navPopup.classList.remove("hidden");
        if (sidebar) sidebar.classList.remove("hidden");
      } else {
        // First time load - inject fetched HTML
        document.getElementById("interface-container").innerHTML = interfaceHTML;
        document.getElementById("nav-container").innerHTML = navHTML;
        // Remove hidden class immediately
        const navPopup = document.getElementById("navPopup");
        const sidebar = document.getElementById("sidebar");
        if (navPopup) navPopup.classList.remove("hidden");
        if (sidebar) sidebar.classList.remove("hidden");
        // Cache the elements for next time
        cacheInterfaceElements();
      }
      const parser = new DOMParser();
      const configDoc = parser.parseFromString(configHTML, "text/html");
      const newTitle = configDoc.querySelector("title").textContent;
      const newAvailableLanguages = configDoc
        .querySelector('meta[name="available-languages"]')
        .getAttribute("content");

      // Add the new title.
      if (newTitle !== PLACEHOLDER_TITLE) {
        document.title = newTitle;
      }
      // Add the new available languages.
      const availableLanguages = document.createElement("meta");
      availableLanguages.name = "available-languages";
      availableLanguages.content = newAvailableLanguages;
      document.head.appendChild(availableLanguages);

      // Inject the JavaScript code from activity.js dynamically into the document
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.text = activityJS + scormAPI;
      document.body.appendChild(script);

      await fetchTranslations();

      // Iterate over the available languages added in the html meta tag to populate the language dropdown
      const dropdown = document.getElementById("language-dropdown");
      // Check if there is a more dynamic way to populate the available languages
      const metaTag = document.querySelector(
        'meta[name="available-languages"]'
      );
      const languages = metaTag.getAttribute("content").split(",");

      languages.forEach((language) => {
        const option = document.createElement("option");
        option.value = language;
        option.textContent = language;
        dropdown.appendChild(option);
      });

      // Manage sidebar state:
      const sidebarState = getCookie("sidebarState" || "closed");
      const sidebar = document.getElementById("sidebar");
      const openSidebar = document.getElementById("open-sidebar");
      const sideBarActive = sidebarState === "open";

      // Updated to target <main> tag as content id was glitching.
      if (sideBarActive) {
        sidebar.classList.remove("translate-x-full");
        document.getElementsByTagName("main")[0].classList.add("lg:ml-32");
        document.getElementsByTagName("main")[0].classList.remove("lg:mx-auto");
      } else {
        sidebar.classList.add("translate-x-full");
        document.getElementsByTagName("main")[0].classList.remove("lg:ml-32");
        document.getElementsByTagName("main")[0].classList.add("lg:mx-auto");
      }
      // Hide specific elements initially for accessibility
      const elements = [
        "close-sidebar",
        "language-dropdown",
        "toggle-eli5-mode-button",
        "sidebar",
      ];
      elements.forEach((id) => {
        const element = document.getElementById(id);
        if (sideBarActive) {
          element.setAttribute("aria-hidden", "false");
          element.removeAttribute("tabindex");
          openSidebar.setAttribute("aria-expanded", "true");
        } else {
          element.setAttribute("aria-hidden", "true");
          element.setAttribute("tabindex", "-1");
          openSidebar.setAttribute("aria-expanded", "false");
        }
      });

      //save function 
      function saveActivities() {
        let scorm = pipwerks.SCORM;
        scorm.version = "1.2";

        const activities = document.querySelectorAll(
          "input[type='text'], textarea, .word-card"
        );
        const submitButton = document.getElementById("submit-button");
        const dropzones = document.querySelectorAll(".dropzone");
        const activityId = location.pathname
          .substring(location.pathname.lastIndexOf("/") + 1)
          .split(".")[0];
        // Add event listeners to dropzones
        dropzones.forEach((dropzone) => {
          const dropzonesData = JSON.parse(localStorage.getItem(activityId)) || {};
          const dropzoneRegion = dropzone.querySelector("div[role='region']");
          const dropzoneId = dropzoneRegion.getAttribute("id");
          if (dropzoneId in dropzonesData) {
            const { itemId } = dropzonesData[dropzoneId];
            const wordElement = document.querySelector(
              `.activity-item[data-activity-item='${itemId}']`
            );
            dropzoneRegion.appendChild(wordElement);
          }
          dropzone.addEventListener("drop", (event) => {
            event.preventDefault();
            const itemId = event.dataTransfer.getData("text");
            const regexItem = /^item-/;
            if (!regexItem.test(itemId)) {
              return;
            }
            if (!itemId || itemId === "null") {
              return;
            }
            let dataActivity = JSON.parse(localStorage.getItem(activityId)) || {};
            if (
              dataActivity[dropzoneId] &&
              dataActivity[dropzoneId].itemId === itemId
            ) {
              console.log("El elemento ya está presente en esta zona");
              return;
            }
            dataActivity[dropzoneId] = { itemId };
            localStorage.setItem(activityId, JSON.stringify(dataActivity));
          });
        });
        // Inicializa el contador si no existe
        if (!localStorage.getItem("contador")) {
          localStorage.setItem("contador", "0");
        }
        
        // Add event listeners to other activities
        activities.forEach((nodo, index) => {
          const id = nodo.getAttribute("data-aria-id")
          const localStorageNodeId = `${activityId}_${id}`
          nodo.value = localStorage.getItem(localStorageNodeId)

          nodo.addEventListener("input", (event) => {
            let scorm = pipwerks.SCORM;
            scorm.version = "1.2";
            const value = event.target.value
            localStorage.setItem(localStorageNodeId, value)

            // Guardar interacción en SCORM
            let contador = parseInt(localStorage.getItem("contador"), 10);
            
            scorm.init()
            
            scorm.set(`cmi.interactions.${index}.id`, `student_response_${localStorageNodeId}`);
            scorm.set(`cmi.interactions.${index}.type`, "fill-in");
            scorm.set(`cmi.interactions.${index}.student_response`, value);
            scorm.set(`cmi.interactions.${index}.result`, "neutral");
            scorm.set(`cmi.interactions.${index}.description`, activityId);
            
            contador += 1;
            localStorage.setItem("contador", contador.toString());
          })
        })

        /* submitButton.addEventListener("click", ()=> {
          localStorage.setItem(`${activityId}_success`, "true")
        }) */
      }
      
      saveActivities()
      // Initialize left nav bar state from cookie
      const navState = getCookie("navState") || "closed";
      const navPopup = document.getElementById("navPopup");
      const navToggle = document.querySelector(".nav__toggle");
      const navList = document.querySelector(".nav__list");
      const navLinks = document.querySelectorAll(".nav__list-link");
      const savedPosition = getCookie("navScrollPosition");

      if (navState === "open") {
        navPopup.classList.remove("-translate-x-full");
        navPopup.classList.add("left-2");
        navPopup.setAttribute("aria-hidden", "false");
        if (navList) {
          navList.removeAttribute("hidden");
          // Wait for nav list to be visible before setting scroll
          setTimeout(() => {
            if (savedPosition) {
              console.log("Setting scroll after delay to:", savedPosition);
              navList.scrollTop = parseInt(savedPosition);
              console.log("Actual scroll position:", navList.scrollTop);
            }
          }, 300); // Increased delay
        }
        if (navToggle) {
          navToggle.setAttribute("aria-expanded", "true");
        }
      }

      // Restore nav scroll position
      //navList = document.querySelector(".nav__list");
      console.log("DOMContentLoaded - Retrieved saved position:", savedPosition);
      console.log("DOMContentLoaded - Current navList:", navList);

      if (navList && savedPosition) {
        navList.scrollTop = parseInt(savedPosition);

        // Only handle focus if nav is open
        if (navState === "open") {
          setTimeout(() => {
            const currentPath = window.location.pathname.split("/").pop() || "index.html";
            const activeLink = Array.from(document.querySelectorAll(".nav__list-link")).find(
              link => link.getAttribute("href") === currentPath
            );

            if (activeLink) {
              const linkRect = activeLink.getBoundingClientRect();
              const navRect = navList.getBoundingClientRect();
              const isInView = (
                linkRect.top >= navRect.top &&
                linkRect.bottom <= navRect.bottom
              );

              if (!isInView) {
                activeLink.scrollIntoView({ behavior: "smooth", block: "center" });
              }
              activeLink.setAttribute("tabindex", "0");
              activeLink.focus({ preventScroll: true });
            }
          }, 300);
        }
      }

      // Add event listeners to various UI elements
      prepareActivity();
      // right side bar
      document
        .getElementById("open-sidebar")
        .addEventListener("click", toggleSidebar);
      document
        .getElementById("close-sidebar")
        .addEventListener("click", toggleSidebar);
      document
        .getElementById("toggle-eli5")
        .addEventListener("click", toggleEli5Mode);
      document
        .getElementById("language-dropdown")
        .addEventListener("change", switchLanguage);
      document
        .getElementById("toggle-easy")
        .addEventListener("click", toggleEasyReadMode);
      document
        .getElementById("play-pause-button")
        .addEventListener("click", togglePlayPause);
      document
        .getElementById("toggle-tts")
        .addEventListener("click", toggleReadAloud);
      document
        .getElementById("audio-previous")
        .addEventListener("click", playPreviousAudio);
      document
        .getElementById("audio-next")
        .addEventListener("click", playNextAudio);
      document
        .getElementById("read-aloud-speed")
        .addEventListener("click", togglePlayBarSettings);

      // Add event listeners to all buttons with the class 'read-aloud-change-speed'
      document
        .querySelectorAll(".read-aloud-change-speed")
        .forEach((button) => {
          button.addEventListener("click", changeAudioSpeed);
        });

      // set the language dropdown to the current language
      document.getElementById("language-dropdown").value = currentLanguage;

      // bottom bar
      document
        .getElementById("back-button")
        .addEventListener("click", previousPage);
      document
        .getElementById("forward-button")
        .addEventListener("click", nextPage);

      // left nav bar
      document.getElementById("nav-popup").addEventListener("click", toggleNav);
      document.getElementById("nav-close").addEventListener("click", toggleNav);
      //const navToggle = document.querySelector(".nav__toggle");
      //const navLinks = document.querySelectorAll(".nav__list-link");
      //const navPopup = document.getElementById("navPopup");

      navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
          // Save the current scroll position before navigation
          if (navList) {
            const scrollPosition = navList.scrollTop;
            setCookie("navScrollPosition", scrollPosition, 7, basePath);
          }
        });
      });

      if (navToggle) {
        navToggle.addEventListener("click", toggleNav);
      }

      // Append page and section numbers to nav list items
      const navListItems = document.querySelectorAll(".nav__list-item");

      navListItems.forEach((item, index) => {
        const link = item.querySelector(".nav__list-link");
        item.classList.add(
          "border-b",
          "border-gray-300",
          "flex",
          "items-center"
        );
        link.classList.add(
          "flex-grow",
          "flex",
          "items-center",
          "w-full",
          "h-full",
          "p-2",
          "py-3",
          "hover:bg-blue-50",
          "transition",
          "text-gray-500"

        );

        // Add border top to the first element
        if (index === 0) {
          item.classList.add("border-t");
        }
        let itemIcon = "";
        let itemSubtitle = "";
        const href = link.getAttribute("href");
        const pageSectionMatch = href.match(/(\d+)_(\d+)/);

        if (item.classList.contains("activity")) {
          const activityId = href.split(".")[0];
          const success = JSON.parse(localStorage.getItem(`${activityId}_success`)) || false;
          if (success) {
            itemIcon = `<i class="${activityId} fas fa-check-square text-green-500 mt-1"></i>`;
            itemSubtitle = "<span data-id='activity-completed'></span>";
          } else {
            itemIcon = `<i class="${activityId} fas fa-pen-to-square mt-1 text-blue-700"></i>`;
            itemSubtitle = "<span data-id='activity-to-do'></span>";
          }
        }

        const activityId = href.split(".")[0];

        const textId = link.getAttribute("data-text-id");

        if (pageSectionMatch) {
          const [_, pageNumber, sectionNumber] = pageSectionMatch.map(Number);
          link.innerHTML =
            "<div class='flex items-top space-x-2'>" +
            itemIcon +
            "<div>" +
            `<div>${pageNumber + 1}.${sectionNumber + 1}: </span><span class='inline text-gray-800' data-id='${textId}'></div>` +
            "<div class='text-sm text-gray-500'>" +
            itemSubtitle +
            "</div></div></div>";
        }

        if (href === window.location.pathname.split("/").pop()) {
          item.classList.add("min-h-[3rem]");
          link.classList.add(
            "border-l-4",
            "border-blue-500",
            "bg-blue-100",
            "p-2"
          );
        }
      });

      // Set the initial page number
      const pageSectionMetaTag = document.querySelector(
        'meta[name="page-section-id"]'
      );
      const pageSectionContent = pageSectionMetaTag.getAttribute("content");
      if (pageSectionContent) {
        const parts = pageSectionContent.split("_").map(Number);
        let humanReadablePage;

        if (parts.length === 2) {
          if (parts[1] === 0) {
            humanReadablePage =
              "<span data-id='page'></span> " + `${parts[0] + 1}`;
          } else {
            humanReadablePage =
              "<span data-id='page'></span> " +
              `${parts[0] + 1}.${parts[1] + 1}`;
          }
        } else {
          humanReadablePage =
            "<span data-id='page'></span> " + ` ${parts[0] + 1}`;
        }

        document.getElementById("page-section-id").innerHTML =
          humanReadablePage;
      }

      // Fetch translations and set up click handlers for elements with data-id
      await fetchTranslations();
      document.querySelectorAll("[data-id]").forEach((element) => {
        element.addEventListener("click", handleElementClick);
      });

      // Add keyboard event listeners for navigation
      document.addEventListener("keydown", handleKeyboardShortcuts);

      console.log('Setting up toggle button keyboard handlers');
      const toggleButtons = document.querySelectorAll('[id^="toggle-"]');
      console.log('Found toggle buttons:', toggleButtons.length);

      toggleButtons.forEach(button => {
        button.addEventListener('keydown', function (event) {
          console.log('Toggle button keydown event:', event.key, 'on button:', this.id);

          // Allow ArrowRight and ArrowLeft to propagate for navigation
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            console.log('Navigation key detected on toggle button - allowing propagation');
            return true;
          }

          // Handle space and enter normally for toggle buttons
          if (event.key === ' ' || event.key === 'Enter') {
            console.log('Space/Enter key on toggle button - triggering click');
            event.preventDefault();
            this.click();
          }
        });
        console.log('Added keydown listener to button:', button.id);
      });

      //Load status of AI controls in right sidebar on load from cookie.
      initializePlayBar();
      initializeAudioSpeed();
      loadToggleButtonState();
      loadEasyReadMode();
      loadAutoplayState();
      document.getElementById("toggle-autoplay").addEventListener("click", toggleAutoplay);
      document.getElementById("toggle-describe-images").addEventListener("click", toggleDescribeImages);
      loadDescribeImagesState();

      // Unhide navigation and sidebar after a short delay to allow animations
      setTimeout(() => {
        navPopup.classList.remove("hidden");
        document.getElementById("sidebar").classList.remove("hidden");
        console.log("DOMContentLoaded - Actual scroll position:", navList.scrollTop);

      }, 100); // Adjust the timeout duration as needed

      // Add click handler specifically for eli5-content area
      document
        .getElementById("eli5-content")
        .addEventListener("click", function () {
          if (readAloudMode && eli5Mode) {
            const mainSection = document.querySelector(
              'section[data-id^="sectioneli5"]'
            );
            if (mainSection) {
              const eli5Id = mainSection.getAttribute("data-id");
              const eli5AudioSrc = audioFiles[eli5Id];

              if (eli5AudioSrc) {
                stopAudio();
                eli5Active = true;
                eli5Audio = new Audio(eli5AudioSrc);
                eli5Audio.playbackRate = parseFloat(audioSpeed);
                eli5Audio.play();

                highlightElement(this);

                eli5Audio.onended = () => {
                  unhighlightElement(this);
                  eli5Active = false;
                  isPlaying = false;
                  setPlayPauseIcon();
                };

                eli5Audio.onerror = () => {
                  unhighlightElement(this);
                  eli5Active = false;
                  isPlaying = false;
                  setPlayPauseIcon();
                };

                isPlaying = true;
                setPlayPauseIcon();
              }
            }
          }
        });
    })
    .then(() => {
      MathJax.typeset();
    })
    .catch((error) => {
      console.error("Error loading HTML:", error);
      // Show content even if loading fails
      const mainContent = document.querySelector('[role="main"]');
      if (mainContent) {
        mainContent.classList.remove('opacity-0', 'invisible');
        mainContent.classList.add('opacity-100', 'visible');
      }
    });
});

// Handle keyboard events for navigation
function handleKeyboardShortcuts(event) {
  console.log('handleKeyboardShortcuts called with key:', event.key);

  const activeElement = document.activeElement;
  console.log('Active element:', activeElement.tagName, 'ID:', activeElement.id);

  // More specific check for text input elements
  const isInTextBox = (activeElement.tagName === "INPUT" &&
    activeElement.type !== "checkbox" &&
    activeElement.type !== "radio") ||
    activeElement.tagName === "TEXTAREA" ||
    activeElement.isContentEditable;

  // Check if any modifier keys are pressed (except Alt+Shift)
  const hasModifiers = event.ctrlKey || event.metaKey ||
    (event.altKey && !event.shiftKey);

  console.log('isInTextBox:', isInTextBox, 'hasModifiers:', hasModifiers);

  // Exit if in text input (but not checkbox/radio) or if unwanted modifier keys are pressed
  if ((isInTextBox && !activeElement.id.startsWith('toggle-')) || hasModifiers) {
    console.log('Exiting early due to text input or modifiers');
    return;
  }

  // Get toggle states
  const readAloudMode = getCookie("readAloudMode") === "true";
  const easyReadMode = getCookie("easyReadMode") === "true";
  const eli5Mode = getCookie("eli5Mode") === "true";

  console.log('Current modes - readAloud:', readAloudMode, 'easyRead:', easyReadMode, 'eli5:', eli5Mode);

  // Handle navigation keys with null checks
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    console.log(`${event.key} pressed - handling navigation`);
    event.preventDefault();

    // Check if navigation is possible before proceeding
    const navItems = document.querySelectorAll(".nav__list-link");
    if (!navItems.length) return;

    if (event.key === "ArrowRight") {
      nextPage();
    } else {
      previousPage();
    }
    return;
  }

  switch (event.key) {
    case "x":
      console.log('X key pressed - toggling nav');
      event.preventDefault();
      toggleNav();
      break;
    case "a":
      console.log('A key pressed - toggling sidebar');
      event.preventDefault();
      toggleSidebar();
      break;
  }

  // Handle Alt+Shift shortcuts separately
  if (event.altKey && event.shiftKey) {
    console.log('Alt+Shift modifier detected');
    switch (event.key) {
      case "x":
        console.log('Alt+Shift+X pressed - toggling nav');
        event.preventDefault();
        toggleNav();
        break;
      case "a":
        console.log('Alt+Shift+A pressed - toggling sidebar');
        event.preventDefault();
        toggleSidebar();
        break;
    }
  }
}

function checkCurrentActivityCompletion(isCorrect) {
  const activityId = location.pathname.substring(location.pathname.lastIndexOf("/") + 1).split(".")[0];
  const currentActivityIcon = document.querySelector(`[class*="${activityId}"]`);
  if (isCorrect) {
    currentActivityIcon.classList.replace("fa-pen-to-square", "fa-square-check");
    currentActivityIcon.classList.replace("text-blue-700", "text-green-500");
  } else {
    currentActivityIcon.classList.replace("fa-square-check", "fa-pen-to-square");
    currentActivityIcon.classList.replace("text-green-500", "text-blue-700");
  }
}

// Handle navigation clicks to enable smooth transitions
function handleNavigation(event) {
  // Only handle internal navigation
  if (event.target.matches('.nav__list-link') ||
    event.target.id === 'back-button' ||
    event.target.id === 'forward-button') {

    event.preventDefault();
    const targetHref = event.target.href || event.target.getAttribute('data-href');

    // Check if a valid target URL is found
    if (!targetHref) {
      console.error("Navigation target URL is null or undefined for element:", event.target);
      return;
    }

    // Cache current interface state
    cacheInterfaceElements();

    // Check if main content exists before trying to access it
    const mainContent = document.querySelector('[role="main"]');
    if (mainContent) {
      // Save current page content
      currentPageContent = mainContent.innerHTML;

      // Add transition class
      mainContent.classList.add('opacity-0');
    }

    // After a brief delay to allow the fade out
    setTimeout(() => {
      console.log("Navigating to:", targetHref);
      window.location.href = targetHref;
    }, 150);
  }
}

// Function to load fonts dynamically
function loadAtkinsonFont() {
  // Create and load the preconnect links
  const gFontsPreconnect = document.createElement('link');
  gFontsPreconnect.rel = 'preconnect';
  gFontsPreconnect.href = 'https://fonts.googleapis.com';

  const gStaticPreconnect = document.createElement('link');
  gStaticPreconnect.rel = 'preconnect';
  gStaticPreconnect.href = 'https://fonts.gstatic.com';
  gStaticPreconnect.crossOrigin = 'anonymous';

  // Create and load the font stylesheet
  const fontStylesheet = document.createElement('link');
  fontStylesheet.rel = 'stylesheet';
  fontStylesheet.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap';

  // Append elements to document head
  document.head.appendChild(gFontsPreconnect);
  document.head.appendChild(gStaticPreconnect);
  document.head.appendChild(fontStylesheet);

  // Apply the font to the entire document
  document.documentElement.style.fontFamily = '"Atkinson Hyperlegible", sans-serif';

  // Also apply to all elements that might inherit from a different font
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    body, p, h1, h2, h3, h4, h5, h6, span, div, button, input, textarea, select {
      font-family: "Atkinson Hyperlegible", sans-serif !important;
    }
  `;
  document.head.appendChild(styleSheet);
}

// Helper function to check if an element is a toggle button
function isToggleButton(element) {
  const isToggle = element.matches('[id^="toggle-"]') ||
    element.closest('[id^="toggle-"]') !== null;
  console.log('isToggleButton check for element:', element.id, 'Result:', isToggle);
  return isToggle;
}

let translations = {};
let audioFiles = {};
let currentAudio = null;
let isPlaying = false;
let currentIndex = 0;
let audioElements = [];
let audioQueue = [];
let eli5Active = false;
let eli5Element = null;
let eli5Audio = null;
let eli5Mode = false;
let readAloudMode = false;
let sideBarActive = false;
let easyReadMode = false;
let audioSpeed = 1;
let autoplayMode = true;
let describeImagesMode = false;
const speedMapping = {
  'speed-0-5': "0.5",
  'speed-1': "1",
  'speed-1-5': "1.5",
  'speed-2': "2"
};

// Add this function to handle loading the autoplay state
function loadAutoplayState() {
  const autoplayModeCookie = getCookie("autoplayMode");
  if (autoplayModeCookie !== null) {
    autoplayMode = autoplayModeCookie === "true";
    toggleCheckboxState("toggle-autoplay", autoplayMode);
  }
}

function toggleDescribeImages() {
  // Stop current audio before making changes
  stopAudio();
  unhighlightAllElements();

  describeImagesMode = !describeImagesMode;
  toggleCheckboxState("toggle-describe-images", describeImagesMode);
  setCookie("describeImagesMode", describeImagesMode, 7);

  // Regather audio elements to update the sequence with or without images
  gatherAudioElements();

  // If read aloud and autoplay are active, start playing from beginning
  if (readAloudMode && autoplayMode) {
    currentIndex = 0;
    isPlaying = true;
    setPlayPauseIcon();
    playAudioSequentially();
  }
}

function loadDescribeImagesState() {
  const describeImagesModeCookie = getCookie("describeImagesMode");
  if (describeImagesModeCookie !== null) {
    describeImagesMode = describeImagesModeCookie === "true";
    toggleCheckboxState("toggle-describe-images", describeImagesMode);

    // Regather audio elements to ensure correct initial state
    gatherAudioElements();
  }
}

// Get the base path of the current URL
const currentPath = window.location.pathname;
const basePath = currentPath.substring(0, currentPath.lastIndexOf("/") + 1);

// Check if sideBarActive state has been pulled from the cookie
const sidebarStateCookie = getCookie("sidebarState");
if (sidebarStateCookie) {
  sideBarActive = sidebarStateCookie === "open";
}

// Toggle the right nav bar (Smart Utility Sidebar)
function toggleSidebar() {
  const languageDropdown = document.getElementById("language-dropdown");
  const sideLinks = document.querySelectorAll(".sidebar-item");
  const sidebar = document.getElementById("sidebar");
  const openSidebar = document.getElementById("open-sidebar");
  sideBarActive = !sideBarActive;

  // Set the sidebar state in the cookie referring to the base path
  setCookie("sidebarState", sideBarActive ? "open" : "closed", 7, basePath);
  sidebar.classList.toggle("translate-x-full");
  if (window.innerWidth <= 768) {
    // Apply full width only on mobile
    sidebar.classList.toggle("w-full", sideBarActive);
  }

  //Shift content to left when sidebar is open
  document
    .getElementsByTagName("main")[0] //Update to use main tag vs id="content"
    .classList.toggle("lg:ml-32", sideBarActive);
  document
    .getElementsByTagName("main")[0] //Update to use main tag vs id="content"
    .classList.toggle("lg:mx-auto", !sideBarActive);

  // Manage focus and accessibility attributes based on sidebar state
  const elements = [
    "close-sidebar",
    "language-dropdown",
    "sidebar",
  ];
  elements.forEach((id) => {
    const element = document.getElementById(id);
    if (sideBarActive) {
      element.setAttribute("aria-hidden", "false");
      element.removeAttribute("tabindex");
      openSidebar.setAttribute("aria-expanded", "true");

      // Set focus on the first element of the sidebar after a delay
      setTimeout(() => {
        languageDropdown.focus();
      }, 500);
    } else {
      element.setAttribute("aria-hidden", "true");
      element.setAttribute("tabindex", "-1");
      openSidebar.setAttribute("aria-expanded", "false");
    }
  });
}

// Language functionality
function switchLanguage() {
  stopAudio();
  currentLanguage = document.getElementById("language-dropdown").value;
  setCookie("currentLanguage", currentLanguage, 7, basePath);
  fetchTranslations();
  document
    .getElementsByTagName("html")[0]
    .setAttribute("lang", currentLanguage);
  fetchTranslations();
}

async function fetchTranslations() {
  try {
    const interface_response = await fetch(
      `assets/interface_translations.json`
    );
    const interface_data = await interface_response.json();
    const response = await fetch(`translations_${currentLanguage}.json`);
    const data = await response.json();

    if (interface_data[currentLanguage]) {
      translations = {
        ...data.texts,
        ...interface_data[currentLanguage],
      };
      const dropdown = document.getElementById("language-dropdown");
      const options = Array.from(dropdown.options);

      options.forEach((option) => {
        option.textContent = interface_data[option.value]["language-name"];
      });
    } else {
      translations = data.texts;
    }
    audioFiles = data.audioFiles;

    // Apply translations before showing content
    await applyTranslations();
    gatherAudioElements();

    // Show content after translations are applied using Tailwind classes
    const mainContent = document.querySelector('[role="main"]');
    if (mainContent) {
      mainContent.classList.remove('opacity-0', 'invisible');
      mainContent.classList.add('opacity-100', 'visible', 'transition-opacity', 'duration-300', 'ease-in-out');
    }

  } catch (error) {
    console.error("Error loading translations:", error);
    // Show content even if translations fail
    const mainContent = document.querySelector('[role="main"]');
    if (mainContent) {
      mainContent.classList.remove('opacity-0', 'invisible');
      mainContent.classList.add('opacity-100', 'visible');
    }
  } finally {
    MathJax.typeset();
  }
}

function applyTranslations() {

  unhighlightAllElements();

  for (const [key, value] of Object.entries(translations)) {
    if (key.startsWith("sectioneli5")) continue;

    let translationKey = key;

    if (easyReadMode) {
      const easyReadKey = `easyread-${key}`;
      if (translations.hasOwnProperty(easyReadKey)) {
        translationKey = easyReadKey;
      }
    }

    const elements = document.querySelectorAll(`[data-id="${key}"]`);
    elements.forEach((element) => {
      if (element) {
        if (element.tagName === "IMG") {
          element.setAttribute("alt", translations[translationKey]);
        } else {
          element.textContent = translations[translationKey];
        }
      }
    });

    const placeholderElements = document.querySelectorAll(
      `[data-placeholder-id="${key}"]`
    );
    placeholderElements.forEach((element) => {
      if (element) {
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          element.setAttribute("placeholder", translations[translationKey]);
        }
      }
    });
  }

  if (eli5Mode) {
    const mainSection = document.querySelector(
      'section[data-id^="sectioneli5"]'
    );
    if (mainSection) {
      const eli5Id = mainSection.getAttribute("data-id");
      const eli5Text = translations[eli5Id];

      if (eli5Text) {
        const eli5Container = document.getElementById("eli5-content");
        eli5Container.textContent = eli5Text;
      }
    }
  }

  if (isPlaying) {
    stopAudio();
    currentIndex = 0;
    playAudioSequentially();
  }
  gatherAudioElements();
  if (document.body.classList.contains('hidden')) {
    document.body.classList.remove('hidden');
  }
}

function translateText(textToTranslate, variables = {}) {
  var newText = translations[textToTranslate];
  if (!newText) return textToTranslate; // Return the original text if no translation is found

  return newText.replace(/\${(.*?)}/g, (match, p1) => variables[p1] ?? "");
}

// Add this new function to toggle autoplay
function toggleAutoplay() {

  stopAudio();
  unhighlightAllElements();

  autoplayMode = !autoplayMode;
  toggleCheckboxState("toggle-autoplay", autoplayMode);
  setCookie("autoplayMode", autoplayMode, 7);

  if (readAloudMode && autoplayMode) {
    currentIndex = 0;
    isPlaying = true;
    setPlayPauseIcon();
    playAudioSequentially();
  }
}

// Audio functionality
function gatherAudioElements() {
  audioElements = Array.from(document.querySelectorAll("[data-id]"))
    .filter(el => {
      // Filter out navigation elements
      const isNavElement = el.closest('.nav__list') !== null;

      // Skip images if describe images mode is off
      const isImage = el.tagName.toLowerCase() === 'img';
      if (isImage && !describeImagesMode) {
        return false;
      }

      return !isNavElement && !el.getAttribute("data-id").startsWith("sectioneli5");
    })
    .map(el => {
      const id = el.getAttribute("data-id");
      let audioSrc = audioFiles[id];

      // If it's an image, try to get its aria description audio
      if (el.tagName.toLowerCase() === 'img') {
        const ariaId = el.getAttribute("data-aria-id");
        if (ariaId && audioFiles[ariaId]) {
          audioSrc = audioFiles[ariaId];
        }
      }

      // Check if Easy-Read mode is enabled and if an easy-read version exists
      if (easyReadMode) {
        const easyReadAudioId = `easyread-${id}`;
        if (audioFiles.hasOwnProperty(easyReadAudioId)) {
          audioSrc = audioFiles[easyReadAudioId];
        }
      }

      return {
        element: el,
        id: id,
        audioSrc: audioSrc,
      };
    })
    .filter(item => item && item.audioSrc);
}

function playAudioSequentially() {
  if (currentIndex < 0) {
    currentIndex = 0;
  } else if (currentIndex >= audioElements.length) {
    stopAudio();
    return;
  }

  const { element, audioSrc } = audioElements[currentIndex];
  highlightElement(element);

  currentAudio = new Audio(audioSrc);
  // Set the playback rate of the audio
  currentAudio.playbackRate = parseFloat(audioSpeed);
  currentAudio.play();

  currentAudio.onended = () => {
    unhighlightElement(element);
    currentIndex++;
    playAudioSequentially();
  };

  currentAudio.onerror = () => {
    unhighlightElement(element);
    currentIndex++;
    playAudioSequentially();
  };
}

function playPreviousAudio() {
  currentIndex -= 1;
  stopAudio();
  unhighlightAllElements();
  isPlaying = true;
  setPlayPauseIcon();
  playAudioSequentially();
}

function playNextAudio() {
  currentIndex += 1;
  stopAudio();
  unhighlightAllElements();
  isPlaying = true;
  setPlayPauseIcon();
  playAudioSequentially();
}

function togglePlayPause() {
  if (isPlaying) {
    if (currentAudio) currentAudio.pause();
    if (eli5Audio) eli5Audio.pause();
    isPlaying = !isPlaying;
  } else {
    if (eli5Active && eli5Audio) {
      eli5Audio.play();
    } else {
      if (currentAudio) {
        currentAudio.play();
      } else {
        gatherAudioElements();
        currentIndex = 0;
        playAudioSequentially();
      }
    }
    isPlaying = !isPlaying;
  }
  setPlayPauseIcon();
}

function toggleCheckboxState(inputId, toState = null) {
  const checkbox = document.getElementById(inputId);
  if (checkbox) {
    if (toState !== null) {
      checkbox.checked = toState;
    } else {
      checkbox.checked = !checkbox.checked;
    }
  } else {
    console.error(`No element found with ID: ${inputId}`);
  }
}

function toggleReadAloud() {

  // Always stop audio when toggling read aloud mode
  stopAudio();
  unhighlightAllElements();

  readAloudMode = !readAloudMode;
  setCookie("readAloudMode", readAloudMode);

  const autoplayContainer = document.getElementById("autoplay-container");
  const describeImagesContainer = document.getElementById("describe-images-container");
  const ttsOptionsContainer = document.getElementById("tts-options-container");
  const eli5Container = document.querySelector(".flex.justify-between.items-left:has(#eli5-label)");
  const sidebar = document.getElementById("sidebar");

  toggleCheckboxState("toggle-tts", readAloudMode);

  // Show/hide TTS options container
  if (ttsOptionsContainer && eli5Container) {
    if (readAloudMode) {
      ttsOptionsContainer.classList.remove("hidden");
      ttsOptionsContainer.setAttribute("aria-expanded", "true");
      autoplayContainer.classList.remove("hidden");
      describeImagesContainer.classList.remove("hidden");
      sidebar.setAttribute("aria-hidden", "false");

      // Remove border from eli5 container when TTS options are visible
      eli5Container.classList.remove("border-t", "border-gray-300");

      // Add smooth transition classes
      requestAnimationFrame(() => {
        ttsOptionsContainer.classList.add("transition-all", "duration-300", "ease-in-out");
        ttsOptionsContainer.style.maxHeight = `${ttsOptionsContainer.scrollHeight}px`;
        ttsOptionsContainer.style.opacity = "1";
      });
    } else {
      // Animate out
      ttsOptionsContainer.style.maxHeight = "0";
      ttsOptionsContainer.style.opacity = "0";

      // Immediately restore border to eli5 container
      eli5Container.classList.add("border-t", "border-gray-300");

      // Wait for animation to complete before hiding
      setTimeout(() => {
        ttsOptionsContainer.classList.add("hidden");
        ttsOptionsContainer.setAttribute("aria-expanded", "false");
        autoplayContainer.classList.add("hidden");
        describeImagesContainer.classList.add("hidden");

        // Only set aria-hidden if no elements in the sidebar have focus
        if (!sidebar.contains(document.activeElement)) {
          sidebar.setAttribute("aria-hidden", "true");
        }
      }, 300); // Match the transition duration
    }
  }

  togglePlayBar();

  if (readAloudMode && autoplayMode) {
    gatherAudioElements();
    currentIndex = 0;
    isPlaying = true;
    setPlayPauseIcon();
    playAudioSequentially();
  }
}

function loadToggleButtonState() {
  const readAloudItem = document.getElementById("toggle-easy");
  const eli5Item = document.getElementById("toggle-eli5");
  const autoplayContainer = document.getElementById("autoplay-container");
  const describeImagesContainer = document.getElementById("describe-images-container");
  const ttsOptionsContainer = document.getElementById("tts-options-container");
  const eli5Container = document.querySelector("#eli5-label").closest('.flex.justify-between.items-left');

  if (!readAloudItem || !eli5Item || !ttsOptionsContainer) {
    setTimeout(loadToggleButtonState, 100);
    return;
  }

  const readAloudModeCookie = getCookie("readAloudMode");
  const eli5ModeCookie = getCookie("eli5Mode");

  if (readAloudModeCookie) {
    readAloudMode = readAloudModeCookie === "true";
    toggleCheckboxState("toggle-tts", readAloudMode);

    // Show/hide containers based on readAloudMode
    if (autoplayContainer && describeImagesContainer && ttsOptionsContainer) {
      if (readAloudMode) {
        ttsOptionsContainer.classList.remove("hidden");
        ttsOptionsContainer.setAttribute("aria-expanded", "true");
        autoplayContainer.classList.remove("hidden");
        describeImagesContainer.classList.remove("hidden");

        // Remove border when TTS options are visible
        eli5Container.classList.remove("border-t", "border-gray-300");

        // Set initial state for expanded container
        requestAnimationFrame(() => {
          ttsOptionsContainer.classList.add("transition-all", "duration-300", "ease-in-out");
          ttsOptionsContainer.style.maxHeight = `${ttsOptionsContainer.scrollHeight}px`;
          ttsOptionsContainer.style.opacity = "1";
        });
      } else {
        ttsOptionsContainer.classList.add("hidden");
        ttsOptionsContainer.setAttribute("aria-expanded", "false");
        ttsOptionsContainer.style.maxHeight = "0";
        ttsOptionsContainer.style.opacity = "0";
        autoplayContainer.classList.add("hidden");
        describeImagesContainer.classList.add("hidden");

        // Restore border when TTS options are hidden
        eli5Container.classList.add("border-t", "border-gray-300");
      }
    }
  }
  // Initialize autoplay after a brief delay to ensure everything is loaded
  setTimeout(() => {
    if (readAloudMode && autoplayMode) {
      stopAudio();
      gatherAudioElements();
      currentIndex = 0;
      isPlaying = true;
      setPlayPauseIcon();
      playAudioSequentially();
    }
  }, 500);

  if (eli5ModeCookie) {
    eli5Mode = eli5ModeCookie === "true";
    toggleCheckboxState("toggle-eli5", eli5Mode);

    // Automatically display ELI5 content if mode is enabled
    if (eli5Mode && translations) {
      const mainSection = document.querySelector(
        'section[data-id^="sectioneli5"]'
      );
      if (mainSection) {
        const eli5Id = mainSection.getAttribute("data-id");
        const eli5Text = translations[eli5Id];
        if (eli5Text) {
          const eli5Container = document.getElementById("eli5-content");
          eli5Container.textContent = eli5Text;
          eli5Container.classList.remove("hidden");
        }
      }
    }
  }
  togglePlayBar();
}

function toggleEli5Mode() {
  eli5Mode = !eli5Mode;
  setCookie("eli5Mode", eli5Mode, 7);
  toggleCheckboxState("toggle-eli5", eli5Mode);

  if (isPlaying) stopAudio();
  unhighlightAllElements();

  // Automatically display ELI5 content when mode is toggled on
  if (eli5Mode) {
    // Find the main section element that contains the eli5 data-id
    const mainSection = document.querySelector(
      'section[data-id^="sectioneli5"]'
    );
    if (mainSection) {
      const eli5Id = mainSection.getAttribute("data-id");
      const eli5Text = translations[eli5Id];

      if (eli5Text) {
        // Update the ELI5 content in the sidebar
        const eli5Container = document.getElementById("eli5-content");
        eli5Container.textContent = eli5Text;
        eli5Container.classList.remove("hidden");

        // Highlight both the main section and the ELI5 content
        //highlightElement(mainSection);

        // If read aloud mode is active, start playing the audio
        if (readAloudMode) {
          highlightElement(eli5Container);
          const eli5AudioSrc = audioFiles[eli5Id];
          if (eli5AudioSrc) {
            stopAudio();
            eli5Active = true;
            eli5Audio = new Audio(eli5AudioSrc);
            eli5Audio.playbackRate = parseFloat(audioSpeed);
            eli5Audio.play();

            eli5Audio.onended = () => {
              unhighlightElement(eli5Container);
              eli5Active = false;
              isPlaying = false;
              setPlayPauseIcon();
            };

            isPlaying = true;
            setPlayPauseIcon();
          }
        }
      }
    }
  } else {
    // Clear the ELI5 content when mode is turned off
    document.getElementById("eli5-content").textContent = "";
    document.getElementById("eli5-content").classList.add("hidden");
  }
}

function initializePlayBar() {
  let playBarVisible = getCookie("playBarVisible");
  if (playBarVisible === "true") {
    document.getElementById("play-bar").classList.remove("hidden");
  } else {
    document.getElementById("play-bar").classList.add("hidden");
  }
}

function initializeAutoplay() {
  if (readAloudMode && autoplayMode) {
    stopAudio();
    gatherAudioElements();
    currentIndex = 0;
    isPlaying = true;
    setPlayPauseIcon();
    playAudioSequentially();
  }
}

function initializeAudioSpeed() {
  let savedAudioSpeed = getCookie("audioSpeed");
  if (savedAudioSpeed) {
    audioSpeed = savedAudioSpeed;
    const speedClass = Object.entries(speedMapping).find(([key, value]) => value === audioSpeed)?.[0] || 'speed-1';
    document.getElementById("read-aloud-speed").innerHTML = document.getElementsByClassName(speedClass)[0].innerHTML;

    // Set the playback rate for currentAudio and eli5Audio if they exist
    if (currentAudio) {
      currentAudio.playbackRate = audioSpeed;
    }
    if (eli5Audio) {
      eli5Audio.playbackRate = audioSpeed;
    }

    selectedSpeedButton(audioSpeed);
    // Update button styles
    /*document.querySelectorAll(".read-aloud-change-speed").forEach((btn) => {
      let speedClass = Array.from(btn.classList).find((cls) =>
        cls.startsWith("speed-")
      );
      
    });*/
  }
}

function selectedSpeedButton(audioSpeed) {
  // Convert audioSpeed to the corresponding class format
  const speedClass = `speed-${audioSpeed.toString().replace('.', '-')}`;

  // Update button styles
  document.querySelectorAll(".read-aloud-change-speed").forEach((btn) => {
    if (btn.classList.contains(speedClass)) {
      btn.classList.add("bg-white", "text-black");
      btn.classList.remove("bg-black", "text-white", "text-gray-300");
    } else {
      btn.classList.remove("bg-white", "text-black");
      btn.classList.add("bg-black", "text-white");
    }
  });
}


function togglePlayBar() {
  if (readAloudMode) {
    document.getElementById("play-bar").classList.remove("hidden");
    setCookie("playBarVisible", "true", 7); // Save state in cookie
  } else {
    document.getElementById("play-bar").classList.add("hidden");
    setCookie("playBarVisible", "false", 7); // Save state in cookie
    stopAudio();
    unhighlightAllElements();
  }
}

function togglePlayBarSettings() {
  let readAloudSettings = document.getElementById("read-aloud-settings");
  if (readAloudSettings.classList.contains("opacity-0")) {
    readAloudSettings.classList.add(
      "opacity-100",
      "pointer-events-auto",
      "h-auto"
    );
    readAloudSettings.classList.remove(
      "opacity-0",
      "pointer-events-none",
      "h-0"
    );
  } else {
    readAloudSettings.classList.remove(
      "opacity-100",
      "pointer-events-auto",
      "h-auto"
    );
    readAloudSettings.classList.add("h-0", "opacity-0", "pointer-events-none");
  }
}

function setPlayPauseIcon() {
  if (isPlaying) {
    document.getElementById("read-aloud-play-icon").classList.add("hidden");
    document.getElementById("read-aloud-pause-icon").classList.remove("hidden");
  } else {
    document.getElementById("read-aloud-play-icon").classList.remove("hidden");
    document.getElementById("read-aloud-pause-icon").classList.add("hidden");
  }
}

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (eli5Audio) {
    eli5Audio.pause();
    eli5Audio = null;
  }
  isPlaying = false;
  eli5Active = false;
  setPlayPauseIcon();
  //currentIndex = 0;  // Reset the index when stopping
}

function changeAudioSpeed(event) {
  // Get the button that was clicked
  const button = event.target.closest('.read-aloud-change-speed');

  // Extract the speed value from the class
  let speedClass = Array.from(button.classList).find((cls) =>
    cls.startsWith("speed-")
  );
  audioSpeed = speedMapping[speedClass];
  document.getElementById("read-aloud-speed").innerHTML = button.innerHTML;

  // Save the audio speed to a cookie
  setCookie("audioSpeed", audioSpeed, 7);

  // Check if currentAudio or eli5Audio is not empty
  if (currentAudio || eli5Audio) {
    // Change the playBackRate to the current speed
    if (currentAudio) {
      currentAudio.playbackRate = audioSpeed;
    }
    if (eli5Audio) {
      eli5Audio.playbackRate = audioSpeed;
    }
  }
  selectedSpeedButton(audioSpeed);
}

// Highlight text while audio is playing
function highlightElement(element) {
  if (element) {
    element.classList.add(
      "outline-dotted",
      "outline-yellow-500",
      "outline-4",
      "box-shadow-outline",
      "rounded-lg"
    );
  }
}

function unhighlightElement(element) {
  if (element) {
    element.classList.remove(
      "outline-dotted",
      "outline-yellow-500",
      "outline-4",
      "box-shadow-outline",
      "rounded-lg"
    );
  }
}

function unhighlightAllElements() {
  document.querySelectorAll(".outline-dotted").forEach((element) => {
    element.classList.remove(
      "outline-dotted",
      "outline-yellow-500",
      "outline-4",
      "box-shadow-outline",
      "rounded-lg"
    );
  });
}

function handleElementClick(event) {
  if (readAloudMode) {
    const element = event.currentTarget;
    const dataId = element.getAttribute("data-id");

    // Check if element or its parent is a word-card
    const isWordCard = element.classList.contains('word-card') ||
      element.closest('.word-card') !== null;

    // Remove highlighting from other elements
    document.querySelectorAll(".outline-dotted").forEach((el) => {
      if (el !== element && !element.contains(el)) {
        unhighlightElement(el);
      }
    });

    // Handle main content clicks, not eli5 content
    if (!dataId.startsWith("sectioneli5")) {
      const audioSrc = audioFiles[dataId];
      if (audioSrc) {
        stopAudio();
        currentAudio = new Audio(audioSrc);
        highlightElement(element);
        currentAudio.playbackRate = parseFloat(audioSpeed);
        currentAudio.play();
        // Update currentIndex but don't auto-advance
        currentIndex = audioElements.findIndex((item) => item.id === dataId);

        currentAudio.onended = () => {
          unhighlightElement(element);
          isPlaying = false;
          setPlayPauseIcon();
        };

        currentAudio.onerror = () => {
          unhighlightElement(element);
          isPlaying = false;
          setPlayPauseIcon();
        };

        isPlaying = true;
        setPlayPauseIcon();
      }
    }
  }
}

// Toggle the left nav bar, Toggle Menu
function toggleNav() {
  const navToggle = document.querySelector(".nav__toggle");
  const navList = document.querySelector(".nav__list");
  const navLinks = document.querySelectorAll(".nav__list-link");
  const navPopup = document.getElementById("navPopup");

  if (!navList || !navToggle || !navLinks || !navPopup) {
    return; // Exit if elements are not found
  }

  const isNavOpen = !navList.hasAttribute("hidden");
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  console.log("toggleNav - Nav is open:", isNavOpen);

  if (isNavOpen) {
    const scrollPosition = navList.scrollTop;
    setCookie("navScrollPosition", scrollPosition, 7, basePath);
    navToggle.setAttribute("aria-expanded", "false");
    navList.setAttribute("hidden", "true");
    setCookie("navState", "closed", 7, basePath);
  } else {
    navToggle.setAttribute("aria-expanded", "true");
    navList.removeAttribute("hidden");
    setCookie("navState", "open", 7, basePath);

    // First restore the saved position immediately
    const savedPosition = getCookie("navScrollPosition");
    if (savedPosition) {
      navList.scrollTop = parseInt(savedPosition);
    }

    // Find the active link
    const activeLink = Array.from(navLinks).find(
      link => link.getAttribute("href") === currentPath
    );

    if (activeLink) {
      // Make the active link focusable and give it focus for keyboard navigation
      activeLink.setAttribute("tabindex", "0");

      setTimeout(() => {
        const linkRect = activeLink.getBoundingClientRect();
        const navRect = navList.getBoundingClientRect();
        const isInView = (
          linkRect.top >= navRect.top &&
          linkRect.bottom <= navRect.bottom
        );

        if (!isInView) {
          activeLink.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        activeLink.focus({ preventScroll: true });
      }, 100);
    }
  }

  navPopup.classList.toggle("-translate-x-full");
  navPopup.setAttribute(
    "aria-hidden",
    navPopup.classList.contains("-translate-x-full") ? "true" : "false"
  );
  navPopup.classList.toggle("left-2");
}

// Next and previous pages
// Update previousPage and nextPage similarly
function previousPage() {
  const currentHref = window.location.href.split("/").pop() || "index.html";
  const navItems = document.querySelectorAll(".nav__list-link");
  const navList = document.querySelector(".nav__list");
  const mainContent = document.querySelector('[role="main"]');

  for (let i = 0; i < navItems.length; i++) {
    if (navItems[i].getAttribute("href") === currentHref && i > 0) {
      const scrollPosition = navList?.scrollTop || 0;
      setCookie("navScrollPosition", scrollPosition, 7, basePath);

      // Cache current interface state
      cacheInterfaceElements();

      if (mainContent) {
        mainContent.classList.add('opacity-0');
      }

      setTimeout(() => {
        window.location.href = navItems[i - 1].getAttribute("href");
      }, 150);
      break;
    }
  }
}

function nextPage() {
  const currentHref = window.location.href.split("/").pop() || "index.html";
  const navItems = document.querySelectorAll(".nav__list-link");
  const navList = document.querySelector(".nav__list");
  const mainContent = document.querySelector('[role="main"]');

  for (let i = 0; i < navItems.length; i++) {
    if (navItems[i].getAttribute("href") === currentHref && i < navItems.length) {
      const scrollPosition = navList?.scrollTop || 0;
      setCookie("navScrollPosition", scrollPosition, 7, basePath);

      // Cache current interface state
      cacheInterfaceElements();

      if (mainContent) {
        mainContent.classList.add('opacity-0');
      }

      setTimeout(() => {
        window.location.href = navItems[i + 1].getAttribute("href");
      }, 150);
      break;
    }
  }
}
// Easy-Read Mode Functionality

// Function to toggle Easy-Read mode
function toggleEasyReadMode() {
  easyReadMode = !easyReadMode;
  setCookie("easyReadMode", easyReadMode, 7);
  toggleCheckboxState("toggle-easy", easyReadMode);

  // Update the aria-pressed attribute
  // toggleButton.setAttribute("aria-pressed", easyReadMode);

  stopAudio();
  currentLanguage = document.getElementById("language-dropdown").value;
  fetchTranslations();
  gatherAudioElements(); // Call this after fetching translations to update audio elements
}

// Function to load Easy-Read mode state from the cookie
function loadEasyReadMode() {
  const easyReadModeCookie = getCookie("easyReadMode");


  if (easyReadModeCookie !== "") {
    easyReadMode = easyReadModeCookie === "true";

    toggleCheckboxState("toggle-easy", easyReadMode);

    // Update the aria-pressed attribute
    //toggleButton.setAttribute("aria-pressed", easyReadMode);

    stopAudio();
    currentLanguage = document.getElementById("language-dropdown").value;
    fetchTranslations();
    gatherAudioElements(); // Call this after fetching translations to update audio elements
  }
}

// Functionalities to store variables in the cookies
function setCookie(name, value, days = 7, path = "/") {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=" + path;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function eraseCookie(name) {
  document.cookie = name + "=; Max-Age=-99999999; path=" + path;
}
