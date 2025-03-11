const ITEMS_PER_LOAD = 20;
let maxItemId = 0;
let currentItemId = 0;
let isLoading = false;
let lastMaxItemId = 0;
let currentHeaderItemId = 0;
let displayedItems = [];

async function initHackerNews() {
    try {
        await fetchMaxItem();
        updateHedear()
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
    if (!document.getElementById("container")) {
        const container = document.createElement("div");
        container.id = "container";
        main.appendChild(container);
    }

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
    return function (...args) {
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

    const fetchLimit = ITEMS_PER_LOAD * 3;

    for (let i = 0; i < fetchLimit && currentItemId > 0; i++) {
        itemsToFetch.push(currentItemId--);
    }

    try {
        const fetchPromises = itemsToFetch.map(fetchData);
        const results = await Promise.all(fetchPromises);
        console.log(results);
        const validItems = results.filter(item =>
            item &&
            item.deleted !== true &&
            item.dead !== true &&
            item.type !== 'comment'
        );

        const displayitm = validItems.slice(0, ITEMS_PER_LOAD);

        const container = document.getElementById("container");
        for (const item of displayitm) {
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
    if (item.text) {
        const itemText = document.createElement("div");
        itemText.className = "item-text";
        itemText.innerHTML = item.text;
        content.appendChild(itemText);
    }

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
        commentCount.textContent = `${item.kids.length} comments`;
        commentsContainer.appendChild(commentCount);

        content.appendChild(commentsContainer);

        commentsButton.addEventListener('click', function () {
            console.log(commentsContainer.children);

            if (commentsContainer.children.length === 1) {
                fetchcomment(item.kids, commentsContainer);
            }
        }, { once: true });
    }

    return content;
}
async function fetchcomment(commentIds, container) {
    if (!commentIds || commentIds.length === 0) return;

    const loadingComment = document.createElement("div");
    loadingComment.className = "loading-comments";
    loadingComment.textContent = "Loading comments...";
    container.appendChild(loadingComment);
    try {
        const comments = await Promise.all(commentIds.map(fetchData));
        console.log(comments);
        const validComments = comments.filter(comment =>
            comment && !comment.deleted && !comment.dead
        );
        console.log(`Valid comments fetched: ${validComments.length}`);
        const commentCountDiv = container.querySelector(".comment-count");
        if (commentCountDiv) {
            commentCountDiv.textContent = `${validComments.length} comments`;
        }
        for (const comment of validComments) {
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
    } catch (error) {
        console.error("Error fetching comments:", error);
    } finally {
        container.removeChild(loadingComment);
    }
}


function updateHedear() {
    async function updateMaxItem() {
        try {
            const response = await fetch("https://hacker-news.firebaseio.com/v0/maxitem.json?print=pretty");
            if (!response.ok) throw new Error("Failed to fetch maxitem");

            const newMaxItemId = await response.json();
            if (newMaxItemId !== lastMaxItemId) {
                lastMaxItemId = newMaxItemId;
                await checkForNewHeaderItem(newMaxItemId);
            }
        } catch (error) {
            console.error("Error updating maxitem:", error);
        } finally {
            setTimeout(updateMaxItem, 5000);
        }
    }
    updateMaxItem();
}


async function checkForNewHeaderItem(itemId) {
    if (itemId === currentHeaderItemId) return;

    const item = await fetchData(itemId);
    if (item && item.id !== currentHeaderItemId) {
        currentHeaderItemId = item.id;
        updateHeaderMaxItem(item);
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

