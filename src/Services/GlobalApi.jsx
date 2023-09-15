import axios from "axios";

const movieBaseUrl="https://api.themoviedb.org/3"
const api_key="1d60b0f2d1f9bec7f3ec40d15335c3be"
const movieByGenreBaseURL='https://api.themoviedb.org/3/discover/movie?api_key='+api_key;


//https://api.themoviedb.org/3/trending/all/day?api_key=1d60b0f2d1f9bec7f3ec40d15335c3be 

const getTrendingVideos=axios.get(movieBaseUrl+
    "/trending/all/day?api_key="+api_key);
    const getMovieByGenreId=(id)=>
    axios.get(movieByGenreBaseURL+"&with_genres="+id)

    


export default{
    getTrendingVideos,
    getMovieByGenreId
}
