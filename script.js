// Constants and Variables
const STORIES_PER_LOAD = 10;
let maxItems = 0;
let currentIndex = 0;
let isLoading = false;
let activeType = "top";
let items = {
    story: [],
    poll: [],
    job: []
};

const API_URLS = {
    top: "https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty",
    story: "https://hacker-news.firebaseio.com/v0/newstories.json?print=pretty",
    poll: "https://hacker-news.firebaseio.com/v0/askstories.json?print=pretty",
    job: "https://hacker-news.firebaseio.com/v0/jobstories.json?print=pretty"
};

async function initHackerNews() {
    
    filterChoise();
    try {
        //await fetchMaxItem();
        await filterItems();
        addScrollListener();
    } catch (error) {
        console.error("Error initializing Hacker News:", error);
    }
}

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
    loader();
    const header = document.getElementById("headers");
    if (header) {
        header.addEventListener("click",async (event) => {
            if (event.target.classList.contains("btn")) {
               
                activeType = event.target.id;
                console.log(activeType);
                currentIndex = 0;
                updateElement();
                await filterItems();
            }
        });
    }
}


function addScrollListener() {
    window.addEventListener("scroll", debounce(handleScroll, 1000));
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
    console.log(activeType);
    
    console.log(API_URLS[activeType]);

    const resp = await fetch(API_URLS[activeType]);
    if (!resp.ok) throw new Error("Fetch error");

    items[activeType] = await resp.json();  
    console.log(items);
    
    currentIndex = 0; 
    updateElement();
}
function updateElement() {
    const container = document.getElementById("constainer");
    container.innerHTML = "";
    currentIndex = 0;
    loadMore();
}

async function loadMore() {
    if (isLoading || currentIndex >= items[activeType].length) return;

    isLoading = true;
    document.getElementById("loading").style.display = "block";

    const endIndex = Math.min(currentIndex + STORIES_PER_LOAD, items[activeType].length);
    const idsToFetch = items[activeType].slice(currentIndex, endIndex);


    const fetchPromises = idsToFetch.map(fetchData);
    const results = await Promise.all(fetchPromises);
console.log(results);

    const validResults = results.filter(data => data && !data.dead && !data.deleted);
    
    const container = document.getElementById("constainer");
    validResults.forEach(story => container.appendChild(displayItem(story)));

    currentIndex = endIndex;
    isLoading = false;
    document.getElementById("loading").style.display = "none";
}

function displayItem(item) {
    const content = document.createElement("div");
    content.classList.add("content", item.type);

    const header = document.createElement("div");
    header.innerHTML = `
        <h2 class="typeitem">${item.type.toUpperCase()}</h2>
        <p>${item.title || "No title"}</p>
        ${item.url ? `<a href="${item.url}" target="_blank">Read more →</a>` : ''}
        ${item.score ? `<div class="score">${item.score} points</div>` : ''}
        ${item.time ? `<div class="time">Posted ${new Date(item.time * 1000).toLocaleString()}</div>` : ''}
    `;

    content.appendChild(header);


    if (item.type === 'story') {
        if (item.text) {
            const storyText = document.createElement("div");
            storyText.className = "story-text";
            storyText.innerHTML = item.text;
            content.appendChild(storyText);
        }
    }

    // if ( (item.type === 'story' && item.parts)) {
        
    //     const type= document.querySelector(".typeitem")
    //     type.innerHTML="Poll"
    //     const pollOptions = document.createElement("div");
    //     pollOptions.className = "poll-options";
    //     const optionsTitle = document.createElement("h3");
    //     optionsTitle.textContent = "Poll Options";
    //     pollOptions.appendChild(optionsTitle);

    //     item.parts.forEach(async (optionId) => {
    //         const option = await fetchData(optionId);
    //         if (option && !option.deleted) {
    //             const optionDiv = document.createElement("div");
    //             optionDiv.className = "poll-option";
    //             optionDiv.innerHTML = `
    //                 <div class="option-text">${option.text}</div>
    //                 ${option.score ? `<div class="option-score">${option.score} points</div>` : ''}
    //             `;
    //             pollOptions.appendChild(optionDiv);
    //         }
    //     });

    //     content.appendChild(pollOptions);
    // }

    if (item.type === 'job' && item.text) {
        const jobDescription = document.createElement("div");
        jobDescription.className = "job-description";
        jobDescription.innerHTML = item.text;
        content.appendChild(jobDescription);
    }


    if (item.kids && item.kids.length > 0) {
        const commentsContainer = document.createElement("div");
        commentsContainer.className = "comments";
        const commentTitle = document.createElement("h3");
        commentTitle.textContent = `Comments (${item.kids.length})`;
        content.appendChild(commentTitle);
        content.appendChild(commentsContainer);

        const loadComments = async (ids, container, depth = 0) => {
            for (const id of ids) {
                const comment = await fetchData(id);
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
                        await loadComments(comment.kids, commentDiv, depth + 1);
                    }
                }
            }
        };

        loadComments(item.kids, commentsContainer);
    }

    return content;
}







initHackerNews();

// Function to fetch max item and update dropdown
async function fetchMaxItem() {
    try {
        const response = await fetch("https://hacker-news.firebaseio.com/v0/maxitem.json?print=pretty");
        if (!response.ok) throw new Error("Failed to fetch maxitem");

        const newMaxItem = await response.json();
        
        if (newMaxItem !== maxItems) {
            maxItems = newMaxItem;
            const itemData = await fetchData(newMaxItem);
            updateDropdown(itemData);
        } else {
            updateDropdown(null);
        }
    } catch (error) {
        console.error("Error fetching maxitem:", error);
    }
}

// Function to update the dropdown list
function updateDropdown(item) {
    const dropdown = document.getElementById("dropdown");

    dropdown.innerHTML = ""; // Clear existing options

    if (item) {
        const option = document.createElement("option");
        option.textContent = `${item.type.toUpperCase()} - ${item.title || "No title"}`;
        dropdown.appendChild(option);
    } else {
        const noUpdateOption = document.createElement("option");
        noUpdateOption.textContent = "No update";
        dropdown.appendChild(noUpdateOption);
    }
}

// Start listening to maxitem API every 5 seconds
setInterval(fetchMaxItem, 5000);
