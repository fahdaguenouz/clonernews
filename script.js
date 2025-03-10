let maxitems = 0;
let currentIndex = 0;
const STORIES_PER_LOAD = 10;
let isLoading = false;
let activeType = "story"; 
let items = {
    story: [],
    poll: [],
    job: []
};



function listen() {
    const header = document.getElementById("headers");
    if (header) {
        header.addEventListener("click", (event) => {
            if (event.target.classList.contains("btn")) {
              console.log(event.target.id);
              
                activeType = event.target.id; 
                currentIndex = 0; 
                updateUI(); 
            }
        });
    }
}

function loader() {
    const main = document.querySelector(".main");
    const container = document.createElement("div");
    container.id = "stories-container";
    main.appendChild(container);

    const loadingIndicator = document.createElement("div");
    loadingIndicator.id = "loading";
    loadingIndicator.textContent = "Loading...";
    loadingIndicator.style.display = "block";
    main.appendChild(loadingIndicator);
}

async function HackerNews() {
    loader();
    listen();
    try {
        const resp = await fetch("https://hacker-news.firebaseio.com/v0/maxitem.json?print=pretty");
        if (!resp.ok) throw new Error("Fetch error");

        maxitems = await resp.json();
        await filterItems();
        window.addEventListener("scroll", debounce(handleScroll, 500));
    } catch (error) {
        console.error("Error fetching max item:", error);
    }
}

async function filterItems() {
    const fetchPromises = []
    for (let i = maxitems; i > maxitems - 500; i--) {
        fetchPromises.push(fetchData(i));
    }
    const results = await Promise.all(fetchPromises);
    items.story = results.filter(data => data && data.type === "story"&& !data.dead );
    items.poll = results.filter(data => data && data.type === "poll");
    items.job = results.filter(data => data && data.type === "job");
    console.log("Filtered items:", items);
    updateUI();
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
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    if (scrollTop + windowHeight >= documentHeight - 100) {
        loadMoreStories();
    }
}

function updateUI() {
    const container = document.getElementById("stories-container");
    container.innerHTML = ""; 
    currentIndex = 0; 
    loadMoreStories();
}

function loadMoreStories() {
    if (!items[activeType]) items[activeType] = []; 
    if (isLoading || currentIndex >= items[activeType].length) return;

    isLoading = true;
    document.getElementById("loading").style.display = "block";

    const endIndex = Math.min(currentIndex + STORIES_PER_LOAD, items[activeType].length);
    const storiesToLoad = items[activeType].slice(currentIndex, endIndex);

    const container = document.getElementById("stories-container");
    storiesToLoad.forEach(story => container.appendChild(display(story)));

    currentIndex = endIndex;
    isLoading = false;
    document.getElementById("loading").style.display = "none";
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

function display(story) {
    const content = document.createElement("div");
    content.classList.add("content");

    const type = document.createElement("h2");
    type.textContent = story.type || "No type";

    const txt = document.createElement("p");
    txt.textContent = story.title || "No title";

    content.appendChild(type);
    content.appendChild(txt);

    if (story.url) {
        const link = document.createElement("a");
        link.href = story.url;
        link.textContent = "Read more";
        link.target = "_blank";
        content.appendChild(link);
    }

    content.appendChild(document.createElement("hr"));
    return content;
}

HackerNews();
