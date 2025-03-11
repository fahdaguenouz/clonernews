// Constants and Variables
const ITEMS_PER_LOAD = 20;
let maxItemId = 0;
let currentItemId = 0;
let isLoading = false;
let displayedItems = [];

async function initHackerNews() {
    try {
        await fetchMaxItem();
        startMaxItemUpdateListener()
        addScrollListener();
        setupCommentToggle();
    } catch (error) {
        console.error("Error initializing Hacker News:", error);
    }
}

function setupCommentToggle() {
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('toggle-comments')) {
            const commentsContainer = event.target.nextElementSibling;
            if (commentsContainer) {
                const isHidden = commentsContainer.style.display === 'none';
                commentsContainer.style.display = isHidden ? 'block' : 'none';
                event.target.textContent = isHidden ? 'Hide Comments' : 'Show Comments';
            }
        }
    });
}

function loader() {
    const main = document.querySelector(".main");
    
    // Create container for items if it doesn't exist
    if (!document.getElementById("container")) {
        const container = document.createElement("div");
        container.id = "container";
        main.appendChild(container);
    }
    
    // Create or update loading indicator
    let loadingIndicator = document.getElementById("loading");
    if (!loadingIndicator) {
        loadingIndicator = document.createElement("div");
        loadingIndicator.id = "loading";
        main.appendChild(loadingIndicator);
    }
    loadingIndicator.textContent = `Loading items... please wait!`;
    loadingIndicator.style.display = "block";
}

function addScrollListener() {
    window.addEventListener("scroll", throttle(handleScroll, 500));
}

function throttle(func, wait) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= wait) {
            lastCall = now;
            func.apply(this, args);
        }
    };
}

function handleScroll() {
    if (isLoading) return;
    
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    if (scrollTop + windowHeight >= documentHeight - 200) {
        loadMore();
    }
}

