let maxitems =0;
let currentIndex = 0;
const STORIES_PER_LOAD = 10;
let isLoading = false;
let comment= []
let stories= []
let polls= []
let jobs= []



function listen(){
  const header=document.getElementById("headers")
  header.addEventListener("click" ,(event)=>{
    console.log(event.target.id);
  })
}
listen()

function loader(){
  const main=document.querySelector(".main")
     const container = document.createElement("div");
     container.id = "stories-container";
     main.appendChild(container);
     const loadingIndicator = document.createElement("div");
     loadingIndicator.id = "loading";
     loadingIndicator.textContent = "Loading...";
     main.appendChild(loadingIndicator);
}


 async function HackerNews(){
     loader()
    const resp= await fetch("https://hacker-news.firebaseio.com/v0/maxitem.json?print=pretty")
    if(!resp.ok){
        throw new Error("fetch error")
        
    }
    maxitems=await resp.json()
    
   // await loadMoreStories();
  

   // window.addEventListener("scroll", debounce(handleScroll, 1000));
}

async function filterItems(){
  await HackerNews()
  let data={}
  for(let i= maxitems;i>=maxitems-20;i--){
    console.log(i);
    data =await fetchData(i)
              console.log("filter",data );
        if(data.type==="story"){
          stories.push(data)

        }
        
      }
      console.log("story",data);
}


function debounce(func, delay) {
    let timeout;
    return function(args) {

      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this,args), delay);
    };
  }

  
function handleScroll() {
    if (isLoading) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    if (scrollTop + windowHeight >= documentHeight - 200) {
      loadMoreStories();
    }
  }

  async function loadMoreStories() {
    if (isLoading || currentIndex >= stories.length) return;
    
    isLoading = true;
    document.getElementById("loading").style.display = "block";
    
    const endIndex = Math.min(currentIndex + STORIES_PER_LOAD, stories.length);
    const storiesToLoad = maxitems.slice(currentIndex, endIndex);
    const main=document.querySelector('.main')
    const container=document.createElement('div')
    container.classList.add('container')
    for (const id of storiesToLoad) {
      const storyData = await fetchData(id);
      container.appendChild(display(storyData));
    }

    main.appendChild(container)
    currentIndex = endIndex;
    isLoading = false;
    document.getElementById("loading").style.display = "none";
    
    console.log(`Loaded stories ${currentIndex - STORIES_PER_LOAD} to ${currentIndex-1}`);
  }

async function fetchData(ids){
    let data=[]
    try{
        const resp= await fetch(`https://hacker-news.firebaseio.com/v0/item/${ids}.json?print=pretty`)
        if(!resp.ok){
            throw new Error("fetch error")
        }
        data= await resp.json()
        
        
    }catch(e){
        console.log(e);
        return {}
    }
    return data 
}


function display(story) {
const content=document.createElement('div')
content.classList.add("content")
    const type = document.createElement("h2");
    const txt = document.createElement("p");
    const hr = document.createElement("hr");
    type.textContent = story.type || "No type";
    txt.textContent = story.title || "No title";
    content.appendChild(type);
    content.appendChild(txt)
    if (story.url) {
        const link = document.createElement("a");
        link.href = story.url;
        link.textContent = "Read more";
        link.target = "_blank";
        content.appendChild(link);
    }
    content.appendChild(hr);
    return content
}

 //HackerNews()

filterItems()