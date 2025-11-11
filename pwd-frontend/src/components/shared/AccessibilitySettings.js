// src/components/shared/AccessibilitySettings.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Switch,
  FormControlLabel,
  Typography,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Accessibility,
  Close,
  VolumeUp,
  VolumeOff,
  Contrast,
  TextIncrease,
  Language,
  Settings,
  Visibility,
  VisibilityOff,
  KeyboardArrowDown,
  KeyboardArrowUp
} from '@mui/icons-material';
import { useTranslation } from '../../contexts/TranslationContext';
import { supportedLanguages } from '../../translations';
import { useScreenReader } from '../../hooks/useScreenReader';
import { useReadAloud } from '../../hooks/useReadAloud';

function AccessibilitySettings() {
  const { t, currentLanguage, changeLanguage } = useTranslation();
  const { 
    isEnabled: screenReaderEnabled, 
    isSupported: screenReaderSupported, 
    isTTSEnabled,
    availableVoices,
    currentVoice,
    speechSettings,
    speak, 
    testScreenReader,
    setTTSEnabled,
    updateSpeechSettings,
    setVoice,
    getVoicesForLanguage,
    getRecommendedVoice,
    testVoice,
    refreshVoices,
    getCapabilities 
  } = useScreenReader();
  const { 
    isReading, 
    currentReadingElement, 
    readAloud, 
    stopReading, 
    readElement, 
    readPage 
  } = useReadAloud();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState({
    screenReader: false,
    highContrast: false,
    textSize: 100, // percentage
    language: currentLanguage,
    reducedMotion: false,
    focusIndicator: true,
    keyboardNavigation: true,
    ttsEnabled: false,
    speechRate: 1.0,
    speechPitch: 1.0,
    speechVolume: 1.0,
    readAloud: false,
    readAloudSpeed: 1.0,
    readAloudAutoStart: false,
  });

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibilitySettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prevSettings => {
          const newSettings = { ...prevSettings, ...parsedSettings };
          applyAccessibilitySettings(newSettings);
          return newSettings;
        });
        
        // Screen reader settings loaded
      } catch (error) {
        console.error('Error loading accessibility settings:', error);
      }
    }
  }, []);

  // Sync language setting with current language from context (but don't override saved language)
  useEffect(() => {
    setSettings(prevSettings => {
      // Only update if no language was saved in localStorage
      const savedSettings = localStorage.getItem('accessibilitySettings');
      const hasSavedLanguage = savedSettings && JSON.parse(savedSettings).language;
      
      if (!hasSavedLanguage) {
        return {
          ...prevSettings,
          language: currentLanguage
        };
      }
      return prevSettings;
    });
  }, [currentLanguage]);

  // Reset TTS settings when screen reader is disabled
  useEffect(() => {
    if (!settings.screenReader && settings.ttsEnabled) {
      setSettings(prevSettings => ({
        ...prevSettings,
        ttsEnabled: false
      }));
      setTTSEnabled(false);
    }
  }, [settings.screenReader, settings.ttsEnabled, setTTSEnabled]);


  // Auto-read content when page loads (if enabled)
  useEffect(() => {
    if (settings.readAloudAutoStart && settings.readAloud) {
      const mainContent = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
      if (mainContent) {
        const textContent = mainContent.innerText || mainContent.textContent;
        if (textContent && textContent.trim()) {
          readAloud(textContent.substring(0, 1000) + '...'); // Limit to first 1000 characters
        }
      }
    }
  }, [settings.readAloudAutoStart, settings.readAloud]);

  // Add click-to-read functionality
  useEffect(() => {
    if (!settings.readAloud) return;

    const handleClick = (event) => {
      const target = event.target;
      readElement(target);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [settings.readAloud, readElement]);


  // Apply accessibility settings to the document
  const applyAccessibilitySettings = (newSettings) => {
    const root = document.documentElement;
    
    // Apply text size
    root.style.setProperty('--accessibility-text-size', `${newSettings.textSize}%`);
    
    // Apply high contrast
    if (newSettings.highContrast) {
      root.classList.add('high-contrast-mode');
    } else {
      root.classList.remove('high-contrast-mode');
    }
    
    // Apply reduced motion
    if (newSettings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Apply focus indicator
    if (newSettings.focusIndicator) {
      root.classList.add('enhanced-focus');
    } else {
      root.classList.remove('enhanced-focus');
    }
    
    // Apply language
    document.documentElement.lang = newSettings.language;
    
    // Announce changes to screen readers
    if (newSettings.screenReader) {
      announceToScreenReader('Accessibility settings updated');
    }
  };

  // Announce text to screen readers using Capacitor Screen Reader API
  const announceToScreenReader = async (text) => {
    if (!settings.screenReader || !screenReaderEnabled) return;
    
    try {
      await speak(text);
    } catch (error) {
      console.error('Error announcing to screen reader:', error);
      
      // Fallback to ARIA live region
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.style.position = 'absolute';
      announcement.style.left = '-10000px';
      announcement.style.width = '1px';
      announcement.style.height = '1px';
      announcement.style.overflow = 'hidden';
      announcement.textContent = text;
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }
  };

  // Handle setting changes
  const handleSettingChange = (setting, value) => {
    const newSettings = { ...settings, [setting]: value };
    setSettings(newSettings);
    applyAccessibilitySettings(newSettings);
    
    // Save to localStorage
    localStorage.setItem('accessibilitySettings', JSON.stringify(newSettings));
    
    // Handle language change
    if (setting === 'language') {
      changeLanguage(value);
    }
    
    // Handle screen reader toggle
    if (setting === 'screenReader') {
      if (value) {
        announceToScreenReader(t('accessibility.screenReaderEnabled'));
        // Refresh voices when screen reader is enabled
        refreshVoices();
      } else {
        // Disable TTS when screen reader is turned off
        setTTSEnabled(false);
        
        // Announce using ARIA live region since screen reader is being disabled
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        announcement.textContent = t('accessibility.screenReaderDisabled');
        document.body.appendChild(announcement);
        
        setTimeout(() => {
          document.body.removeChild(announcement);
        }, 1000);
      }
    }
    
    // Announce changes
    if (setting === 'highContrast' && value) {
      announceToScreenReader(t('accessibility.highContrastEnabled'));
    } else if (setting === 'textSize') {
      announceToScreenReader(t('accessibility.textSizeSet', { size: value }));
    } else if (setting === 'language') {
      const selectedLanguage = supportedLanguages.find(lang => lang.code === value);
      announceToScreenReader(t('accessibility.languageChanged', { language: selectedLanguage?.nativeName || 'English' }));
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (settings.screenReader) {
      announceToScreenReader(t('accessibility.dialogOpened'));
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (settings.screenReader) {
      announceToScreenReader(t('accessibility.dialogClosed'));
    }
  };

  const resetSettings = () => {
    const defaultSettings = {
      screenReader: false,
      highContrast: false,
      textSize: 100,
      language: currentLanguage,
      reducedMotion: false,
      focusIndicator: true,
      keyboardNavigation: true,
      ttsEnabled: false,
      speechRate: 1.0,
      speechPitch: 1.0,
      speechVolume: 1.0,
      readAloud: false,
      readAloudSpeed: 1.0,
      readAloudAutoStart: false,
    };
    setSettings(defaultSettings);
    applyAccessibilitySettings(defaultSettings);
    localStorage.setItem('accessibilitySettings', JSON.stringify(defaultSettings));
    stopReading(); // Stop any ongoing reading
    if (settings.screenReader) {
      announceToScreenReader(t('accessibility.settingsReset'));
    }
  };

  return (
    <>
      {/* Floating Accessibility Button */}
      <Fab
        color="primary"
        aria-label="Accessibility Settings"
        onClick={handleOpen}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1400,
          backgroundColor: '#0b87ac',
          '&:hover': {
            backgroundColor: '#0a6b8a',
            transform: 'scale(1.1)'
          },
          transition: settings.reducedMotion ? 'none' : 'all 0.3s ease',
          boxShadow: '0 4px 12px rgba(11, 135, 172, 0.3)',
          '&:focus': {
            outline: settings.focusIndicator ? '3px solid #ff6b35' : 'none',
            outlineOffset: '2px'
          }
        }}
        size="large"
      >
        <Accessibility />
      </Fab>

      {/* Floating Read Aloud Button */}
      {settings.readAloud && (
        <Fab
          color="secondary"
          aria-label="Read Aloud"
          onClick={readPage}
          disabled={isReading}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 100, // Position next to the accessibility button
            zIndex: 1400,
            backgroundColor: isReading ? '#dc3545' : '#28a745',
            '&:hover': {
              backgroundColor: isReading ? '#c82333' : '#218838',
              transform: settings.reducedMotion ? 'none' : 'scale(1.1)'
            },
            transition: settings.reducedMotion ? 'none' : 'all 0.3s ease',
            boxShadow: isReading ? '0 4px 12px rgba(220, 53, 69, 0.3)' : '0 4px 12px rgba(40, 167, 69, 0.3)',
            '&:focus': {
              outline: settings.focusIndicator ? '3px solid #ff6b35' : 'none',
              outlineOffset: '2px'
            }
          }}
          size="medium"
        >
          {isReading ? <VolumeOff /> : <VolumeUp />}
        </Fab>
      )}

      {/* Accessibility Settings Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            '&:focus': {
              outline: settings.focusIndicator ? '3px solid #ff6b35' : 'none'
            }
          }
        }}
        aria-labelledby="accessibility-dialog-title"
        aria-describedby="accessibility-dialog-description"
      >
        <DialogTitle
          id="accessibility-dialog-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e9ecef'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Accessibility sx={{ color: '#0b87ac' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
              {t('accessibility.title')}
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            aria-label={t('accessibility.close')}
            sx={{
              '&:focus': {
                outline: settings.focusIndicator ? '2px solid #ff6b35' : 'none',
                outlineOffset: '1px'
              }
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Typography
            id="accessibility-dialog-description"
            variant="body2"
            sx={{ mb: 3, color: '#6c757d' }}
          >
            {t('accessibility.description')}
          </Typography>

          {/* Screen Reader Options */}
          <Card sx={{ mb: 3, border: '1px solid #e9ecef' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <VolumeUp sx={{ color: '#0b87ac' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t('accessibility.screenReader')}
                </Typography>
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.screenReader}
                    onChange={(e) => handleSettingChange('screenReader', e.target.checked)}
                    color="primary"
                  />
                }
                label={t('accessibility.screenReaderLabel')}
                sx={{ mb: 1 }}
              />
              
              <Typography variant="body2" sx={{ color: '#6c757d', ml: 4 }}>
                {t('accessibility.screenReaderDescription')}
              </Typography>

              {/* Screen Reader Status */}
              {screenReaderSupported && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Screen Reader Status
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body2" sx={{ color: screenReaderEnabled ? '#28a745' : '#dc3545' }}>
                      {screenReaderEnabled ? '✓ Enabled' : '✗ Disabled'}
                    </Typography>
                    <Chip
                      label={screenReaderEnabled ? 'Active' : 'Inactive'}
                      size="small"
                      color={screenReaderEnabled ? 'success' : 'error'}
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#6c757d', display: 'block' }}>
                    {screenReaderEnabled 
                      ? 'Native screen reader (TalkBack/VoiceOver) is active'
                      : 'Enable screen reader in device settings for full functionality'
                    }
                  </Typography>
                </Box>
              )}

              {/* Test Screen Reader Button */}
              {settings.screenReader && screenReaderSupported && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={async () => {
                      try {
                        await testScreenReader();
                      } catch (error) {
                        console.error('Error testing screen reader:', error);
                      }
                    }}
                    sx={{
                      borderColor: '#0b87ac',
                      color: '#0b87ac',
                      '&:hover': {
                        borderColor: '#0a6b8a',
                        backgroundColor: '#0b87ac15'
                      }
                    }}
                  >
                    Test Screen Reader
                  </Button>
                </Box>
              )}

              {/* Text-to-Speech Controls */}
              {settings.screenReader && (
                <Box sx={{ mt: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    {t('accessibility.ttsSettings')}
                  </Typography>

                  {/* TTS Enable Toggle */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.ttsEnabled}
                        onChange={(e) => {
                          const newSettings = { ...settings, ttsEnabled: e.target.checked };
                          setSettings(newSettings);
                          handleSettingChange('ttsEnabled', e.target.checked);
                          setTTSEnabled(e.target.checked);
                        }}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#0b87ac',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#0b87ac',
                          },
                        }}
                      />
                    }
                    label={t('accessibility.ttsEnabledLabel')}
                    sx={{ mb: 2 }}
                  />

                  {/* Speech Controls */}
                  {settings.ttsEnabled && (
                    <Box>
                      {/* Speech Rate */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                          {t('accessibility.speechRateLabel')}: {settings.speechRate.toFixed(1)}x
                        </Typography>
                        <Slider
                          value={settings.speechRate}
                          onChange={(e, value) => {
                            const newSettings = { ...settings, speechRate: value };
                            setSettings(newSettings);
                            updateSpeechSettings({ rate: value });
                          }}
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          sx={{
                            color: '#0b87ac',
                            '& .MuiSlider-thumb': {
                              backgroundColor: '#0b87ac',
                            },
                            '& .MuiSlider-track': {
                              backgroundColor: '#0b87ac',
                            },
                          }}
                        />
                      </Box>

                      {/* Speech Pitch */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                          {t('accessibility.speechPitchLabel')}: {settings.speechPitch.toFixed(1)}
                        </Typography>
                        <Slider
                          value={settings.speechPitch}
                          onChange={(e, value) => {
                            const newSettings = { ...settings, speechPitch: value };
                            setSettings(newSettings);
                            updateSpeechSettings({ pitch: value });
                          }}
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          sx={{
                            color: '#0b87ac',
                            '& .MuiSlider-thumb': {
                              backgroundColor: '#0b87ac',
                            },
                            '& .MuiSlider-track': {
                              backgroundColor: '#0b87ac',
                            },
                          }}
                        />
                      </Box>

                      {/* Speech Volume */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                          {t('accessibility.speechVolumeLabel')}: {Math.round(settings.speechVolume * 100)}%
                        </Typography>
                        <Slider
                          value={settings.speechVolume}
                          onChange={(e, value) => {
                            const newSettings = { ...settings, speechVolume: value };
                            setSettings(newSettings);
                            updateSpeechSettings({ volume: value });
                          }}
                          min={0.1}
                          max={1.0}
                          step={0.1}
                          sx={{
                            color: '#0b87ac',
                            '& .MuiSlider-thumb': {
                              backgroundColor: '#0b87ac',
                            },
                            '& .MuiSlider-track': {
                              backgroundColor: '#0b87ac',
                            },
                          }}
                        />
                      </Box>

                      {/* Voice Selection */}
                      {availableVoices.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                            {t('accessibility.voiceSelectionLabel')}
                          </Typography>
                          <FormControl fullWidth size="small">
                            <Select
                              value={currentVoice?.name || ''}
                              onChange={(e) => {
                                const selectedVoice = availableVoices.find(v => v.name === e.target.value);
                                setVoice(selectedVoice);
                              }}
                              displayEmpty
                              sx={{
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#0b87ac',
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#0a6b8a',
                                },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#0b87ac',
                                },
                              }}
                            >
                              <MenuItem value="">
                                <em>{t('accessibility.defaultVoice')}</em>
                              </MenuItem>
                              {availableVoices.map((voice) => (
                                <MenuItem key={voice.name} value={voice.name}>
                                  {voice.name} ({voice.lang})
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          
                          {/* Recommended Voice for Current Language */}
                          {(() => {
                            const recommendedVoice = getRecommendedVoice(currentLanguage);
                            return recommendedVoice && (
                              <Box sx={{ mt: 1 }}>
                                <Chip
                                  label={`${t('accessibility.recommendedVoice')}: ${recommendedVoice.name}`}
                                  size="small"
                                  color="primary"
                                  onClick={() => setVoice(recommendedVoice)}
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              </Box>
                            );
                          })()}

                          {/* Test Voice Button */}
                          <Box sx={{ mt: 1 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={async () => {
                                try {
                                  await testVoice(currentVoice);
                                } catch (error) {
                                  console.error('Error testing voice:', error);
                                }
                              }}
                              sx={{
                                borderColor: '#0b87ac',
                                color: '#0b87ac',
                                '&:hover': {
                                  borderColor: '#0a6b8a',
                                  backgroundColor: '#0b87ac15'
                                }
                              }}
                            >
                              {t('accessibility.testVoice')}
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Read Aloud Settings */}
          <Card sx={{ mb: 3, border: '1px solid #e9ecef' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <VolumeUp sx={{ color: '#0b87ac' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Read Aloud
                </Typography>
                {isReading && (
                  <Chip
                    label="Reading..."
                    size="small"
                    color="primary"
                    sx={{ fontSize: '0.7rem' }}
                  />
                )}
              </Box>

              {/* Read Aloud Enable Toggle */}
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.readAloud}
                    onChange={(e) => {
                      const newSettings = { ...settings, readAloud: e.target.checked };
                      setSettings(newSettings);
                      handleSettingChange('readAloud', e.target.checked);
                      if (!e.target.checked) {
                        stopReading();
                      }
                    }}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#0b87ac',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#0b87ac',
                      },
                    }}
                  />
                }
                label="Enable Read Aloud"
                sx={{ mb: 2 }}
              />

              <Typography variant="body2" sx={{ color: '#6c757d', ml: 4, mb: 2 }}>
                Click on any text element to have it read aloud. Perfect for reading documents, forms, and other content.
              </Typography>

              {/* Read Aloud Controls */}
              {settings.readAloud && (
                <Box>
                  {/* Auto Start */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.readAloudAutoStart}
                        onChange={(e) => {
                          const newSettings = { ...settings, readAloudAutoStart: e.target.checked };
                          setSettings(newSettings);
                          handleSettingChange('readAloudAutoStart', e.target.checked);
                        }}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#0b87ac',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#0b87ac',
                          },
                        }}
                      />
                    }
                    label="Auto-read page content on load"
                    sx={{ mb: 2 }}
                  />

                  {/* Read Aloud Speed */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Reading Speed: {settings.readAloudSpeed.toFixed(1)}x
                    </Typography>
                    <Slider
                      value={settings.readAloudSpeed}
                      onChange={(e, value) => {
                        const newSettings = { ...settings, readAloudSpeed: value };
                        setSettings(newSettings);
                        handleSettingChange('readAloudSpeed', value);
                      }}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      sx={{
                        color: '#0b87ac',
                        '& .MuiSlider-thumb': {
                          backgroundColor: '#0b87ac',
                        },
                        '& .MuiSlider-track': {
                          backgroundColor: '#0b87ac',
                        },
                      }}
                    />
                  </Box>

                  {/* Control Buttons */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={readPage}
                      disabled={isReading}
                      sx={{
                        borderColor: '#0b87ac',
                        color: '#0b87ac',
                        '&:hover': {
                          borderColor: '#0a6b8a',
                          backgroundColor: '#0b87ac15'
                        }
                      }}
                    >
                      Read Page
                    </Button>
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={stopReading}
                      disabled={!isReading}
                      sx={{
                        borderColor: '#dc3545',
                        color: '#dc3545',
                        '&:hover': {
                          borderColor: '#c82333',
                          backgroundColor: '#dc354515'
                        }
                      }}
                    >
                      Stop Reading
                    </Button>
                  </Box>

                  {/* Instructions */}
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      How to use Read Aloud:
                    </Typography>
                    <List dense>
                      <ListItem sx={{ py: 0 }}>
                        <ListItemIcon>
                          <Typography variant="body2">•</Typography>
                        </ListItemIcon>
                        <ListItemText 
                          primary="Click on any text element to read it aloud"
                          primaryTypographyProps={{ fontSize: '0.8rem' }}
                        />
                      </ListItem>
                      <ListItem sx={{ py: 0 }}>
                        <ListItemIcon>
                          <Typography variant="body2">•</Typography>
                        </ListItemIcon>
                        <ListItemText 
                          primary="Use 'Read Page' to read the entire page content"
                          primaryTypographyProps={{ fontSize: '0.8rem' }}
                        />
                      </ListItem>
                      <ListItem sx={{ py: 0 }}>
                        <ListItemIcon>
                          <Typography variant="body2">•</Typography>
                        </ListItemIcon>
                        <ListItemText 
                          primary="Adjust reading speed with the slider above"
                          primaryTypographyProps={{ fontSize: '0.8rem' }}
                        />
                      </ListItem>
                    </List>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Visual Settings */}
          <Card sx={{ mb: 3, border: '1px solid #e9ecef' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Visibility sx={{ color: '#0b87ac' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t('accessibility.visualSettings')}
                </Typography>
              </Box>

              {/* High Contrast Mode */}
              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.highContrast}
                      onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={t('accessibility.highContrast')}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" sx={{ color: '#6c757d', ml: 4 }}>
                  {t('accessibility.highContrastDescription')}
                </Typography>
              </Box>

              {/* Text Size */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TextIncrease sx={{ color: '#0b87ac' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    {t('accessibility.textSize')}: {settings.textSize}%
                  </Typography>
                </Box>
                <Slider
                  value={settings.textSize}
                  onChange={(e, value) => handleSettingChange('textSize', value)}
                  min={75}
                  max={150}
                  step={5}
                  marks={[
                    { value: 75, label: '75%' },
                    { value: 100, label: '100%' },
                    { value: 125, label: '125%' },
                    { value: 150, label: '150%' }
                  ]}
                  sx={{ ml: 2, mr: 2 }}
                />
                <Typography variant="body2" sx={{ color: '#6c757d', ml: 4 }}>
                  {t('accessibility.textSizeDescription')}
                </Typography>
              </Box>

              {/* Focus Indicator */}
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.focusIndicator}
                      onChange={(e) => handleSettingChange('focusIndicator', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={t('accessibility.focusIndicator')}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" sx={{ color: '#6c757d', ml: 4 }}>
                  {t('accessibility.focusIndicatorDescription')}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card sx={{ mb: 3, border: '1px solid #e9ecef' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Language sx={{ color: '#0b87ac' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t('accessibility.languageSettings')}
                </Typography>
              </Box>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{t('accessibility.selectLanguage')}</InputLabel>
                <Select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  label={t('accessibility.selectLanguage')}
                  sx={{
                    '&:focus': {
                      outline: settings.focusIndicator ? '2px solid #ff6b35' : 'none'
                    }
                  }}
                >
                  {supportedLanguages.map((language) => (
                    <MenuItem key={language.code} value={language.code}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography>{language.nativeName}</Typography>
                        <Chip
                          label={language.name}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography variant="body2" sx={{ color: '#6c757d' }}>
                {t('accessibility.languageDescription')}
              </Typography>
            </CardContent>
          </Card>


          {/* Motion Settings */}
          <Card sx={{ mb: 3, border: '1px solid #e9ecef' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Settings sx={{ color: '#0b87ac' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {t('accessibility.motionSettings')}
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.reducedMotion}
                    onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                    color="primary"
                  />
                }
                label={t('accessibility.reduceMotion')}
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" sx={{ color: '#6c757d', ml: 4 }}>
                {t('accessibility.reduceMotionDescription')}
              </Typography>
            </CardContent>
          </Card>
        </DialogContent>

        <DialogActions sx={{ p: 3, backgroundColor: '#f8f9fa', borderTop: '1px solid #e9ecef' }}>
          <Button
            onClick={resetSettings}
            variant="outlined"
            sx={{
              borderColor: '#6c757d',
              color: '#6c757d',
              '&:hover': {
                borderColor: '#495057',
                backgroundColor: '#f8f9fa'
              },
              '&:focus': {
                outline: settings.focusIndicator ? '2px solid #ff6b35' : 'none'
              }
            }}
          >
            {t('accessibility.resetToDefault')}
          </Button>
          <Button
            onClick={handleClose}
            variant="contained"
            sx={{
              backgroundColor: '#0b87ac',
              '&:hover': {
                backgroundColor: '#0a6b8a'
              },
              '&:focus': {
                outline: settings.focusIndicator ? '2px solid #ff6b35' : 'none'
              }
            }}
          >
            {t('accessibility.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global CSS for accessibility features */}
      <style>{`
        :root {
          --accessibility-text-size: 100%;
        }

        /* High Contrast Mode - WCAG AAA compliant (7:1 contrast ratio) */
        .high-contrast-mode {
          --hc-bg: #FFFFFF;
          --hc-text: #000000;
          --hc-border: #000000;
          --hc-primary: #0000FF;
          --hc-focus: #FF0000;
          --hc-link: #0000FF;
          --hc-link-visited: #800080;
          --hc-button-bg: #000000;
          --hc-button-text: #FFFFFF;
          --hc-button-hover: #333333;
          --hc-card-bg: #FFFFFF;
          --hc-card-border: #000000;
          --hc-input-bg: #FFFFFF;
          --hc-input-border: #000000;
          --hc-input-focus: #0000FF;
          --hc-success: #008000;
          --hc-error: #FF0000;
          --hc-warning: #FFA500;
          --hc-info: #0000FF;
        }

        /* Base high contrast styles */
        .high-contrast-mode,
        .high-contrast-mode body {
          background-color: var(--hc-bg) !important;
          color: var(--hc-text) !important;
        }

        /* All text elements */
        .high-contrast-mode *,
        .high-contrast-mode p,
        .high-contrast-mode span,
        .high-contrast-mode div,
        .high-contrast-mode h1,
        .high-contrast-mode h2,
        .high-contrast-mode h3,
        .high-contrast-mode h4,
        .high-contrast-mode h5,
        .high-contrast-mode h6,
        .high-contrast-mode label,
        .high-contrast-mode td,
        .high-contrast-mode th {
          color: var(--hc-text) !important;
          background-color: transparent !important;
        }

        /* Typography components */
        .high-contrast-mode .MuiTypography-root,
        .high-contrast-mode .MuiTypography-h1,
        .high-contrast-mode .MuiTypography-h2,
        .high-contrast-mode .MuiTypography-h3,
        .high-contrast-mode .MuiTypography-h4,
        .high-contrast-mode .MuiTypography-h5,
        .high-contrast-mode .MuiTypography-h6,
        .high-contrast-mode .MuiTypography-body1,
        .high-contrast-mode .MuiTypography-body2,
        .high-contrast-mode .MuiTypography-caption {
          color: var(--hc-text) !important;
        }

        /* Links */
        .high-contrast-mode a,
        .high-contrast-mode .MuiLink-root {
          color: var(--hc-link) !important;
          text-decoration: underline !important;
          font-weight: 600 !important;
        }

        .high-contrast-mode a:visited,
        .high-contrast-mode .MuiLink-root:visited {
          color: var(--hc-link-visited) !important;
        }

        .high-contrast-mode a:hover,
        .high-contrast-mode a:focus,
        .high-contrast-mode .MuiLink-root:hover,
        .high-contrast-mode .MuiLink-root:focus {
          color: var(--hc-focus) !important;
          outline: 3px solid var(--hc-focus) !important;
          outline-offset: 2px !important;
        }

        /* Buttons */
        .high-contrast-mode .MuiButton-root {
          background-color: var(--hc-button-bg) !important;
          color: var(--hc-button-text) !important;
          border: 3px solid var(--hc-border) !important;
          font-weight: 700 !important;
          min-height: 44px !important;
          padding: 8px 16px !important;
        }

        .high-contrast-mode .MuiButton-root:hover {
          background-color: var(--hc-button-hover) !important;
          border-color: var(--hc-focus) !important;
          outline: 3px solid var(--hc-focus) !important;
          outline-offset: 2px !important;
        }

        .high-contrast-mode .MuiButton-root:focus {
          outline: 4px solid var(--hc-focus) !important;
          outline-offset: 3px !important;
        }

        .high-contrast-mode .MuiButton-outlined {
          background-color: var(--hc-bg) !important;
          color: var(--hc-text) !important;
          border: 3px solid var(--hc-border) !important;
        }

        .high-contrast-mode .MuiButton-text {
          background-color: transparent !important;
          color: var(--hc-link) !important;
          border: 2px solid transparent !important;
          text-decoration: underline !important;
        }

        /* Cards and Paper */
        .high-contrast-mode .MuiCard-root,
        .high-contrast-mode .MuiPaper-root {
          background-color: var(--hc-card-bg) !important;
          color: var(--hc-text) !important;
          border: 3px solid var(--hc-card-border) !important;
          box-shadow: none !important;
        }

        .high-contrast-mode .MuiCardContent-root {
          background-color: transparent !important;
          color: var(--hc-text) !important;
        }

        /* Input fields */
        .high-contrast-mode .MuiTextField-root,
        .high-contrast-mode .MuiInputBase-root,
        .high-contrast-mode input,
        .high-contrast-mode textarea,
        .high-contrast-mode select {
          background-color: var(--hc-input-bg) !important;
          color: var(--hc-text) !important;
          border: 3px solid var(--hc-input-border) !important;
        }

        .high-contrast-mode .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline {
          border-color: var(--hc-input-border) !important;
          border-width: 3px !important;
        }

        .high-contrast-mode .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline,
        .high-contrast-mode .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
          border-color: var(--hc-input-focus) !important;
          border-width: 4px !important;
        }

        .high-contrast-mode input:focus,
        .high-contrast-mode textarea:focus,
        .high-contrast-mode select:focus {
          outline: 4px solid var(--hc-input-focus) !important;
          outline-offset: 2px !important;
        }

        /* Select/Dropdown */
        .high-contrast-mode .MuiSelect-root {
          background-color: var(--hc-input-bg) !important;
          color: var(--hc-text) !important;
          border: 3px solid var(--hc-input-border) !important;
        }

        .high-contrast-mode .MuiMenuItem-root {
          background-color: var(--hc-bg) !important;
          color: var(--hc-text) !important;
          border-bottom: 1px solid var(--hc-border) !important;
        }

        .high-contrast-mode .MuiMenuItem-root:hover,
        .high-contrast-mode .MuiMenuItem-root.Mui-selected {
          background-color: var(--hc-button-bg) !important;
          color: var(--hc-button-text) !important;
          outline: 3px solid var(--hc-focus) !important;
        }

        /* Tables */
        .high-contrast-mode .MuiTable-root,
        .high-contrast-mode table {
          border: 3px solid var(--hc-border) !important;
        }

        .high-contrast-mode .MuiTableCell-root,
        .high-contrast-mode td,
        .high-contrast-mode th {
          border: 2px solid var(--hc-border) !important;
          background-color: var(--hc-bg) !important;
          color: var(--hc-text) !important;
        }

        .high-contrast-mode .MuiTableHead-root th {
          background-color: var(--hc-button-bg) !important;
          color: var(--hc-button-text) !important;
          font-weight: 700 !important;
        }

        /* Alerts and Messages */
        .high-contrast-mode .MuiAlert-root {
          border: 4px solid var(--hc-border) !important;
          font-weight: 600 !important;
        }

        .high-contrast-mode .MuiAlert-standardSuccess {
          background-color: var(--hc-bg) !important;
          color: var(--hc-success) !important;
          border-color: var(--hc-success) !important;
        }

        .high-contrast-mode .MuiAlert-standardError {
          background-color: var(--hc-bg) !important;
          color: var(--hc-error) !important;
          border-color: var(--hc-error) !important;
        }

        .high-contrast-mode .MuiAlert-standardWarning {
          background-color: var(--hc-bg) !important;
          color: var(--hc-warning) !important;
          border-color: var(--hc-warning) !important;
        }

        .high-contrast-mode .MuiAlert-standardInfo {
          background-color: var(--hc-bg) !important;
          color: var(--hc-info) !important;
          border-color: var(--hc-info) !important;
        }

        /* Chips and Badges */
        .high-contrast-mode .MuiChip-root {
          background-color: var(--hc-button-bg) !important;
          color: var(--hc-button-text) !important;
          border: 2px solid var(--hc-border) !important;
          font-weight: 600 !important;
        }

        .high-contrast-mode .MuiBadge-badge {
          background-color: var(--hc-error) !important;
          color: var(--hc-bg) !important;
          border: 2px solid var(--hc-bg) !important;
          font-weight: 700 !important;
        }

        /* Icons */
        .high-contrast-mode .MuiSvgIcon-root,
        .high-contrast-mode svg {
          color: var(--hc-text) !important;
          fill: var(--hc-text) !important;
        }

        .high-contrast-mode .MuiIconButton-root {
          border: 2px solid transparent !important;
        }

        .high-contrast-mode .MuiIconButton-root:hover,
        .high-contrast-mode .MuiIconButton-root:focus {
          border-color: var(--hc-focus) !important;
          outline: 3px solid var(--hc-focus) !important;
          outline-offset: 2px !important;
        }

        /* Dialogs */
        .high-contrast-mode .MuiDialog-paper {
          background-color: var(--hc-bg) !important;
          border: 4px solid var(--hc-border) !important;
          box-shadow: none !important;
        }

        .high-contrast-mode .MuiDialogTitle-root {
          background-color: var(--hc-button-bg) !important;
          color: var(--hc-button-text) !important;
          border-bottom: 3px solid var(--hc-border) !important;
          font-weight: 700 !important;
        }

        /* Dividers */
        .high-contrast-mode .MuiDivider-root {
          border-color: var(--hc-border) !important;
          border-width: 2px !important;
        }

        /* Lists */
        .high-contrast-mode .MuiListItem-root {
          border-bottom: 1px solid var(--hc-border) !important;
        }

        .high-contrast-mode .MuiListItemButton-root:hover,
        .high-contrast-mode .MuiListItemButton-root:focus {
          background-color: var(--hc-button-bg) !important;
          color: var(--hc-button-text) !important;
          outline: 3px solid var(--hc-focus) !important;
          outline-offset: -3px !important;
        }

        /* Focus indicators - Enhanced for high contrast */
        .high-contrast-mode *:focus {
          outline: 4px solid var(--hc-focus) !important;
          outline-offset: 3px !important;
        }

        .high-contrast-mode *:focus-visible {
          outline: 4px solid var(--hc-focus) !important;
          outline-offset: 3px !important;
        }

        /* Sidebar and Navigation */
        .high-contrast-mode [class*="Sidebar"],
        .high-contrast-mode [class*="Drawer"] {
          background-color: var(--hc-bg) !important;
          border-right: 4px solid var(--hc-border) !important;
        }

        .high-contrast-mode [class*="Sidebar"] a,
        .high-contrast-mode [class*="Drawer"] a {
          color: var(--hc-link) !important;
          border-left: 4px solid transparent !important;
        }

        .high-contrast-mode [class*="Sidebar"] a:hover,
        .high-contrast-mode [class*="Sidebar"] a:focus,
        .high-contrast-mode [class*="Drawer"] a:hover,
        .high-contrast-mode [class*="Drawer"] a:focus {
          background-color: var(--hc-button-bg) !important;
          color: var(--hc-button-text) !important;
          border-left-color: var(--hc-focus) !important;
        }

        /* Images - ensure they have borders */
        .high-contrast-mode img {
          border: 2px solid var(--hc-border) !important;
        }

        /* Scrollbars */
        .high-contrast-mode ::-webkit-scrollbar {
          width: 16px !important;
          height: 16px !important;
        }

        .high-contrast-mode ::-webkit-scrollbar-track {
          background: var(--hc-bg) !important;
          border: 2px solid var(--hc-border) !important;
        }

        .high-contrast-mode ::-webkit-scrollbar-thumb {
          background: var(--hc-button-bg) !important;
          border: 2px solid var(--hc-border) !important;
        }

        .high-contrast-mode ::-webkit-scrollbar-thumb:hover {
          background: var(--hc-button-hover) !important;
          border-color: var(--hc-focus) !important;
        }

        .reduced-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }

        .enhanced-focus *:focus {
          outline: 3px solid #ff6b35 !important;
          outline-offset: 2px !important;
        }

        /* Apply text size globally */
        body {
          font-size: var(--accessibility-text-size) !important;
        }

        .MuiTypography-root {
          font-size: calc(var(--accessibility-text-size) * 0.9) !important;
        }

        .MuiTypography-h1 {
          font-size: calc(var(--accessibility-text-size) * 2.5) !important;
        }

        .MuiTypography-h2 {
          font-size: calc(var(--accessibility-text-size) * 2) !important;
        }

        .MuiTypography-h3 {
          font-size: calc(var(--accessibility-text-size) * 1.75) !important;
        }

        .MuiTypography-h4 {
          font-size: calc(var(--accessibility-text-size) * 1.5) !important;
        }

        .MuiTypography-h5 {
          font-size: calc(var(--accessibility-text-size) * 1.25) !important;
        }

        .MuiTypography-h6 {
          font-size: calc(var(--accessibility-text-size) * 1.1) !important;
        }

        .MuiTypography-body1 {
          font-size: calc(var(--accessibility-text-size) * 1) !important;
        }

        .MuiTypography-body2 {
          font-size: calc(var(--accessibility-text-size) * 0.875) !important;
        }

        .MuiTypography-caption {
          font-size: calc(var(--accessibility-text-size) * 0.75) !important;
        }
      `}</style>
    </>
  );
}

export default AccessibilitySettings;
