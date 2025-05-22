import { useState, useEffect, useRef } from 'react';

import {
  Button,
  Box,
  Typography,
  CircularProgress,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipPrevious,
  SkipNext,
} from '@mui/icons-material';

const spotifyM3Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1DB954',
    },
    secondary: {
      main: '#BB86FC',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B3B3B3',
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h4: {
      fontWeight: 700,
      color: '#1DB954',
    },
    h5: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
    body1: {
      color: '#B3B3B3',
    },
    body2: {
      color: '#808080',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '12px 24px',
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

const App = () => {
  const [accessToken, setAccessToken] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const pollingIntervalRef = useRef<number | null>(null);

  const fetchAccessToken = async () => {
    setIsAuthLoading(true);
    setMessage('Obtaining Spotify Access Token...');
    try {
      const valTownApiUrl = import.meta.env.VITE_SPOTIFY_TOKEN_API_URL;

      if (!valTownApiUrl) {
        throw new Error("Spotify Token API URL is not defined. Please check your .env file and ensure it uses VITE_ prefix.");
      }

      const response = await fetch(valTownApiUrl);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error fetching access token: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      if (data.access_token) {
        setAccessToken(data.access_token);
        setMessage('Access Token obtained successfully!');
      } else {
        throw new Error('Access token not found in response from Val Town.');
      }
    } catch (error: any) {
      console.error('Error fetching access token:', error);
      setMessage(`Failed to obtain access token: ${error.message}. Please ensure your Val Town API is running and configured correctly.`);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const fetchCurrentPlaying = async () => {
    if (!accessToken) {
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setMessage('Access token is not available. Please obtain it first.');
      return;
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 204) {
        setCurrentSong(null);
        
        if (!message.startsWith('Failed to')) {
          setMessage('No song is currently playing.');
        }
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error fetching current song: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      setCurrentSong(data);

      if (message === 'No song is currently playing.' || message === 'Fetching current song...') {
        setMessage('');
      }
    } catch (error: any) {
      console.error('Error fetching current playing song:', error);
      setMessage(`Failed to fetch current song: ${error.message}. Make sure your token is valid and a song is playing on an active device.`);

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } finally {
    }
  };

  const sendPlayerCommand = async (endpoint: string, method: 'PUT' | 'POST') => {
    if (!accessToken) {
      setMessage('Access token is not available. Cannot send command.');
      return;
    }
    setIsLoading(true);
    setMessage(`Sending command to Spotify player...`);
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
        method: method,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 204) {
        setMessage(`Command "${endpoint}" sent successfully!`);
        
        fetchCurrentPlaying();
      } else if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error with command "${endpoint}": ${response.status} - ${errorData.error?.message || response.statusText}`);
      } else {
         setMessage(`Command "${endpoint}" sent successfully!`);
         fetchCurrentPlaying();
      }
    } catch (error: any) {
      console.error(`Error sending command to Spotify player (${endpoint}):`, error);
      setMessage(`Failed to send command: ${error.message}. Ensure an active device is available and connected to Spotify.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessToken();
  }, []);

  useEffect(() => {
    if (accessToken) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      fetchCurrentPlaying();

      pollingIntervalRef.current = setInterval(() => {
        fetchCurrentPlaying();
      }, 1000);
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setCurrentSong(null);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [accessToken]);


  const handleNext = () => sendPlayerCommand('next', 'POST');
  const handlePrevious = () => sendPlayerCommand('previous', 'POST');
    const handlePlayPauseToggle = () => {
    if (currentSong && currentSong.is_playing) {
      sendPlayerCommand('pause', 'PUT');
    } else {
      sendPlayerCommand('play', 'PUT');
    }
  };

  return (
    <ThemeProvider theme={spotifyM3Theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          color: 'text.primary',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 4,
            borderRadius: 3,
            boxShadow: 3,
            maxWidth: 'md',
            width: '100%',
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Spotify Playback Control
          </Typography>

          {isAuthLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', py: 4 }}>
              <CircularProgress sx={{ color: 'primary.main' }} />
              <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
                {message || 'Loading Spotify Access Token...'}
              </Typography>
            </Box>
          ) : (
            <>
              {!accessToken ? (
                <Typography variant="body1" color="error" sx={{ mb: 2 }}>
                  {message || 'Failed to get access token. Please check your Val Town API and network connection.'}
                </Typography>
              ) : (
                <>
                  {/* --------- ℹ️ PLAYBACK BUTTONS ---------- */}
                  <Box sx={{ mb: 3 }}>
                    {currentSong?.item ? (
                      <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                        <Typography variant="h6" sx={{ mt: 1, color: 'primary.main' }}>
                          {currentSong.item.name}
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                          {currentSong.item.artists.map((artist: any) => artist.name).join(', ')}
                        </Typography>
                        {currentSong.item.album.images && currentSong.item.album.images.length > 0 && (
                          <Box
                            component="img"
                            src={currentSong.item.album.images[0].url}
                            alt={currentSong.item.album.name}
                            sx={{
                              width: 128,
                              height: 128,
                              borderRadius: 2,
                              mx: 'auto',
                              mt: 2,
                              boxShadow: 2,
                            }}
                            onError={(e: any) => { e.target.src = 'https://placehold.co/128x128/374151/9CA3AF?text=No+Image'; }}
                          />
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                        {isLoading ? 'Loading song information...' : 'No song information available. Is Spotify playing?'}
                      </Typography>
                    )}
                  </Box>

                  {/* ---------- 🎛️ PLAYBACK BUTTONS ---------- */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                    <Button
                      variant="contained"
                      onClick={handlePrevious}
                      disabled={isLoading}
                      startIcon={<SkipPrevious />}
                      color="secondary"
                    >
                      Previous
                    </Button>

                    <Button
                      variant="contained"
                      onClick={handlePlayPauseToggle}
                      disabled={isLoading || !currentSong}
                      color={currentSong?.is_playing ? 'error' : 'primary'}
                      startIcon={currentSong?.is_playing ? <Pause /> : <PlayArrow />}
                    >
                      {currentSong?.is_playing ? 'Pause' : 'Play'}
                    </Button>

                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={isLoading}
                      endIcon={<SkipNext />}
                      color="secondary"
                    >
                      Next
                    </Button>
                  </Box>
                </>
              )}
            </>
          )}

          {/* ---------- 🖥️ CONSOLE OUTPUT ---------- */}
          {message && (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: 'info.dark', color: '#FFFFFF'}}>
              {message}
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
