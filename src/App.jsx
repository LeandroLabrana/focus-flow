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
  MoreHorizontal, 
  RotateCcw,
  Split,
  X
} from 'lucide-react';

// --- Constants ---
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MAX_TASKS_PER_DAY = 3;
const POMODORO_TIME = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK_TIME = 5 * 60; // 5 minutes
const LONG_BREAK_TIME = 20 * 60; // 20 minutes

// --- Helper Components ---

const Button = ({ onClick, children, variant = 'primary', className = '', disabled = false, size = 'md' }) => {
  const baseStyles = "flex items-center justify-center rounded-lg font-medium transition-all duration-200";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 active:scale-95",
    ghost: "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
    success: "bg-green-100 text-green-700 hover:bg-green-200"
  };
  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    icon: "p-2"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

// --- Main Application ---

export default function App() {
  // --- State ---
  
  // Tasks structure: { id, dayIndex, content, status: 'todo'|'wip'|'done', chunks: [{id, text, done}], isExpanded: false }
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('focusflow_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  // External Brain notes
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('focusflow_notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [noteInput, setNoteInput] = useState('');

  // Timer State
  const [timerTime, setTimerTime] = useState(POMODORO_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState('focus'); // 'focus', 'short', 'long'
  const [activeTaskId, setActiveTaskId] = useState(null); // The task currently being tracked
  
  // Refs for intervals and audio
  const timerRef = useRef(null);
  
  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('focusflow_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('focusflow_notes', JSON.stringify(notes));
  }, [notes]);

  // --- Timer Logic ---
  useEffect(() => {
    if (isTimerRunning && timerTime > 0) {
      timerRef.current = setInterval(() => {
        setTimerTime((prev) => prev - 1);
      }, 1000);
    } else if (timerTime === 0) {
      clearInterval(timerRef.current);
      setIsTimerRunning(false);
      // Optional: Play sound here
      if (timerMode === 'focus') {
        // Auto switch to break setup but don't auto start
        setTimerMode('short');
        setTimerTime(SHORT_BREAK_TIME);
      } else {
        setTimerMode('focus');
        setTimerTime(POMODORO_TIME);
      }
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, timerTime, timerMode]);

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerTime(timerMode === 'focus' ? POMODORO_TIME : timerMode === 'short' ? SHORT_BREAK_TIME : LONG_BREAK_TIME);
  };

  const switchMode = (mode) => {
    setIsTimerRunning(false);
    setTimerMode(mode);
    setTimerTime(mode === 'focus' ? POMODORO_TIME : mode === 'short' ? SHORT_BREAK_TIME : LONG_BREAK_TIME);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Task Logic ---

  const addTask = (dayIndex) => {
    const dayTasks = tasks.filter(t => t.dayIndex === dayIndex);
    if (dayTasks.length >= MAX_TASKS_PER_DAY) return;

    const newTask = {
      id: Date.now().toString(),
      dayIndex,
      content: '',
      status: 'todo',
      chunks: [],
      isExpanded: true 
    };
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
      // Pause if clicking active
      setIsTimerRunning(!isTimerRunning);
    } else {
      // Switch to new task
      setActiveTaskId(task.id);
      setTimerMode('focus');
      setTimerTime(POMODORO_TIME);
      setIsTimerRunning(true);
      updateTask(task.id, 'status', 'wip');
    }
  };

  // Chunk Logic
  const addChunk = (taskId) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          chunks: [...t.chunks, { id: Date.now(), text: '', done: false }]
        };
      }
      return t;
    });
    setTasks(updatedTasks);
  };

  const updateChunk = (taskId, chunkId, field, value) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const newChunks = t.chunks.map(c => c.id === chunkId ? { ...c, [field]: value } : c);
        return { ...t, chunks: newChunks };
      }
      return t;
    });
    setTasks(updatedTasks);
  };

  const deleteChunk = (taskId, chunkId) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, chunks: t.chunks.filter(c => c.id !== chunkId) };
      }
      return t;
    });
    setTasks(updatedTasks);
  };

  // External Brain Logic
  const addNote = (e) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    setNotes([{ id: Date.now(), text: noteInput }, ...notes]);
    setNoteInput('');
  };

  const deleteNote = (id) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  // --- Styles & Classes ---
  
  // Dynamic class for the active task highlight
  const getTaskCardStyle = (task) => {
    const isActive = activeTaskId === task.id;
    const base = "relative p-3 rounded-xl border transition-all duration-300 group ";
    
    if (isActive && isTimerRunning) {
      return base + "bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-200 ring-offset-2";
    }
    if (task.status === 'done') {
      return base + "bg-gray-50 border-gray-200 opacity-70";
    }
    return base + "bg-white border-gray-200 hover:border-gray-300 shadow-sm";
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-blue-100">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              <Clock size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">FocusWeek</h1>
          </div>
          
          {/* Quick Stats / Mini Timer Display */}
          <div className="flex items-center gap-4">
             <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-medium ${isTimerRunning ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {isTimerRunning ? <Play size={14} className="animate-pulse"/> : <Pause size={14}/>}
                {formatTime(timerTime)}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Weekly Planner */}
        <div className="lg:col-span-8 w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Weekly Plan</h2>
            <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">Max 3 tasks/day</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {DAYS.map((day, index) => {
              const dayTasks = tasks.filter(t => t.dayIndex === index);
              const isFull = dayTasks.length >= MAX_TASKS_PER_DAY;
              
              return (
                <div key={day} className="flex flex-col gap-3 min-w-[250px]">
                  <div className="flex items-center justify-between px-1">
                    <span className="font-semibold text-gray-600 uppercase text-xs tracking-wider">{day}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isFull ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      {dayTasks.length}/{MAX_TASKS_PER_DAY}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {dayTasks.map(task => (
                      <div key={task.id} className={getTaskCardStyle(task)}>
                        {/* Task Header */}
                        <div className="flex items-start gap-2 mb-2">
                          <button 
                            onClick={() => updateTask(task.id, 'status', task.status === 'done' ? 'todo' : 'done')}
                            className={`mt-1 flex-shrink-0 transition-colors ${task.status === 'done' ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}
                          >
                            {task.status === 'done' ? <CheckCircle size={20} /> : <Circle size={20} />}
                          </button>
                          
                          <input 
                            type="text" 
                            value={task.content}
                            onChange={(e) => updateTask(task.id, 'content', e.target.value)}
                            placeholder="New Task..."
                            className={`flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}
                          />
                          
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => addChunk(task.id)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500" title="Split into chunks">
                              <Split size={14} />
                            </button>
                            <button onClick={() => deleteTask(task.id)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Chunks Area */}
                        {(task.chunks.length > 0) && (
                          <div className="pl-7 mb-3 space-y-1.5">
                            {task.chunks.map(chunk => (
                              <div key={chunk.id} className="flex items-center gap-2 text-xs group/chunk">
                                <button 
                                  onClick={() => updateChunk(task.id, chunk.id, 'done', !chunk.done)}
                                  className={`${chunk.done ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}
                                >
                                  {chunk.done ? <CheckCircle size={12} /> : <Circle size={12} />}
                                </button>
                                <input 
                                  value={chunk.text}
                                  onChange={(e) => updateChunk(task.id, chunk.id, 'text', e.target.value)}
                                  placeholder="Small chunk..."
                                  className={`flex-1 bg-transparent border-none p-0 focus:ring-0 text-xs ${chunk.done ? 'line-through text-gray-400' : 'text-gray-600'}`}
                                />
                                <button onClick={() => deleteChunk(task.id, chunk.id)} className="opacity-0 group-hover/chunk:opacity-100 text-gray-300 hover:text-red-400">
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action Bar */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                          <div className="flex items-center gap-2">
                             <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                               task.status === 'done' ? 'bg-green-100 text-green-700' :
                               task.status === 'wip' ? 'bg-blue-100 text-blue-700' :
                               'bg-gray-100 text-gray-500'
                             }`}>
                               {task.status === 'wip' ? 'In Progress' : task.status}
                             </span>
                          </div>
                          
                          <button 
                            onClick={() => activateTask(task)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              activeTaskId === task.id 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {activeTaskId === task.id && isTimerRunning ? (
                               <> <Pause size={10} fill="currentColor" /> Focusing </>
                            ) : (
                               <> <Play size={10} fill="currentColor" /> Focus </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {!isFull && (
                      <button 
                        onClick={() => addTask(index)}
                        className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-1 text-sm"
                      >
                        <Plus size={16} /> Add Task
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Utilities (Timer + External Brain) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          
          {/* 1. Pomodoro Module */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
                <div 
                  className={`h-full transition-all duration-1000 ${timerMode === 'focus' ? 'bg-blue-500' : 'bg-green-500'}`}
                  style={{ width: `${(timerTime / (timerMode === 'focus' ? POMODORO_TIME : timerMode === 'short' ? SHORT_BREAK_TIME : LONG_BREAK_TIME)) * 100}%` }}
                />
            </div>

            <div className="text-center mb-6 mt-2">
               <h3 className="text-gray-500 text-sm font-medium uppercase tracking-widest mb-1">
                 {timerMode === 'focus' ? 'Focus Cycle' : 'Brain Break'}
               </h3>
               <div className={`text-6xl font-mono font-bold tracking-tighter mb-4 ${
                 isTimerRunning 
                    ? timerMode === 'focus' ? 'text-blue-600' : 'text-green-600'
                    : 'text-gray-700'
               }`}>
                 {formatTime(timerTime)}
               </div>

               <div className="flex justify-center gap-3 mb-6">
                 <button 
                    onClick={toggleTimer}
                    className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                      isTimerRunning ? 'bg-amber-100 text-amber-600' : 'bg-blue-600 text-white'
                    }`}
                 >
                   {isTimerRunning ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1"/>}
                 </button>
                 <button 
                    onClick={resetTimer}
                    className="h-14 w-14 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors"
                 >
                   <RotateCcw size={24} />
                 </button>
               </div>

               <div className="flex justify-center gap-2 bg-gray-50 p-1 rounded-lg inline-flex">
                 <button 
                    onClick={() => switchMode('focus')}
                    className={`px-3 py-1 text-xs font-medium rounded ${timerMode === 'focus' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   Focus
                 </button>
                 <button 
                    onClick={() => switchMode('short')}
                    className={`px-3 py-1 text-xs font-medium rounded ${timerMode === 'short' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   Short Break
                 </button>
                 <button 
                    onClick={() => switchMode('long')}
                    className={`px-3 py-1 text-xs font-medium rounded ${timerMode === 'long' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   Long Break
                 </button>
               </div>
            </div>

            {/* Active Task Indicator in Timer */}
            {activeTaskId && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <div className="text-left overflow-hidden">
                        <div className="text-xs text-blue-500 font-semibold uppercase">Working on</div>
                        <div className="text-sm font-medium text-gray-900 truncate">
                            {tasks.find(t => t.id === activeTaskId)?.content || 'Unnamed Task'}
                        </div>
                    </div>
                </div>
            )}
          </div>

          {/* 2. Cerebro Externo (External Brain) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col h-[400px]">
            <div className="flex items-center gap-2 mb-4 text-gray-700">
               <Brain size={20} className="text-purple-500" />
               <h3 className="font-bold">Cerebro Externo</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Distracted? Dump the thought here instantly and get back to your task.
            </p>

            <form onSubmit={addNote} className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Quick thought..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white"
              />
              <button type="submit" className="bg-purple-100 text-purple-600 p-2 rounded-lg hover:bg-purple-200">
                <Plus size={18} />
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
               {notes.length === 0 && (
                   <div className="text-center text-gray-300 text-sm mt-10 italic">Empty brain... for now.</div>
               )}
               {notes.map(note => (
                 <div key={note.id} className="group flex items-start justify-between bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm text-gray-700">
                    <span className="break-words">{note.text}</span>
                    <button onClick={() => deleteNote(note.id)} className="opacity-0 group-hover:opacity-100 text-yellow-400 hover:text-red-400 transition-opacity ml-2 pt-0.5">
                       <X size={14} />
                    </button>
                 </div>
               ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}