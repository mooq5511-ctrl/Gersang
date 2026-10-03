"use client";
import { useCallback,useEffect,useState } from "react";
import { DEFAULT_GAME_UI_SETTINGS,GAME_UI_SETTINGS_KEY,GameUiSettings,SceneDisplayMode,readGameUiSettings } from './game-ui-config';

type useGamePreferencesContext = {
setNotice: (notice: string) => void;
};

export function useGamePreferences({ setNotice }: useGamePreferencesContext) {
const [uiSettings, setUiSettings] = useState<GameUiSettings>(DEFAULT_GAME_UI_SETTINGS);

const [uiSettingsLoaded, setUiSettingsLoaded] = useState(false);

const setSceneMode = useCallback(async (sceneMode: SceneDisplayMode) => {
    if (sceneMode === "fullscreen") {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      } catch {
        setNotice("瀏覽器未允許全螢幕，已保留目前畫面模式。");
        return;
      }
    } else if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
    setUiSettings(previous => ({ ...previous, sceneMode }));
  }, [setNotice]);

useEffect(() => {
    const syncFullscreen = () => {
      if (!document.fullscreenElement && uiSettings.sceneMode === "fullscreen") {
        setUiSettings(previous => ({ ...previous, sceneMode: "auto" }));
      }
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, [uiSettings.sceneMode]);

useEffect(() => {
    // Preserve the server/client initial snapshot, then load browser preferences.
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setUiSettings(readGameUiSettings());
      setUiSettingsLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

useEffect(() => {
    if (!uiSettingsLoaded) return;
    try { localStorage.setItem(GAME_UI_SETTINGS_KEY, JSON.stringify(uiSettings)); } catch { /* Keep current-session preferences if storage is unavailable. */ }
  }, [uiSettings, uiSettingsLoaded]);
return { uiSettings, setUiSettings, setSceneMode };
}
