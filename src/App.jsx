import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  CheckCircle, 
  Circle, 
  Clock, 
  Brain, 
  RotateCcw,
  Split,
  X,
  Moon,
  Sun,
  Settings,
  Volume2,
  VolumeX,
  GripVertical,
  Coffee
} from 'lucide-react';

// --- Constants & Helpers ---
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MAX_TASKS_PER_DAY = 3;

// --- Audio Engine ---
const playSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;

    if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } 
    else if (type === 'retro') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } 
    else if (type === 'bell') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now); 
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
      osc.start(now);
      osc.stop(now + 2.0);
    } 
    else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); 
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1); 
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc.start(now);
      osc.stop(now + 1.0);
    }
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

// --- Reusable Components ---
const Modal = ({ isOpen, onClose, title, children, isDark }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-md p-6 rounded-2xl shadow-xl border ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// --- Main Application ---
export default function App() {
  // --- 1. State: Settings & Persistence ---
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('focusflow_settings');
    return saved ? JSON.parse(saved) : {
      focusTime: 25,
      shortBreak: 5,
      longBreak: 20,
      soundEnabled: true,
      soundType: 'chime',
      darkMode: false
    };
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('focusflow_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('focusflow_notes');
    return saved ? JSON.parse(saved) : [];
  });

  // Cycle Tracking State (0 to 4)
  const [cycleCount, setCycleCount] = useState(() => {
    return parseInt(localStorage.getItem('focusflow_cycle')) || 0;
  });

  // --- 2. State: Timer & UI ---
  const [timerTime, setTimerTime] = useState(settings.focusTime * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState('focus'); 
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  const timerRef = useRef(null);

  // --- 3. Effects (Persistence & Logic) ---
  useEffect(() => { localStorage.setItem('focusflow_tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('focusflow_notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem('focusflow_cycle', cycleCount.toString()); }, [cycleCount]);
  useEffect(() => { 
    localStorage.setItem('focusflow_settings', JSON.stringify(settings)); 
    if (settings.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings]);

  // Timer Logic with Auto-Cycle
  useEffect(() => {
    if (isTimerRunning && timerTime > 0) {
      timerRef.current = setInterval(() => {
        setTimerTime((prev) => {
          const nextTime = prev - 1;
          // Tick sound last 5 seconds
          if (settings.soundEnabled && nextTime <= 5 && nextTime > 0) {
            playSound('tick');
          }
          return nextTime;
        });
      }, 1000);
    } else if (timerTime === 0) {
      clearInterval(timerRef.current);
      setIsTimerRunning(false);
      
      // Play completion sound
      if (settings.soundEnabled) playSound(settings.soundType);

      // --- CYCLE LOGIC ---
      if (timerMode === 'focus') {
        const newCount = cycleCount + 1;
        setCycleCount(newCount);
        
        if (newCount >= 4) {
          // 4th Pomodoro done -> Long Break
          setTimerMode('long');
          setTimerTime(settings.longBreak * 60);
        } else {
          // Normal Pomodoro done -> Short Break
          setTimerMode('short');
          setTimerTime(settings.shortBreak * 60);
        }
      } else if (timerMode === 'short') {
        // Short break done -> Back to Focus
        setTimerMode('focus');
        setTimerTime(settings.focusTime * 60);
      } else if (timerMode === 'long') {
        // Long break done -> Reset Cycle -> Back to Focus
        setCycleCount(0);
        setTimerMode('focus');
        setTimerTime(settings.focusTime * 60);
      }
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, timerTime, timerMode, settings, cycleCount]);

  // --- 4. Handlers ---
  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  
  const resetTimer = () => {
    setIsTimerRunning(false);
    const time = timerMode === 'focus' ? settings.focusTime : timerMode === 'short' ? settings.shortBreak : settings.longBreak;
    setTimerTime(time * 60);
  };

  const switchMode = (mode) => {
    setIsTimerRunning(false);
    setTimerMode(mode);
    // If manually switching to Focus, we don't necessarily reset the cycle unless coming from a completed long break
    // If manually switching to Long, we might want to pretend cycle is full, but for flexibility let's just switch mode.
    const time = mode === 'focus' ? settings.focusTime : mode === 'short' ? settings.shortBreak : settings.longBreak;
    setTimerTime(time * 60);
  };

  const resetCycle = () => {
    setCycleCount(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Task & Drag Handlers
  const addTask = (dayIndex) => {
    const dayTasks = tasks.filter(t => t.dayIndex === dayIndex);
    if (dayTasks.length >= MAX_TASKS_PER_DAY) return;
    const newTask = { id: Date.now().toString(), dayIndex, content: '', status: 'todo', chunks: [] };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (id, field, value) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    if (activeTaskId === id) {
      setIsTimerRunning(false);
      setActiveTaskId(null);
    }
  };

  const activateTask = (task) => {
    if (activeTaskId === task.id) {
      setIsTimerRunning(!isTimerRunning);
    } else {
      setActiveTaskId(task.id);
      setTimerMode('focus');
      setTimerTime(settings.focusTime * 60);
      setIsTimerRunning(true);
      updateTask(task.id, 'status', 'wip');
    }
  };

  const handleDragStart = (e, taskId) => { setDraggedTaskId(taskId); e.target.style.opacity = '0.5'; };
  const handleDragEnd = (e) => { e.target.style.opacity = '1'; setDraggedTaskId(null); };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e, dayIndex) => {
    e.preventDefault();
    const dayTasks = tasks.filter(t => t.dayIndex === dayIndex);
    if (dayTasks.length >= MAX_TASKS_PER_DAY) return;
    if (draggedTaskId) setTasks(tasks.map(t => t.id === draggedTaskId ? { ...t, dayIndex: dayIndex } : t));
  };

  const addChunk = (taskId) => setTasks(tasks.map(t => t.id === taskId ? { ...t, chunks: [...t.chunks, { id: Date.now(), text: '', done: false }] } : t));
  const updateChunk = (taskId, chunkId, field, value) => setTasks(tasks.map(t => t.id === taskId ? { ...t, chunks: t.chunks.map(c => c.id === chunkId ? { ...c, [field]: value } : c) } : t));
  const deleteChunk = (taskId, chunkId) => setTasks(tasks.map(t => t.id === taskId ? { ...t, chunks: t.chunks.filter(c => c.id !== chunkId) } : t));
  const addNote = (e) => { e.preventDefault(); if (!noteInput.trim()) return; setNotes([{ id: Date.now(), text: noteInput }, ...notes]); setNoteInput(''); };
  const deleteNote = (id) => setNotes(notes.filter(n => n.id !== id));

  const getTaskCardStyle = (task) => {
    const isActive = activeTaskId === task.id;
    const base = "relative p-3 rounded-xl border transition-all duration-300 group ";
    const theme = settings.darkMode 
      ? isActive && isTimerRunning 
        ? "bg-blue-900/30 border-blue-500/50 shadow-md ring-1 ring-blue-500/30"
        : task.status === 'done'
          ? "bg-gray-800/50 border-gray-700 opacity-60"
          : "bg-gray-800 border-gray-700 hover:border-gray-600"
      : isActive && isTimerRunning 
        ? "bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-200 ring-offset-2"
        : task.status === 'done'
          ? "bg-gray-50 border-gray-200 opacity-70"
          : "bg-white border-gray-200 hover:border-gray-300 shadow-sm";
    return base + theme;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${settings.darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'} font-sans selection:bg-blue-200 selection:text-blue-900`}>
      {/* Header */}
      <header className={`sticky top-0 z-20 border-b transition-colors duration-300 ${settings.darkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'} backdrop-blur-sm`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/20"><Clock size={18} /></div>
            <h1 className="text-xl font-bold tracking-tight">FocusFlow <span className="text-xs font-normal opacity-50 ml-1">v2.2</span></h1>
          </div>
          <div className="flex items-center gap-3">
             <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-medium transition-colors ${isTimerRunning ? settings.darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700' : settings.darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                {isTimerRunning ? <Play size={14} className="animate-pulse"/> : <Pause size={14}/>} {formatTime(timerTime)}
             </div>
             <button onClick={() => setSettings({...settings, darkMode: !settings.darkMode})} className={`p-2 rounded-lg transition-colors ${settings.darkMode ? 'hover:bg-gray-800 text-yellow-400' : 'hover:bg-gray-100 text-gray-500'}`}>{settings.darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
             <button onClick={() => setIsSettingsOpen(true)} className={`p-2 rounded-lg transition-colors ${settings.darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><Settings size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Planner */}
        <div className="lg:col-span-8 w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${settings.darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Weekly Plan</h2>
            <div className={`text-xs px-2 py-1 rounded border ${settings.darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>Max 3 tasks/day • Drag to move</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {DAYS.map((day, index) => {
              const dayTasks = tasks.filter(t => t.dayIndex === index);
              const isFull = dayTasks.length >= MAX_TASKS_PER_DAY;
              return (
                <div key={day} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, index)} className={`flex flex-col gap-3 min-w-[250px] p-2 rounded-xl transition-colors ${settings.darkMode ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center justify-between px-1">
                    <span className={`font-semibold uppercase text-xs tracking-wider ${settings.darkMode ? 'text-gray-500' : 'text-gray-600'}`}>{day}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isFull ? settings.darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600' : settings.darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>{dayTasks.length}/{MAX_TASKS_PER_DAY}</span>
                  </div>
                  <div className="space-y-3 min-h-[50px]">
                    {dayTasks.map(task => (
                      <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} onDragEnd={handleDragEnd} className={getTaskCardStyle(task)}>
                        <div className="flex items-start gap-2 mb-2">
                          <div className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"><GripVertical size={14} /></div>
                          <button onClick={() => updateTask(task.id, 'status', task.status === 'done' ? 'todo' : 'done')} className={`mt-1 flex-shrink-0 transition-colors ${task.status === 'done' ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}>{task.status === 'done' ? <CheckCircle size={18} /> : <Circle size={18} />}</button>
                          <input type="text" value={task.content} onChange={(e) => updateTask(task.id, 'content', e.target.value)} placeholder="New Task..." className={`flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : settings.darkMode ? 'text-gray-200 placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`} />
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => addChunk(task.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-blue-500"><Split size={14} /></button>
                            <button onClick={() => deleteTask(task.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        {(task.chunks.length > 0) && (
                          <div className="pl-9 mb-3 space-y-1.5">
                            {task.chunks.map(chunk => (
                              <div key={chunk.id} className="flex items-center gap-2 text-xs group/chunk">
                                <button onClick={() => updateChunk(task.id, chunk.id, 'done', !chunk.done)} className={`${chunk.done ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}>{chunk.done ? <CheckCircle size={12} /> : <Circle size={12} />}</button>
                                <input value={chunk.text} onChange={(e) => updateChunk(task.id, chunk.id, 'text', e.target.value)} placeholder="Small chunk..." className={`flex-1 bg-transparent border-none p-0 focus:ring-0 text-xs ${chunk.done ? 'line-through text-gray-500' : settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                                <button onClick={() => deleteChunk(task.id, chunk.id)} className="opacity-0 group-hover/chunk:opacity-100 text-gray-300 hover:text-red-400"><X size={10} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className={`flex items-center justify-between pt-2 mt-2 border-t ${settings.darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                           <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${task.status === 'done' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : task.status === 'wip' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>{task.status === 'wip' ? 'In Progress' : task.status}</span>
                           <button onClick={() => activateTask(task)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${activeTaskId === task.id ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : settings.darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{activeTaskId === task.id && isTimerRunning ? (<> <Pause size={10} fill="currentColor" /> Focusing </>) : (<> <Play size={10} fill="currentColor" /> Focus </>)}</button>
                        </div>
                      </div>
                    ))}
                    {!isFull && ( <button onClick={() => addTask(index)} className={`w-full py-2 border border-dashed rounded-lg transition-all flex items-center justify-center gap-1 text-sm ${settings.darkMode ? 'border-gray-700 text-gray-500 hover:border-gray-600 hover:bg-gray-800' : 'border-gray-300 text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50'}`}><Plus size={16} /> Add Task</button> )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Utilities */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className={`rounded-2xl shadow-sm border overflow-hidden relative ${settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`absolute top-0 left-0 w-full h-1 ${settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className={`h-full transition-all duration-1000 ${timerMode === 'focus' ? 'bg-blue-500' : timerMode === 'short' ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${(timerTime / (timerMode === 'focus' ? settings.focusTime * 60 : timerMode === 'short' ? settings.shortBreak * 60 : settings.longBreak * 60)) * 100}%` }} />
            </div>

            <div className="p-6 text-center">
               <h3 className="text-gray-500 text-sm font-medium uppercase tracking-widest mb-1 flex items-center justify-center gap-2">
                 {timerMode === 'focus' ? 'Focus Cycle' : timerMode === 'short' ? 'Brain Break' : 'Long Recharge'}
                 {timerMode === 'long' && <Coffee size={16} className="text-purple-500 animate-bounce" />}
               </h3>
               
               <div className={`text-6xl font-mono font-bold tracking-tighter mb-2 ${isTimerRunning ? timerMode === 'focus' ? 'text-blue-500' : timerMode === 'short' ? 'text-green-500' : 'text-purple-500' : settings.darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                 {formatTime(timerTime)}
               </div>

               {/* Cycle Dots */}
               <div className="flex justify-center gap-2 mb-6 h-4">
                 {[1, 2, 3, 4].map(step => (
                   <div key={step} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${cycleCount >= step ? 'bg-red-500 scale-110' : settings.darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} title={`Pomodoro ${step}/4`} />
                 ))}
               </div>

               <div className="flex justify-center gap-3 mb-6">
                 <button onClick={toggleTimer} className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 ${isTimerRunning ? 'bg-amber-100 text-amber-600' : 'bg-blue-600 text-white shadow-blue-600/30'}`}>{isTimerRunning ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1"/>}</button>
                 <button onClick={resetTimer} className={`h-14 w-14 rounded-full flex items-center justify-center transition-colors ${settings.darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}><RotateCcw size={24} /></button>
               </div>

               <div className={`flex justify-center gap-2 p-1 rounded-lg inline-flex ${settings.darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                 {['focus', 'short', 'long'].map(mode => (
                   <button key={mode} onClick={() => switchMode(mode)} className={`px-3 py-1 text-xs font-medium rounded capitalize transition-all ${timerMode === mode ? settings.darkMode ? 'bg-gray-600 text-white shadow' : 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>{mode === 'short' ? 'Short' : mode === 'long' ? 'Long' : 'Focus'}</button>
                 ))}
               </div>
               
               {/* Cycle Reset (Hidden unless needed manually) */}
               {cycleCount > 0 && (
                 <button onClick={resetCycle} className="mt-4 text-xs text-gray-400 hover:text-red-400 underline decoration-dotted">Reset Cycle Count</button>
               )}
            </div>
            
            {activeTaskId && ( <div className={`mx-6 mb-6 rounded-lg p-3 flex items-center gap-3 ${settings.darkMode ? 'bg-blue-900/20 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div><div className="text-left overflow-hidden"><div className="text-xs text-blue-500 font-semibold uppercase">Working on</div><div className={`text-sm font-medium truncate ${settings.darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{tasks.find(t => t.id === activeTaskId)?.content || 'Unnamed Task'}</div></div></div> )}
          </div>

          <div className={`rounded-2xl shadow-sm border p-5 flex flex-col h-[400px] ${settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4"><Brain size={20} className="text-purple-500" /><h3 className={`font-bold ${settings.darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Cerebro Externo</h3></div>
            <form onSubmit={addNote} className="flex gap-2 mb-4"><input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Quick thought..." className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 ${settings.darkMode ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-600 focus:bg-gray-800' : 'bg-gray-50 border-gray-200 focus:bg-white'}`} /><button type="submit" className="bg-purple-100 text-purple-600 p-2 rounded-lg hover:bg-purple-200 transition-colors"><Plus size={18} /></button></form>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
               {notes.length === 0 && ( <div className="text-center text-gray-400 text-sm mt-10 italic">Empty brain... for now.</div> )}
               {notes.map(note => ( <div key={note.id} className={`group flex items-start justify-between p-3 rounded-lg border text-sm transition-all ${settings.darkMode ? 'bg-yellow-900/20 border-yellow-700/30 text-yellow-100/80' : 'bg-yellow-50 border-yellow-100 text-gray-700'}`}><span className="break-words">{note.text}</span><button onClick={() => deleteNote(note.id)} className="opacity-0 group-hover:opacity-100 text-yellow-500 hover:text-red-400 transition-opacity ml-2 pt-0.5"><X size={14} /></button></div> ))}
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Timer Settings" isDark={settings.darkMode}>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
             <div><label className="block text-xs font-medium mb-1 text-gray-500">Focus</label><input type="number" value={settings.focusTime} onChange={(e) => setSettings({...settings, focusTime: parseInt(e.target.value) || 25})} className={`w-full p-2 rounded border text-center ${settings.darkMode ? 'bg-gray-900 border-gray-600' : 'bg-gray-50 border-gray-300'}`} /></div>
             <div><label className="block text-xs font-medium mb-1 text-gray-500">Short</label><input type="number" value={settings.shortBreak} onChange={(e) => setSettings({...settings, shortBreak: parseInt(e.target.value) || 5})} className={`w-full p-2 rounded border text-center ${settings.darkMode ? 'bg-gray-900 border-gray-600' : 'bg-gray-50 border-gray-300'}`} /></div>
             <div><label className="block text-xs font-medium mb-1 text-gray-500">Long</label><input type="number" value={settings.longBreak} onChange={(e) => setSettings({...settings, longBreak: parseInt(e.target.value) || 20})} className={`w-full p-2 rounded border text-center ${settings.darkMode ? 'bg-gray-900 border-gray-600' : 'bg-gray-50 border-gray-300'}`} /></div>
          </div>
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
             <div className="flex items-center justify-between mb-3"><span className="font-medium flex items-center gap-2"><Volume2 size={16}/> Notification Sound</span><button onClick={() => setSettings({...settings, soundEnabled: !settings.soundEnabled})} className={`text-xs px-2 py-1 rounded ${settings.soundEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{settings.soundEnabled ? 'ON' : 'OFF'}</button></div>
             {settings.soundEnabled && ( <div className="grid grid-cols-3 gap-2">{['chime', 'retro', 'bell'].map(type => ( <button key={type} onClick={() => { setSettings({...settings, soundType: type}); playSound(type); }} className={`p-2 text-xs rounded border capitalize transition-all ${settings.soundType === type ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-1 ring-blue-500' : settings.darkMode ? 'bg-gray-900 border-gray-600 hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>{type}</button> ))}</div> )}
          </div>
        </div>
      </Modal>
    </div>
  );
}