import axios from "axios";

const movieBaseUrl="https://api.themoviedb.org/3"
const API_KEY=api_key
const movieByGenreBaseURL='https://api.themoviedb.org/3/discover/movie?api_key='+API_KEY;


//https://api.themoviedb.org/3/trending/all/day?api_key=1d60b0f2d1f9bec7f3ec40d15335c3be 

const getTrendingVideos=axios.get(movieBaseUrl+
    "/trending/all/day?api_key="+API_KEY);
    const getMovieByGenreId=(id)=>
    axios.get(movieByGenreBaseURL+"&with_genres="+id)

    


export default{
    getTrendingVideos,
    getMovieByGenreId
}