async function fetchData(id) {
    try {
        const resp = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json?print=pretty`);
        if (!resp.ok) throw new Error(`Fetch error for item ${id}`);
        return await resp.json();
    } catch (e) {
        console.error(`Error fetching data for item ${id}:`, e);
        return null;
    }
}


async function fetchMaxItem() {
    try {
        loader();
        const response = await fetch("https://hacker-news.firebaseio.com/v0/maxitem.json?print=pretty");
        if (!response.ok) throw new Error("Failed to fetch maxitem");
        maxItemId = await response.json();
        lastMaxItemId = maxItemId;
        currentItemId = maxItemId;
        await loadMore();
        await checkForNewHeaderItem(maxItemId);
    } catch (error) {
        console.error("Error fetching maxitem:", error);
        document.getElementById("loading").textContent = "Error loading data. Please try again.";
    }
}


async function loadMore() {
    if (isLoading || currentItemId <= 0) return;

    isLoading = true;
    document.getElementById("loading").style.display = "block";

    const itemsToFetch = [];
    let itemsToProcess = 0;
    
    // We'll try to fetch more items than needed because some may be filtered out
    const fetchLimit = ITEMS_PER_LOAD * 3;
    
    for (let i = 0; i < fetchLimit && currentItemId > 0; i++) {
        itemsToFetch.push(currentItemId--);
    }

    try {
        const fetchPromises = itemsToFetch.map(fetchData);
        const results = await Promise.all(fetchPromises);
        console.log(results);
        
        // Filter valid items (not comments, not dead, not deleted)
        const validItems = results.filter(item => 
            item && 
            item.deleted !== true && // Explicitly check for deleted property
            item.dead !== true &&    // Explicitly check for dead property
            item.type !== 'comment'
        );
        
        // Get just enough items to display
        const itemsToDisplay = validItems.slice(0, ITEMS_PER_LOAD);
        
        // If we don't have enough items, adjust the currentItemId to fetch more next time
        if (itemsToDisplay.length < ITEMS_PER_LOAD && currentItemId > 0) {
            // We'll just continue with the next batch when the user scrolls again
        }
        
        // Add items to display
        const container = document.getElementById("container");
        for (const item of itemsToDisplay) {
            displayedItems.push(item.id);
            container.appendChild(displayItem(item));
        }
    } catch (error) {
        console.error("Error loading more items:", error);
    } finally {
        isLoading = false;
        document.getElementById("loading").style.display = "none";
    }
}

function displayItem(item) {
    const content = document.createElement("div");
    content.classList.add("content", item.type);
    content.dataset.itemId = item.id;

    const header = document.createElement("div");
    header.classList.add("item-header");
    header.innerHTML = `
        <h2 class="typeitem">${item.type.toUpperCase()}</h2>
        <p class="item-title">${item.title || "No title"}</p>
        ${item.url ? `<a href="${item.url}" target="_blank" class="item-link">Read more →</a>` : ''}
        <div class="item-meta">
            ${item.by ? `<span class="item-author">by ${item.by}</span>` : ''}
            ${item.score ? `<span class="item-score">${item.score} points</span>` : ''}
            ${item.time ? `<span class="item-time">Posted ${new Date(item.time * 1000).toLocaleString()}</span>` : ''}
        </div>
    `;

    content.appendChild(header);

    // Display text content based on type
    if (item.text) {
        const itemText = document.createElement("div");
        itemText.className = "item-text";
        itemText.innerHTML = item.text;
        content.appendChild(itemText);
    }

    // Handle poll type (items with parts)
    if (item.parts && item.parts.length > 0) {
        const pollContainer = document.createElement("div");
        pollContainer.className = "poll-container";
        const pollTitle = document.createElement("h3");
        pollTitle.textContent = "Poll Options";
        pollContainer.appendChild(pollTitle);
        content.appendChild(pollContainer);

        loadPollOptions(item.parts, pollContainer);
    }

    // Handle comments
    if (item.kids && item.kids.length > 0) {
        const commentsButton = document.createElement("button");
        commentsButton.className = "toggle-comments";
        commentsButton.textContent = "Show Comments";
        content.appendChild(commentsButton);

        const commentsContainer = document.createElement("div");
        commentsContainer.className = "comments-container";
        commentsContainer.style.display = "none";
        
        const commentCount = document.createElement("div");
        commentCount.className = "comment-count";
        commentCount.textContent = `${item.kids.length} comment${item.kids.length !== 1 ? 's' : ''}`;
        commentsContainer.appendChild(commentCount);
        
        content.appendChild(commentsContainer);

        // Set up lazy loading of comments when the button is first clicked
        commentsButton.addEventListener('click', function() {
            // Only load comments the first time the button is clicked
            if (commentsContainer.children.length === 1) { // Only has the comment count
                loadCommentsRecursively(item.kids, commentsContainer);
            }
        }, { once: true });
    }

    return content;
}

async function loadPollOptions(optionIds, container) {
    for (const optionId of optionIds) {
        const option = await fetchData(optionId);
        if (option && option.deleted !== true && option.dead !== true) {
            const optionDiv = document.createElement("div");
            optionDiv.className = "poll-option";
            optionDiv.innerHTML = `
                <div class="option-text">${option.text || ''}</div>
                ${option.score ? `<div class="option-score">${option.score} points</div>` : ''}
            `;
            container.appendChild(optionDiv);
        }
    }
}
async function loadCommentsRecursively(commentIds, container) {
    if (!commentIds || commentIds.length === 0) return;
    
    const loadingComment = document.createElement("div");
    loadingComment.className = "loading-comments";
    loadingComment.textContent = "Loading comments...";
    container.appendChild(loadingComment);
    
    let validCommentsCount = 0; // Track valid comments

    for (const id of commentIds) {
        const comment = await fetchData(id);
        
        // Skip if comment is null, deleted, or dead
        if (!comment || comment.deleted === true || comment.dead === true) {
            console.log(` comment ${id}: deleted=${comment?.deleted}, dead=${comment?.dead}`);
            continue;
        }
        
        validCommentsCount++;

        // Create comment element
        const commentDiv = document.createElement("div");
        commentDiv.className = "comment";
        commentDiv.style.marginLeft = "20px";
        commentDiv.dataset.commentId = comment.id;
        
        commentDiv.innerHTML = `
            <div class="comment-meta">
                ${comment.by ? `<span class="comment-author">by ${comment.by}</span>` : ''}
                ${comment.time ? `<span class="comment-time">${new Date(comment.time * 1000).toLocaleString()}</span>` : ''}
            </div>
            <div class="comment-text">${comment.text || ''}</div>
        `;
        
        container.appendChild(commentDiv);
    }

    // Remove loading indicator
    container.removeChild(loadingComment);

    // Update comment count only for the top level
    if (depth === 0) {
        const commentCountEl = container.querySelector('.comment-count');
        if (commentCountEl) {
            commentCountEl.textContent = `${validCommentsCount} comment${validCommentsCount !== 1 ? 's' : ''}`;
        }
    }
}



let lastMaxItemId = 0;
let currentHeaderItemId = 0;


function startMaxItemUpdateListener() {
    setInterval(async () => {
        try {
            const response = await fetch("https://hacker-news.firebaseio.com/v0/maxitem.json?print=pretty");
            if (!response.ok) throw new Error("Failed to fetch maxitem for update");
            const newMaxItemId = await response.json();
            
            if (newMaxItemId !== lastMaxItemId) {
                lastMaxItemId = newMaxItemId;
                await checkForNewHeaderItem(newMaxItemId);
            }
        } catch (error) {
            console.error("Error updating maxitem:", error);
        }
    }, 5000);
}

async function checkForNewHeaderItem(startId) {
    let checkId = startId;
    let attempts = 0;
    const MAX_ATTEMPTS = 50;

    while (attempts < MAX_ATTEMPTS && checkId > 0) {
        const item = await fetchData(checkId);
        
        if (item && item.type && (item.title || item.text) && item.id !== currentHeaderItemId) {
            currentHeaderItemId = item.id;
            updateHeaderMaxItem(item);
            return;
        }
        
        checkId--;
        attempts++;
    }
}

function updateHeaderMaxItem(item) {
    const headerElement = document.getElementById("header-max-item");
    if (!headerElement) return;

    headerElement.innerHTML = `
        <h2>Latest: ${item.type.toUpperCase()}</h2>
        <p>${item.title || item.text || 'No Content'}</p>
    `;
}

initHackerNews();

