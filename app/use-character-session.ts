'use client';
import { useEffect, useRef, useState } from 'react';
import { backupBeforeGuildMigration } from './guild-migration';
import {
  itemKind,
  normalizeStoredItem,
  backupBeforeEquipmentMigration,
} from './equipment-slots';
import { gersangItemArt } from './gersang-visuals';
import { parseStoredArray, preserveCorruptStorage } from './storage-guards';
import { createGameTickRolls, settleCurrentGame } from './game-loop';
import { freshGame, isNationId } from './game-hero-factory';
import { createGameSaveScheduler } from './game-save-scheduler';
import {
  profileFromGame,
  readCharacterSave,
  restoreGame,
  saveCharacterProfile,
  writeCharacterSave,
  writeProfileIndex,
  writeSharedWarehouse,
} from './game-profile-storage';
import {
  PROFILE_INDEX,
  SHARED_WAREHOUSE_SAVE,
  profileSaveKey,
  type CharacterProfile,
  type CityService,
  type Equipment,
  type GameState,
} from './game-state';
import type { GameStateSetter } from './game-controller-types';

type Context = {
  game: GameState;
  setGame: GameStateSetter;
  setNotice: (message: string) => void;
  setSelectedUid: (uid: string) => void;
  setCityService: (service: CityService) => void;
  setActiveTab: (tab: string) => void;
};

function currentTimestamp() {
  return Date.now();
}

