import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { styled } from '@mui/material/styles';

import {
  Box,
  Typography,
  CircularProgress,
  ThemeProvider,
  createTheme,
  CssBaseline,
  LinearProgress,
  IconButton,
  Stack,
  Fab,
  linearProgressClasses,
  TextField,
  Link
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipPrevious,
  SkipNext,
  Send,
} from '@mui/icons-material';

const spotifyM3Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#E1B7F5',
    },
    secondary: {
      main: '#BB86FC',
    },
    background: {
      default: '#161217',
      paper: '#221E24',
    },
    text: {
      primary: '#E1B7F5',
      secondary: '#745186',
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h4: {
      fontWeight: 700,
      color: '#E1B7F5',
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
  const [inputValue, setInputValue] = useState<string>('');
  const [isMatchFound, setIsMatchFound] = useState<boolean>(false);
  const expectedEnvValue = import.meta.env.VITE_PASSWORD;
  const isSecured = (undefined !== expectedEnvValue);

  const pollingIntervalRef = useRef<number | null>(null);

  const fetchAccessToken = async () => {
    setIsAuthLoading(true);
    setMessage('> ⏳ LOADING: Obtaining Spotify Access Token...');
    try {
      const valTownApiUrl = import.meta.env.VITE_SPOTIFY_TOKEN_API_URL;

      if (!valTownApiUrl) {
        throw new Error("> ❌ ERROR: Spotify Token API URL is not defined. Please check your .env file and ensure it uses VITE_ prefix.");
      }

      const response = await fetch(valTownApiUrl);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`> ❌ ERROR: Failed fetching access token: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      if (data.access_token) {
        setAccessToken(data.access_token);
        setMessage('> ✅ SUCCESS: Access Token obtained successfully!');
      } else {
        throw new Error('> ❌ ERROR: Access token not found in response from Val Town.');
      }
    } catch (error: any) {
      console.error('> ❌ ERROR: Failed fetching access token:', error);
      setMessage(`> ❌ ERROR: Failed to obtain access token: ${error.message}. Please ensure your Val Town API is running and configured correctly.`);
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
      setMessage('> ❌ ERROR: Access token is not available. Please obtain it first.');
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
          setMessage('> ℹ️ INFO: No song is currently playing.');
        }
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`> ❌ ERROR: Error fetching current song: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      setCurrentSong(data);

      if (message === '> ℹ️ INFO: No song is currently playing.' || message === '> ⏳ LOADING: Fetching current song...') {
        setMessage('');
      }
    } catch (error: any) {
      console.error('> ❌ ERROR: Failed to fetch current playing song:', error);
      setMessage(`> ❌ ERROR: Failed to fetch current song: ${error.message}. Make sure your token is valid and a song is playing on an active device.`);

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } finally {
    }
  };

  const sendPlayerCommand = async (endpoint: string, method: 'PUT' | 'POST') => {
    if (!accessToken) {
      setMessage('> ❌ ERROR: Access token is not available. Cannot send command.');
      return;
    }
    setIsLoading(true);
    setMessage(`> ⏳ LOADING: Sending command to Spotify player...`);
    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
        method: method,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 204) {
        setMessage(`> ✅ SUCCESS: Command "${endpoint}" sent successfully!`);
        
        fetchCurrentPlaying();
      } else if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`> ❌ ERROR: with command "${endpoint}": ${response.status} - ${errorData.error?.message || response.statusText}`);
      } else {
         setMessage(`> ✅ SUCCESS: Command "${endpoint}" sent successfully!`);
         fetchCurrentPlaying();
      }
    } catch (error: any) {
      console.error(`> ❌ ERROR: Failed to send command to Spotify player (${endpoint}):`, error);
      setMessage(`> ❌ ERROR: Failed to send command: ${error.message}. Ensure an active device is available and connected to Spotify.`);
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

  const handleNext = () => {
    if (!isMatchFound && isSecured) {
      setMessage("> ❌ ERROR: You are not authenticated.");
      return;
    }
    sendPlayerCommand('next', 'POST');
  };
  const handlePrevious = () => {
    if (!isMatchFound && isSecured) {
      setMessage("> ❌ ERROR: You are not authenticated.");
      return;
    }
    sendPlayerCommand('previous', 'POST');
  };
  const handlePlayPauseToggle = () => {
    if (!isMatchFound && isSecured) {
      setMessage("> ❌ ERROR: You are not authenticated.");
      return;
    } else {
      if ((currentSong && currentSong.is_playing)) {
        sendPlayerCommand('pause', 'PUT');
      } else {
        sendPlayerCommand('play', 'PUT');
      }
    }
  };

  const progressText = (timestamp_ms: number) => {
    const minutes = Math.floor(timestamp_ms / 60000);
    const seconds = Math.floor((timestamp_ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleCheck = () => {
    if (inputValue === expectedEnvValue) {
      setMessage('> ✅ SUCCESS: Correct password! Now authenticated!');
      setIsMatchFound(true);
    } else {
      setMessage('> ❌ ERROR: Wrong password.');
      setIsMatchFound(false);
    }
  };

  const BorderLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 15,
  borderRadius: 10,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: '#5C396C',
    ...theme.applyStyles('dark', {
      backgroundColor: '#5C396C',
    }),
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 10,
    backgroundColor: 'primary',
    ...theme.applyStyles('dark', {
      backgroundColor: 'primary',
    }),
  },
}));

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
            p: { xs: 2, sm: 3 },
            borderRadius: 10,
            boxShadow: 3,
            maxWidth: { xs: '100%', sm: '700px' },
            width: '100%',
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
            transition: 'box-shadow 0.3s ease',
            '&:hover': {
              boxShadow: '0 0 30px rgba(94,56,106, 0.7)',
            },
          }}
        >

          {isAuthLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', py: 4 }}>
              <CircularProgress sx={{ color: 'primary.main' }} />
              <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
                {message || '> ⏳ LOADING: Authentication to Spotify...'}
              </Typography>
            </Box>
          ) : (
            <>
              {!accessToken ? (
                <Typography variant="body1" color="error" sx={{ mb: 2 }}>
                  {message || '> ❌ ERROR: Failed to get access token. Please check your Val Town API and network connection.'}
                </Typography>
              ) : (
                <>
                  {/* --------- ℹ️ PLAYBACK BUTTONS ---------- */}
                  <Box sx={{ mb: 3 }}>
                    {currentSong?.item ? (
                      <Box
                        sx={{
                          p: { xs: 1, sm: 3 },
                          bgcolor: 'background.default',
                          borderRadius: 6,
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          alignItems: 'center',
                          justifyContent: { xs: 'center', sm: 'flex-start' },
                          gap: { xs: 0.5, sm: 2 },
                        }}
                      >
                        <Box
                            component="img"
                            src={currentSong.item.album.images && currentSong.item.album.images.length > 0 ? (currentSong.item.album.images[0].url) : "/public/placeholder.svg"}
                            alt={currentSong.item.album.images && currentSong.item.album.images.length > 0 ? (currentSong.item.album.name) : currentSong.item.name}
                            sx={{
                              width: { xs: '95%', sm: 128 },
                              minWidth: { xs: 'unset', sm: '8rem' },
                              maxWidth: { xs: 'unset', sm: '8rem' },
                              height: { xs: 'auto', sm: 128 },
                              borderRadius: 4,
                              boxShadow: 2,
                              flexShrink: 0,
                              mx: { xs: 'auto', sm: 0 },
                              mt: { xs: 2, sm: 0 },
                              mb: { xs: 0.5, sm: 0 },
                            }}
                          />
                        <Box
                          sx={{
                            p: { xs: 1, sm: 2 },
                            textAlign: { xs: 'center', sm: 'left' },
                            flexGrow: 1,
                            width: { xs: '100%', sm: 'auto' },
                          }}
                        >
                          <Link href={currentSong.item.album.external_urls.spotify} underline="hover" variant="h6" sx={{ mt: 1, color: 'primary.main', fontSize: { xs: '1.1rem', sm: '1.375rem' } }}>
                            {currentSong.item.name}
                          </Link>
                          <Typography
                            variant="body1"
                            sx={{ color: 'text.secondary', fontSize: { xs: '0.95rem', sm: '1.125rem' } }}
                          >
                            {currentSong.item.artists.map((artist: any, index: number) => (
                              <React.Fragment key={artist.id || artist.name || index}>
                                <Link
                                  href={artist.external_urls?.spotify}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  color="inherit"
                                  underline="hover"
                                >
                                  {artist.name}
                                </Link>
                                {/* Add a comma and space only if it's not the last artist */}
                                {index < currentSong.item.artists.length - 1 && ', '}
                              </React.Fragment>
                            ))}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                        {isLoading ? '> ⏳ LOADING: Fetching song information...' : '> ❌ ERROR: No song information available. Is Spotify playing?'}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <BorderLinearProgress variant="determinate" value={currentSong?.progress_ms / currentSong?.item.duration_ms * 100} color="secondary"/>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1}}>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                      {isLoading ? '' : `${progressText(currentSong?.progress_ms)}`}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                      {isLoading ? '> ⏳ LOADING: Fetching song information...' : `/`}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                      {isLoading ? '' : `${progressText(currentSong?.item.duration_ms)}`}
                    </Typography>
                  </Box>
                  {/* ---------- 🎛️ PLAYBACK BUTTONS ---------- */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <IconButton aria-label="Previous" size="large" onClick={handlePrevious} disabled={isLoading} color="secondary">
                        <SkipPrevious fontSize="inherit" />
                      </IconButton>

                      <Fab aria-label={currentSong?.is_playing ? 'Pause' : 'Play'} size="large" onClick={handlePlayPauseToggle} disabled={isLoading || !currentSong} color={currentSong?.is_playing ? 'secondary' : 'primary'}>
                        {currentSong?.is_playing ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
                      </Fab>

                      <IconButton aria-label="Next" size="large" onClick={handleNext} disabled={isLoading} color="secondary">
                        <SkipNext />
                      </IconButton>
                    </Stack>
                  </Box>
                    
                </>
              )}
            </>
          )}

          {/* ---------- 🖥️ CONSOLE ---------- */}
          <Box sx={{ mb: 3 }}>
            {message && (
              <Box sx={{ mt: 2, p: 1.5, borderRadius: 6, bgcolor: 'background.default', color: '#FFFFFF', alignItems: 'flex-start', display: 'flex', flexDirection: 'row', fontFamily: 'monospace',}}>
                {message}
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', margin: '0 auto' }}>
            <TextField label="Authentication Password" variant="outlined" type="password" value={inputValue} onChange={handleChange} className="rounded-md" sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 10
                },
                flexGrow: 1
              }}
            />
            <Fab color="primary" size="large" onClick={handleCheck}>
              <Send fontSize="large" />
            </Fab>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
