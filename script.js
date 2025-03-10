// Constants and Variables
const STORIES_PER_LOAD = 10;
let maxItems = 0;
let currentIndex = 0;
let isLoading = false;
let activeType = "story";
let items = {
    story: [],
    poll: [],
    job: []
};

async function initHackerNews() {
    loader();
    filterChoise();
    try {
        await fetchMaxItem();
        await filterItems();
        addScrollListener();
    } catch (error) {
        console.error("Error initializing Hacker News:", error);
    }
}

// Setup UI components
function loader() {
    const main = document.querySelector(".main");
    const container = document.createElement("div");
    container.id = "constainer";
    main.appendChild(container);
    const loadingIndicator = document.createElement("div");
    loadingIndicator.id = "loading";
    loadingIndicator.textContent = `Loading...  it may take some time !!`;
    loadingIndicator.style.display = "block";
    main.appendChild(loadingIndicator);
}

function filterChoise() {
    const header = document.getElementById("headers");
    if (header) {
        header.addEventListener("click", (event) => {
            if (event.target.classList.contains("btn")) {
                activeType = event.target.id;
                currentIndex = 0;
                updateElement();
            }
        });
    }
}


async function fetchMaxItem() {
    const resp = await fetch("https://hacker-news.firebaseio.com/v0/maxitem.json?print=pretty");
    if (!resp.ok) throw new Error("Fetch error");
    maxItems = await resp.json();
}

function addScrollListener() {
    window.addEventListener("scroll", debounce(handleScroll, 500));
}

function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

function handleScroll() {
    if (isLoading) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    console.log(window.scrollY);
    console.log(document.documentElement.scrollTop);
    
    
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    if (scrollTop + windowHeight >= documentHeight - 100) {
        loadMore();
    }
}

async function fetchData(id) {
    try {
        const resp = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json?print=pretty`);
        if (!resp.ok) throw new Error("Fetch error");
        return await resp.json();
    } catch (e) {
        console.error("Error fetching data:", e);
        return null;
    }
}


async function filterItems() {
    const fetchPromises = [];
    let latestitem = maxItems
    for (let i = maxItems; i > maxItems - 500; i--) {
        latestitem = i
        fetchPromises.push(fetchData(i));
    }
    const results = await Promise.all(fetchPromises);
    items.story = results.filter(data => data && data.type === "story" && !data.dead &&!data.deleted);
    items.poll = results.filter(data => data && data.type === "poll");
    items.job = results.filter(data => data && data.type === "job");
    console.log("Filtered items:", items);
    updateElement();
}
function updateElement() {
    const container = document.getElementById("constainer");
    container.innerHTML = "";
    currentIndex = 0;
    loadMore();
}

function loadMore() {
    if (!items[activeType]) items[activeType] = [];
    if (isLoading || currentIndex >= items[activeType].length) return;

    isLoading = true;
    document.getElementById("loading").style.display = "block";

    const endIndex = Math.min(currentIndex + STORIES_PER_LOAD, items[activeType].length);
    const storiesToLoad = items[activeType].slice(currentIndex, endIndex);

    const container = document.getElementById("constainer");
    storiesToLoad.forEach(story => container.appendChild(displayStory(story)));

    currentIndex = endIndex;
    isLoading = false;
    document.getElementById("loading").style.display = "none";
}

function displayStory(story) {
    const content = document.createElement("div");
    content.classList.add("content", story.type);

    const header = document.createElement("div");
    header.innerHTML = `
        <h2>${story.type.toUpperCase()}</h2>
        <p>${story.title || "No title"}</p>
        ${story.url ? `<a href="${story.url}" target="_blank">Read more →</a>` : ''}
        ${story.score ? `<div class="score">${story.score} points</div>` : ''}
        ${story.time ? `<div class="time">Posted ${new Date(story.time * 1000).toLocaleString()}</div>` : ''}
    `;

    content.appendChild(header);

    if (story.kids && story.kids.length > 0) {
        const commentsContainer = document.createElement("div");
        commentsContainer.className = "comments";
        const commentTitle = document.createElement("h3");
        commentTitle.textContent = `Comments (${story.kids.length})`;
        content.appendChild(commentTitle);
        content.appendChild(commentsContainer);

        const loadComments = async (ids, container, depth = 0) => {
            for (const id of ids) {
                const comment = await fetchData(id);
                // Check for deleted property first
                if (!comment || comment.deleted) {
                    const deletedDiv = document.createElement("div");
                    deletedDiv.className = "comment deleted";
                    deletedDiv.style.paddingLeft = `${depth * 20}px`;
                    deletedDiv.textContent = "[deleted]";
                    container.appendChild(deletedDiv);
                    continue;
                }

                if (comment.text) {
                    const commentDiv = document.createElement("div");
                    commentDiv.className = "comment";
                    commentDiv.style.paddingLeft = `${depth * 20}px`;
                    commentDiv.innerHTML = `
                        <div class="comment-meta">
                            ${comment.by ? `<span class="author">by ${comment.by}</span>` : ''}
                            ${comment.time ? `<span class="time">${new Date(comment.time * 1000).toLocaleString()}</span>` : ''}
                        </div>
                        <div class="comment-text">${comment.text}</div>
                    `;

                    container.appendChild(commentDiv);

                    if (comment.kids && comment.kids.length > 0) {
                        const subcommentTitle = document.createElement("h3");
                        subcommentTitle.textContent = `Sub Comments (${comment.kids.length})`;
                        commentDiv.appendChild(subcommentTitle)
                        await loadComments(comment.kids, commentDiv, depth + 1);
                    }
                }
            }
        };

        loadComments(story.kids, commentsContainer);
    }

    return content;
}

initHackerNews();