/** Own character slots, migrations, offline entry, and throttled persistence. */
export function useCharacterSession({
  game,
  setGame,
  setNotice,
  setSelectedUid,
  setCityService,
  setActiveTab,
}: Context) {
  const [ready, setReady] = useState(false);

  const [loginEntered, setLoginEntered] = useState(false);

  const [profiles, setProfiles] = useState<Array<CharacterProfile | null>>([
    null,
    null,
    null,
  ]);

  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const [creatorSlot, setCreatorSlot] = useState<number | null>(null);

  const [deleteCandidate, setDeleteCandidate] = useState<{
    slot: number;
    name: string;
  } | null>(null);

  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const [characterName, setCharacterName] = useState('');

  const [characterGender, setCharacterGender] = useState<'male' | 'female'>(
    'male',
  );

  const [returnReport, setReturnReport] = useState<{
    minutes: number;
    gold: number;
    credit: number;
  } | null>(null);

  const [sharedWarehouse, setSharedWarehouse] = useState<Equipment[]>([]);

  const warehouseWritable = useRef(true);

  const loaded = useRef(false);

  const pendingSave = useRef<ReturnType<
    typeof createGameSaveScheduler<{
      game: GameState;
      profiles: Array<CharacterProfile | null>;
    }>
  > | null>(null);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const savedProfiles = localStorage.getItem(PROFILE_INDEX);
      const savedWarehouse = localStorage.getItem(SHARED_WAREHOUSE_SAVE);
      let nextProfiles: Array<CharacterProfile | null> =
        parseStoredArray<CharacterProfile | null>(savedProfiles);
      nextProfiles = [0, 1, 2].map((slot) => {
        const profile = nextProfiles[slot];
        return profile && isNationId(profile.nation)
          ? { ...profile, slot }
          : null;
      });
      let nextWarehouse: Equipment[] = [];
      let warehouseError = false;
      try {
        nextWarehouse = parseStoredArray<Equipment>(savedWarehouse)
          .map(normalizeStoredItem)
          .map((item) => ({
            ...item,
            image: gersangItemArt(itemKind(item.slot)),
          }));
      } catch {
        warehouseError = true;
        warehouseWritable.current = preserveCorruptStorage(
          localStorage,
          SHARED_WAREHOUSE_SAVE,
          savedWarehouse,
        );
      }
      queueMicrotask(() => {
        setProfiles(nextProfiles);
        setSharedWarehouse(nextWarehouse);
        if (warehouseError)
          setNotice(
            warehouseWritable.current
              ? '共用倉庫資料異常，原始資料已備份並重建空倉庫。'
              : '共用倉庫資料異常且無法備份，已停止寫入以保護原始資料。',
          );
        setReady(true);
      });
    } catch {
      queueMicrotask(() => {
        setProfiles([null, null, null]);
        setNotice('角色欄位資料異常，請重新建立角色。');
        setReady(true);
      });
    }
  }, []);

  useEffect(() => {
    if (!ready || activeSlot === null) return;
    const scheduler = createGameSaveScheduler<{
      game: GameState;
      profiles: Array<CharacterProfile | null>;
    }>((value) => {
      writeCharacterSave(localStorage, activeSlot, value.game);
      const nextProfiles = [...value.profiles];
      nextProfiles[activeSlot] = profileFromGame(activeSlot, value.game);
      writeProfileIndex(localStorage, nextProfiles);
    });
    pendingSave.current = scheduler;
    const flush = () => {
      try {
        scheduler.flush(Date.now(), true);
      } catch {
        setNotice('存檔未成功，請檢查瀏覽器儲存空間。');
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      if (pendingSave.current === scheduler) pendingSave.current = null;
    };
  }, [activeSlot, ready]);

  useEffect(() => {
    if (!ready || activeSlot === null || !pendingSave.current) return;
    pendingSave.current.update({ game, profiles });
    try {
      pendingSave.current.flush(Date.now());
    } catch {
      setNotice('存檔未成功，請檢查瀏覽器儲存空間。');
    }
  }, [activeSlot, game, profiles, ready]);

  useEffect(() => {
    if (!ready) return;
    if (warehouseWritable.current)
      writeSharedWarehouse(localStorage, sharedWarehouse);
  }, [ready, sharedWarehouse]);

  function enterCharacter(slot: number) {
    const profile = profiles[slot];
    if (!profile) return;
    try {
      const raw = readCharacterSave(localStorage, slot);
      if (raw)
        backupBeforeGuildMigration(localStorage, profileSaveKey(slot), raw);
      if (raw)
        backupBeforeEquipmentMigration(localStorage, profileSaveKey(slot), raw);
      let next = raw
        ? restoreGame(JSON.parse(raw))
        : freshGame(
            profile.name,
            profile.gender === 'female' ? 'female' : 'male',
          );
      const now = currentTimestamp();
      const before = next.gold;
      const beforeCredit = next.credit;
      const awayMinutes = Math.max(
        0,
        Math.floor((now - next.lastSeen) / 60000),
      );
      next = settleCurrentGame(next, {
        now,
        roll: 0.99,
        choice: 0,
        spawnRoll: 0,
        encounterCountRoll: createGameTickRolls().encounterCountRoll,
        retaliationRoll: 0,
        materialRolls: [1, 1, 1],
      });
      setReturnReport(
        awayMinutes >= 1
          ? {
              minutes: awayMinutes,
              gold: next.gold - before,
              credit: next.credit - beforeCredit,
            }
          : null,
      );
      next.lastSeen = now;
      writeCharacterSave(localStorage, slot, next);
      setGame(next);
      setSelectedUid('hero');
      setCityService('mercenary');
      setActiveTab('map');
      setActiveSlot(slot);
    } catch {
      setNotice('此角色存檔讀取失敗。');
    }
  }

  function createCharacter() {
    if (creatorSlot === null) return;
    const name = characterName.trim().slice(0, 12);
    if (!name) {
      setNotice('請輸入角色名稱。');
      return;
    }
    const next = {
      ...freshGame(name, characterGender),
      onboardingStep: 'completed' as const,
      hanyangPrologueStep: 'arrival' as const,
    };
    const nextProfiles = [...profiles];
    nextProfiles[creatorSlot] = profileFromGame(creatorSlot, next);
    localStorage.setItem(profileSaveKey(creatorSlot), JSON.stringify(next));
    localStorage.setItem(PROFILE_INDEX, JSON.stringify(nextProfiles));
    setProfiles(nextProfiles);
    setGame(next);
    setCityService('mercenary');
    setSelectedUid('hero');
    setActiveTab('map');
    setActiveSlot(creatorSlot);
    setCreatorSlot(null);
    setCharacterName('');
    setNotice('角色「' + name + '」建立完成。');
  }

  function confirmDeleteCharacter() {
    if (!deleteCandidate) return;
    if (deleteConfirmName.trim() !== deleteCandidate.name) {
      setNotice('請完整輸入角色名稱，才能確認刪除。');
      return;
    }
    const nextProfiles = [...profiles];
    nextProfiles[deleteCandidate.slot] = null;
    localStorage.removeItem(profileSaveKey(deleteCandidate.slot));
    writeProfileIndex(localStorage, nextProfiles);
    setProfiles(nextProfiles);
    setDeleteCandidate(null);
    setDeleteConfirmName('');
    setNotice(`角色「${deleteCandidate.name}」已刪除。`);
  }

  function returnToCharacterSelect() {
    if (activeSlot === null) return;
    const nextProfiles = saveCharacterProfile(
      localStorage,
      profiles,
      activeSlot,
      game,
      profileFromGame(activeSlot, game),
    );
    setProfiles(nextProfiles);
    setActiveSlot(null);
    setReturnReport(null);
    setCreatorSlot(null);
    setNotice('');
  }
  return {
    ready,
    loginEntered,
    setLoginEntered,
    profiles,
    activeSlot,
    setActiveSlot,
    creatorSlot,
    setCreatorSlot,
    deleteCandidate,
    setDeleteCandidate,
    deleteConfirmName,
    setDeleteConfirmName,
    characterName,
    setCharacterName,
    characterGender,
    setCharacterGender,
    returnReport,
    setReturnReport,
    sharedWarehouse,
    setSharedWarehouse,
    enterCharacter,
    createCharacter,
    confirmDeleteCharacter,
    returnToCharacterSelect,
  };
}
