'use client'; // Required for Next.js interactive state

import { useState, useEffect } from 'react';

// Define the shape of a recommendation object returned by your Python API
interface Recommendation {
  movie: string;
  score: number;
}

export default function MovieRecommender() {
  // Add explicit TypeScript types to your React hooks
  const [movies, setMovies] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const API_URL = 'http://localhost:8000/api';

  // Fetch the full movie list for the select dropdown on load
  useEffect(() => {
    fetch(`${API_URL}/movies`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch movie list');
        return res.json();
      })
      .then((data: { movies: string[] }) => {
        setMovies(data.movies);
        if (data.movies.length > 0) {
          setSelectedMovie(data.movies[0]);
        }
      })
      .catch((err) => {
        setError('❌ Could not connect to the Python ML server. Make sure it is running on port 8000.');
        console.error(err);
      });
  }, []);

  // Post the selected movie to get recommendation scores
  const handleRecommend = async () => {
    if (!selectedMovie) return;
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie: selectedMovie }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setRecommendations(data.recommendations);
      } else {
        setError(data.detail || 'Failed to get recommendations.');
      }
    } catch (err) {
      setError('An error occurred while communicating with the backend.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '20px', backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: '#333' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎬 Movie Recommender</h1>
      <p style={{ color: '#555', marginBottom: '30px' }}>
        Select a movie you like, and we'll recommend others based on your custom local keywords file!
      </p>

      {error && (
        <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '4px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="movie-select" style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
          Choose a movie:
        </label>
        <select
          id="movie-select"
          value={selectedMovie}
          onChange={(e) => setSelectedMovie(e.target.value)}
          style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fafafa', color: '#333' }}
        >
          {movies.map((movie) => (
            <option key={movie} value={movie}>
              {movie}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleRecommend}
        disabled={loading || movies.length === 0}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          fontWeight: 'bold',
          backgroundColor: '#ff4b4b', // Streamlit theme red/coral flavor
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Crunching Similarity Scores...' : 'Recommend'}
      </button>

      {recommendations.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', borderBottom: '2px solid #eaeaea', paddingBottom: '10px' }}>
            If you liked <strong>{selectedMovie}</strong>, you might also like:
          </h2>
          
          {recommendations.map((item) => (
            <div key={item.movie} style={{ padding: '15px 0', borderBottom: '1px solid #eee' }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '1.25rem' }}>🍿 {item.movie}</h3>
              <span style={{ fontSize: '14px', color: '#666', background: '#f0f2f6', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                <strong>Similarity Score:</strong> {item.score.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}