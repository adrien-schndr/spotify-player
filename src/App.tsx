import { useState, useEffect, useRef } from 'react';
import React from 'react';

import {
  Box,
  Typography,
  CircularProgress,
  ThemeProvider,
  createTheme,
  CssBaseline,
  IconButton,
  Stack,
  Fab,
  TextField,
  Link,
  Modal,
  Slider,
  Button,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipPrevious,
  SkipNext,
  Send,
  Shuffle,
  Repeat,
  RepeatOne,
  DevicesOther,
  Close,
  VolumeOff,
  VolumeUp,
} from '@mui/icons-material';

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '45%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  borderRadius: 8,
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '80vh',
  overflowY: 'auto' as 'auto',
};

const spotifyM3Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#E1B7F5',
    },
    secondary: {
      main: '#BB86FC',
    },
    info: {
      main: '#FFFFFF'
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
  const [devicesList, setDevicesList] = useState<any>(null);
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [inputValue, setInputValue] = useState<string>('');
  const [isMatchFound, setIsMatchFound] = useState<boolean>(false);
  const expectedEnvValue = import.meta.env.VITE_PASSWORD;
  const isSecured = (undefined !== expectedEnvValue);
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [beforeMuteValue, setBeforeMuteValue] = useState<number>(0);

  const [positionValue, setPositionValue] = useState(0);
  const [volumeValue, setVolumeValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [_actualPlaybackPosition, setActualPlaybackPosition] = useState(0);
  const [_actualVolumePosition, setActualVolumePosition] = useState(0);

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
      const response = await fetch('https://api.spotify.com/v1/me/player', {
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

      if (!isDragging) {
          setPositionValue(data.progress_ms);
          setActualPlaybackPosition(data.progress_ms);
          setVolumeValue(data.device.volume_percent);
          setActualVolumePosition(data.device.volume_percent);
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

  const fetchDevices = async () => {
    if (!accessToken) {
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setMessage('> ❌ ERROR: Access token is not available. Please obtain it first.');
      return;
    }
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 200 ) {
        const data = await response.json();
        setDevicesList(data);
      }
      
    } catch (error: any) {
      console.error('> ❌ ERROR: Failed to fetch current playing song:', error);
      setMessage(`> ❌ ERROR: Failed to fetch devices list: ${error.message}`);

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } finally {
    }
  }

  const sendPlayerCommand = async (endpoint: string, method: 'PUT' | 'POST', data:any=null) => {
    if (!accessToken) {
      setMessage('> ❌ ERROR: Access token is not available. Cannot send command.');
      return;
    }
    setIsLoading(true);
    setMessage(`> ⏳ LOADING: Sending command to Spotify player...`);
    try {
      const options = {
        method: method,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: data
      }
      console.log(options)

      const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, options);

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
    if (devicesList && devicesList.devices.length > 0) {
      const activeDevice = devicesList.devices.find((device : any) => device.is_active);
      if (activeDevice) {
        setSelectedDevice(activeDevice.id);
      } else {
        // Fallback: If no active device, you might want to select the first one
        setSelectedDevice(devicesList.devices[0].id);
      }
    }
  }, [devicesList]); // This effect runs whenever devicesList changes

  useEffect(() => {
    if (accessToken) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      fetchCurrentPlaying();
      fetchDevices();

      pollingIntervalRef.current = setInterval(() => {
        fetchCurrentPlaying();
        fetchDevices();
        console.log(devicesList, usedDevice())
      }, 1000);
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setCurrentSong(null);
      setDevicesList(null); 
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [accessToken]);

  const handleOpen = () => {
    setDeviceMenuOpen(true);
  };

  const handleClose = () => {
    setDeviceMenuOpen(false);
  };

  const usedDevice = () => {
    return devicesList.devices.find((device:any) => device.is_active)
  }

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
      return;null
    }
    sendPlayerCommand('previous', 'POST');
  };
  const handleShuffle = () => {
    if (!isMatchFound && isSecured) {
      setMessage("> ❌ ERROR: You are not authenticated.");
      return;
    }
    else {
      if (currentSong && currentSong.shuffle_state) {
        sendPlayerCommand('shuffle?state=false', 'PUT');
      } else {
        sendPlayerCommand('shuffle?state=true', 'PUT');
      }
    }
  };
  const handleRepeat = () => {
    if (!isMatchFound && isSecured) {
      setMessage("> ❌ ERROR: You are not authenticated.");
      return;
    }
    else {
      console.log(currentSong.repeat_state);
      if (currentSong && currentSong.repeat_state == "off") {
        sendPlayerCommand('repeat?state=context', 'PUT');
      } else if (currentSong && currentSong.repeat_state == "context") {
        sendPlayerCommand('repeat?state=track', 'PUT');
      } else {
        sendPlayerCommand('repeat?state=off', 'PUT');
      }
    }
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
  const handleMute = () => {
    if (!isMatchFound && isSecured) {
      setMessage("> ❌ ERROR: You are not authenticated.");
      return;
    }
    if (currentSong.device.supports_volume) {
      if (isMuted) {
        setVolumeValue(beforeMuteValue);
        sendPlayerCommand(`volume?volume_percent=${beforeMuteValue}`, 'PUT');
        setIsMuted(false)
      } else {
        setBeforeMuteValue(volumeValue);
        setVolumeValue(0);
        sendPlayerCommand(`volume?volume_percent=${0}`, 'PUT');
        setIsMuted(true)
      }
    }
  };

  const progressText = (timestamp_ms: number) => {
    const minutes = Math.floor(timestamp_ms / 60000);
    const seconds = Math.floor((timestamp_ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  const handlePositionChange = (_event: any, newValue: number) => {
    if (!isMatchFound && isSecured) {
      setMessage("> ❌ ERROR: You are not authenticated.");
      return;
    } else {  
      setPositionValue(newValue);
      setIsDragging(true);
    }
  };

  const handlePositionChangeCommitted = (_event: any,newValue: number) => {
    if (!isMatchFound && isSecured) {
      setMessage("> ❌ ERROR: You are not authenticated.");
      return;
    } else {
      setActualPlaybackPosition(newValue);
      setIsDragging(false);
      if ((currentSong)) {
          sendPlayerCommand(`seek?position_ms=${newValue}`, 'PUT');
      }
    }  
  };

    const handleVolumeChange = (_event: any, newValue: number) => {
    if (!isMatchFound && isSecured) {
      setMessage("> ❌ ERROR: You are not authenticated.");
      return;
    } else if (currentSong.device.supports_volume) {  
      setVolumeValue(newValue);
      setIsDragging(true);
    }
  };

  const handleVolumeChangeCommitted = (_event: any,newValue: number) => {
    if (!isMatchFound && isSecured) {
      setMessage("> ❌ ERROR: You are not authenticated.");
      return;
    } else if (currentSong.device.supports_volume) {
      setActualVolumePosition(newValue);
      setIsDragging(false);
      if ((currentSong)) {
          sendPlayerCommand(`volume?volume_percent=${newValue}`, 'PUT');
      }
    }  
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };


  const handleDeviceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isMatchFound && isSecured) {
      setMessage("> ❌ ERROR: You are not authenticated.");
      return;
    } else {
      setSelectedDevice(event.target.value);
      sendPlayerCommand("", "PUT", JSON.stringify({"device_ids": [`${event.target.value}`]}))
      const newlySelectedDeviceId = event.target.value;
      const newlySelectedDevice = devicesList?.devices.find((device:any) => device.id === newlySelectedDeviceId);
      if (newlySelectedDevice) {
        console.log("Selected Device:", newlySelectedDevice);
      }
    }
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

                  <Slider 
                    min={0}
                    max={currentSong?.item.duration_ms}
                    value={positionValue} 
                    aria-label="Duration" 
                    onChange={handlePositionChange}
                    onChangeCommitted={handlePositionChangeCommitted}
                    color="secondary"
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1}}>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                      {progressText(currentSong?.progress_ms)}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                      {`/`}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                      {progressText(currentSong?.item.duration_ms)}
                    </Typography>
                  </Box>
                  {/* ---------- 🎛️ PLAYBACK BUTTONS ---------- */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <IconButton aria-label="Shuffle" size="medium" onClick={handleShuffle} disabled={isLoading} color={currentSong?.shuffle_state ? 'secondary' : 'info' }>
                        <Shuffle fontSize="inherit" />
                      </IconButton>

                      <IconButton aria-label="Previous" size="large" onClick={handlePrevious} disabled={isLoading} color="info">
                        <SkipPrevious fontSize="inherit" />
                      </IconButton>

                      <Fab aria-label={currentSong?.is_playing ? 'Pause' : 'Play'} size="large" onClick={handlePlayPauseToggle} disabled={isLoading || !currentSong} color={currentSong?.is_playing ? 'secondary' : 'primary'}>
                        {currentSong?.is_playing ? <Pause fontSize="large" /> : <PlayArrow fontSize="large" />}
                      </Fab>

                      <IconButton aria-label="Next" size="large" onClick={handleNext} disabled={isLoading} color="info">
                        <SkipNext />
                      </IconButton>

                      
                      {currentSong?.repeat_state == "off" ? (
                        <IconButton aria-label="Shuffle" size="medium" onClick={handleRepeat} disabled={isLoading} color="info">
                          <Repeat fontSize="medium" />
                        </IconButton>

                      ) : (currentSong?.repeat_state == "track" ? (
                        <IconButton aria-label="Shuffle" size="medium" onClick={handleRepeat} disabled={isLoading} color="secondary">
                          <RepeatOne fontSize="medium" />
                        </IconButton>
                      ): (
                        <IconButton aria-label="Shuffle" size="medium" onClick={handleRepeat} disabled={isLoading} color="secondary">
                          <Repeat fontSize="medium" />
                        </IconButton>
                      ))}
                    </Stack>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                    <IconButton 
                      aria-label="Shuffle" 
                      size="medium" 
                      onClick={handleOpen} 
                      disabled={isLoading} color="secondary"
                    >
                      <DevicesOther fontSize="medium" />
                    </IconButton>

                    <Modal
                      open={deviceMenuOpen}
                      onClose={handleClose}
                      aria-labelledby="modal-title"
                      aria-describedby="modal-description"
                    >
                      <Box sx={modalStyle}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 2,
                          }}
                        >
                          <Typography id="modal-title" variant="h6" component="h2">
                            Available devices
                          </Typography>
                          <IconButton
                            aria-label="close"
                            onClick={handleClose}
                            sx={{
                              color: (theme) => theme.palette.grey[500],
                            }}
                          >
                            <Close />
                          </IconButton>
                        </Box>

                        <FormControl>
                          <RadioGroup
                            aria-labelledby="device-selection-radio-buttons-group"
                            name="device-selection-group"
                            value={selectedDevice}
                            onChange={handleDeviceChange}
                          >
                            {devicesList ? (
                              devicesList.devices.map((device: any, _index: number) => (
                                <Box sx={{ border: '1px dashed grey', p: 2, mt: 2, borderRadius: 10 }} key={device.id}>
                                  <FormControlLabel value={device.id} control={<Radio />} label={device.name} />
                                </Box>
                              ))
                            ) : (
                              <p>Loading devices...</p>
                            )}
                          </RadioGroup>
                        </FormControl>

                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button onClick={handleClose} sx={{ borderRadius: '8px' }}>
                            Close
                          </Button>
                        </Box>
                      </Box>
                    </Modal>

                    <IconButton 
                      aria-label="Mute" 
                      size="medium" 
                      onClick={handleMute} 
                      disabled={isLoading} color={isMuted ? "secondary" : "info"}
                    >
                      {isMuted ? ((<VolumeOff fontSize="medium" />)) : (<VolumeUp fontSize="medium" />)}
                      
                    </IconButton>

                    <Slider
                      min={0}
                      max={100}
                      value={volumeValue} 
                      aria-label="Duration" 
                      onChange={handleVolumeChange}
                      onChangeCommitted={handleVolumeChangeCommitted}
                      color="secondary"
                      disabled={currentSong?.device.supports_volume ? false : true}
                    />
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
