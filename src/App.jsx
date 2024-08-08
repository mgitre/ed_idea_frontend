import { useState, useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import "./App.css";
import { Tooltip } from "react-tooltip";
import 'react-tooltip/dist/react-tooltip.css'
import ReactDOMServer from 'react-dom/server';

export default function App() {
  return (
      <Routes>
        <Route path="/" element={<Home />}>
        </Route>
      </Routes>
  );
}

function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  
  return (
    <div className="App">
      <div className="App-header">
        Search IDEA
        <SearchBar />
      </div>
      <SearchResults />
    </div>
  );
}

function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  function get_search_query(loc_instance) {
    const search = new URLSearchParams(loc_instance.search);
    return search.get("q");
  }
  const currentSearch = get_search_query(location);
  useEffect(() => {
    if (currentSearch) {
      setSearchQuery(currentSearch);
    }
  }, [currentSearch]);
  function handleSearch(e) {
    e.preventDefault();
    navigate(`?q=${searchQuery}`);
  }
  return (
    <form onSubmit={handleSearch} style={{display: "flex", width: "100%"}}>
    <div className="search-container">
      
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
          
        />
        <button type="submit" className="search-button">
        🔎
        </button>
      
    </div>
    </form>
  );
}

function make_tooltip(citation_number, source) {
  //citation_number is just the # to show (what's tooltipped)
  //source is the source to show, formatted as:
  // [
  // source_text (a string),
  // metadata (a dict with keys description, document_link, document_title, parent_link, parent_title, topic_area)
  // ]
  //our tooltip will have a title hyperlinking to the document_link, and show the source_text
  //source begins with Source X: -- we want to remove that
  const source_text = source[0].replace(/^Source \d+:\s+/, "");
  return <a data-tooltip-id="tooltip" data-tooltip-html={
    ReactDOMServer.renderToStaticMarkup(
    <div className="tooltip-content">     
      <h3><a href={source[1].document_link} target="_blank" rel="noreferrer">{source[1].document_title}</a></h3>
      <p>{source_text}</p>
    </div>)
  } className="tooltip_a">[{citation_number}]</a>
}

function displayResults(results) {
  //if results isn't of the form {response: "some response", sources: ["snippet", metadata]} then return null
  if (!results || !results.response) {
    return null;
  }
  //citations will look like this: Statement [5] and another statement [2]. Statement [17]. etc
  //we want to split our response to look like this: ["Statement ", "[5]", " and another statement ", "[2]", ". Statement ", "[17]", ". etc"]
  const response = results.response;
  //regex to split the response into the format above
  const splitResponse = response.split(/(\[\d+\])/);
  //now we want to replace every citation with a tooltip that shows the source
  const citations_renumbered = {};
  //iterate over splitResponse and replace every citation with a tooltip
  let i=1;
  const to_display_list = []
  for (const part of splitResponse) {
    //regex match
    const match = part.match(/\[(\d+)\]/);
    //if we have a match, we have a citation
    if (match) {
      const matched_number = match[1];
      const source_number = parseInt(matched_number) - 1;
      if (!citations_renumbered[source_number]) {
        citations_renumbered[source_number] = i;
        i++;
      }
      const tooltip = make_tooltip(citations_renumbered[source_number], results.sources[source_number]);
      to_display_list.push(tooltip);
    }
    else {
      to_display_list.push(part);
    }
  }
  //make it jsx
  return <>
    {to_display_list}
  </>
}


function SearchResults() {
  const location = useLocation();
  function get_search_query(loc_instance) {
    const search = new URLSearchParams(loc_instance.search);
    return search.get("q");
  }
  const searchQuery = get_search_query(location);
  //messing with async time! gotta fetch our results
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({});
  const [error, setError] = useState(null);
  useEffect(() => {
    async function fetchResults() {
      if (!searchQuery) {
        setLoading(false);
        return;
      }
      console.log("fetching results for", searchQuery);
      setLoading(true);
      try {
        //query with POST
        const response = await fetch("http://localhost:5000/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: searchQuery }),
        });
        const data = await response.json();
        setResults(data);
        setLoading(false);
        setError(null);
      } catch (error) {
        setError(error);
        setLoading(false);
        setResults({});
      }
    }
    fetchResults();
  }, [searchQuery]);
  return (
    <div className="search-results">
      {loading && <div className="loading-wrapper"><div className="lds-dual-ring"></div></div>}
      {error && <div className="error">An error occurred: {error.message}</div>}
      {results && results.response && (
        <div>
          <h2>Results for "{searchQuery}"</h2>
            {displayResults(results)}
            <Tooltip id="tooltip" style={{backgroundColor: "black", color: "white"}} clickable opacity={1} />
        </div>
      )}
    </div>
  );
}