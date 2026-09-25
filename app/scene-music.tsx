"use client";

import {useEffect,useRef,useState} from 'react';

export type SceneMusicKind='outskirts'|'merchant'|'inn'|'boss'|'raid';
const tracks:Record<SceneMusicKind,{src:string;label:string}>= {
  outskirts:{src:'/assets/music/newbie-outskirts.mp3',label:'新手村郊外'},
  merchant:{src:'/assets/music/merchant-base.mp3',label:'商團駐地'},
  inn:{src:'/assets/music/inn.mp3',label:'客棧'},
  boss:{src:'/assets/music/boss-battle.mp3',label:'世界地圖'},
  raid:{src:'/assets/music/BOSS.mp3',label:'雷霆祭壇'},
};

export function SceneMusic({scene,volume}:{scene:SceneMusicKind;volume:number}){
  const audioRef=useRef<HTMLAudioElement|null>(null);
  const volumeRef=useRef(volume);
  volumeRef.current=volume;
  const [muted,setMuted]=useState(false);
  const [started,setStarted]=useState(false);
  const track=tracks[scene];
  useEffect(()=>{
    const audio=audioRef.current;if(!audio)return;
    audio.src=track.src;audio.loop=true;audio.volume=Math.max(0,Math.min(1,volumeRef.current));
    const start=()=>{void audio.play().then(()=>setStarted(true)).catch(()=>undefined)};
    start();
    window.addEventListener('pointerdown',start,{once:true});
    return()=>{window.removeEventListener('pointerdown',start);audio.pause();audio.currentTime=0};
  },[track.src]);
  useEffect(()=>{if(audioRef.current)audioRef.current.muted=muted},[muted]);
  useEffect(()=>{if(audioRef.current)audioRef.current.volume=Math.max(0,Math.min(1,volume))},[volume]);
  return <>
    <audio ref={audioRef} aria-label={`場景音樂：${track.label}`} preload="auto" />
    <button type="button" className="scene-music-toggle" onClick={()=>{setMuted(value=>!value);if(audioRef.current&&!started)void audioRef.current.play().then(()=>setStarted(true)).catch(()=>undefined)}} aria-pressed={!muted} title={muted?'開啟場景音樂':'關閉場景音樂'}>{muted?'🔇':'♫'} <span>{track.label}</span></button>
  </>;
}
