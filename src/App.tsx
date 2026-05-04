import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Cloud, 
  Mic, 
  Volume2, 
  Zap, 
  Key, 
  CircleDollarSign,
  Maximize2,
  RefreshCcw
} from 'lucide-react';
import GameEngine from './game/GameEngine';
import { useAudio } from './hooks/useAudio';
import { fetchEarthquakeData, fetchWeatherData, EarthquakeData, WeatherData } from './services/dataService';
import { COLORS } from './constants';

const App: React.FC = () => {
  const [level, setLevel] = useState(10);
  const [isLive, setIsLive] = useState(true);
  const [coins, setCoins] = useState(0);
  const [hasKey, setHasKey] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  
  const [eqData, setEqData] = useState<EarthquakeData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  const { volume } = useAudio();

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      if (!isLive) return;
      
      if (level === 8) {
        setEqData(await fetchEarthquakeData());
      } else if (level === 9) {
        setWeatherData(await fetchWeatherData());
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000); // 30s updates
    return () => clearInterval(interval);
  }, [level, isLive]);

  const handleLevelComplete = useCallback(() => {
    if (level > 1) {
      setShowTransition(true);
      setTimeout(() => {
        setLevel((prev: number) => prev - 1);
        setHasKey(false);
        setShowTransition(false);
      }, 1500);
    } else {
        alert("COUNTDOWN COMPLETE: PULSE SYNCED.");
    }
  }, [level]);

  const onCollected = (type: string) => {
    if (type === 'coin') setCoins((prev: number) => prev + 1);
    if (type === 'key') setHasKey(true);
  };

  const getLevelInfo = () => {
    switch (level) {
      case 10: return { name: "GLOBAL ORBIT", source: "SATELLITE TELEMETRY", icon: <Maximize2 size={16} /> };
      case 9: return { name: "ATMOS PULSE", source: "OPENWEATHER LIVE", icon: <Cloud size={16} /> };
      case 8: return { name: "TERRA VIBE", source: "USGS SEISMIC FEED", icon: <Activity size={16} /> };
      case 1: return { name: "NEURAL ECHO", source: "PLAYER HARMONICS", icon: <Zap size={16} /> };
      default: return { name: "PULSE SECTOR " + level, source: "SIMULATED ENV", icon: <Activity size={16} /> };
    }
  };

  const info = getLevelInfo();

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden select-none">
      {/* 3D Engine */}
      <div className="absolute inset-0 z-0">
        <GameEngine 
          level={level} 
          micVolume={volume}
          isLive={isLive}
          earthquakeData={eqData}
          weatherData={weatherData}
          onLevelComplete={handleLevelComplete}
          onCollectibleCollected={onCollected}
        />
      </div>

      {/* HUD OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-10 p-8 flex flex-col justify-between">
        {/* Top Header */}
        <div className="flex justify-between items-start">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-ui p-4 rounded-lg flex flex-col gap-1"
          >
             <div className="text-[10px] tracking-[0.2em] text-cyan-400 font-bold opacity-70">
               CORE SYSTEM STATUS
             </div>
             <div className="flex items-center gap-3">
               <h1 className="font-display text-2xl neon-text">LEVEL {level}</h1>
               <div className="h-6 w-[1px] bg-white/20" />
               <div className="flex flex-col">
                 <div className="text-xs font-bold leading-none">{info.name}</div>
                 <div className="text-[9px] opacity-60 flex items-center gap-1">
                   {info.icon}
                   {info.source}
                 </div>
               </div>
             </div>
          </motion.div>

          <div className="flex gap-4 items-center">
             <div className="glass-ui px-4 py-2 rounded-full flex items-center gap-4 pointer-events-auto">
               <div className="flex items-center gap-2">
                 <CircleDollarSign size={16} className="text-yellow-400" />
                 <span className="font-display text-sm">{coins}</span>
               </div>
               <div className={`flex items-center gap-2 transition-opacity ${hasKey ? 'opacity-100' : 'opacity-20'}`}>
                 <Key size={16} className="text-white" />
                 <span className="text-[9px] font-bold uppercase">SECURED</span>
               </div>
             </div>

             <button 
                onClick={() => setIsLive(!isLive)}
                className={`glass-ui px-4 py-2 rounded-full flex items-center gap-2 pointer-events-auto cursor-pointer transition-all ${isLive ? 'border-cyan-500/50' : 'border-red-500/50'}`}
             >
                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-cyan-400 live-indicator' : 'bg-red-500'}`} />
                <span className="text-xs font-bold font-mono tracking-tighter">
                    {isLive ? 'LIVE MODE' : 'STATIC MODE'}
                </span>
             </button>
          </div>
        </div>

        {/* Level Specific Data Feed */}
        <div className="flex justify-between items-end">
           <motion.div 
             key={level}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="glass-ui p-4 rounded-lg min-w-[200px]"
           >
             <div className="text-[10px] font-bold text-magenta-400 tracking-widest mb-2">TELEMETRY DATA</div>
             {level === 8 && eqData && (
                <div className="space-y-1">
                   <div className="text-sm font-mono flex justify-between">MAGNITUDE <span className="text-cyan-400">{eqData.magnitude.toFixed(1)}</span></div>
                   <div className="text-sm font-mono flex justify-between">ACTIVITY <span className="text-cyan-400">{eqData.count} PTS</span></div>
                   <div className="text-[10px] opacity-50 mt-1 uppercase truncate w-40">{eqData.location}</div>
                </div>
             )}
             {level === 9 && weatherData && (
                <div className="space-y-1">
                   <div className="text-sm font-mono flex justify-between">TEMP <span className="text-cyan-400">{weatherData.temp}°C</span></div>
                   <div className="text-sm font-mono flex justify-between">WIND <span className="text-cyan-400">{weatherData.windSpeed} km/h</span></div>
                   <div className="text-sm font-mono flex justify-between">COND <span className="text-cyan-400 uppercase">{weatherData.condition}</span></div>
                </div>
             )}
             {level !== 8 && level !== 9 && (
                <div className="space-y-1">
                   <div className="text-sm font-mono flex justify-between">SIGNAL <span className="text-green-400">STABLE</span></div>
                   <div className="text-sm font-mono flex justify-between">LATENCY <span className="text-green-400">12ms</span></div>
                   <div className="text-[10px] opacity-50">HEARTBEAT NOMINAL</div>
                </div>
             )}
           </motion.div>

           <div className="flex flex-col items-end gap-3">
              <div className="glass-ui p-3 rounded-lg flex items-center gap-3">
                 <Mic size={16} className={volume > 0.3 ? 'text-magenta-400 animate-pulse' : 'text-white/40'} />
                 <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-magenta-500" 
                        animate={{ width: `${volume * 100}%` }}
                        transition={{ type: 'spring', damping: 12 }}
                    />
                 </div>
                 <Volume2 size={16} className="text-white/40" />
              </div>
              <div className="text-[9px] font-mono opacity-50 text-right">
                USE WASD TO MOVE | SPACE TO JUMP<br/>
                SCREAM FOR JUMP BOOST
              </div>
           </div>
        </div>
      </div>

      {/* Transition Effect */}
      <AnimatePresence>
        {showTransition && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black"
          >
             <div className="flex flex-col items-center gap-8">
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                    <RefreshCcw size={64} className="text-cyan-400" />
                </motion.div>
                <div className="text-4xl font-display neon-text tracking-[1em] ml-[1em]">DESCENDING</div>
                <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-cyan-400"
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.5 }}
                    />
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Startup Hint */}
      {!hasKey && coins === 0 && (
         <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-16 z-20 pointer-events-none flex flex-col items-center gap-2"
         >
            <div className="text-xs font-display text-white/40 animate-bounce">COLLECT COINS & FIND KEY</div>
            <div className="w-[1px] h-12 bg-gradient-to-t from-white/20 to-transparent" />
         </motion.div>
      )}
    </div>
  );
}

export default App;
