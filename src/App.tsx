import React, { useState, KeyboardEvent, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { Plus, Trash2, CheckCircle2, Circle, AlertCircle, ArrowUpDown, Flame, Layers, Wind, GripVertical, Keyboard } from 'lucide-react';
import confetti from 'canvas-confetti';

// A subtle "ping" sound for task completion (Base64 encoded)
const PING_SOUND = 'data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVIAAACcnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJyc';

type Priority = 'low' | 'medium' | 'high';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  createdAt: number;
}

const PRIORITY_RANK = {
  high: 3,
  medium: 2,
  low: 1
};

const PRIORITY_COLORS = {
  high: 'bg-red-50 text-red-600 border-red-100',
  medium: 'bg-amber-50 text-amber-600 border-amber-100',
  low: 'bg-emerald-50 text-emerald-600 border-emerald-100',
};

const PRIORITY_ICONS = {
  high: Flame,
  medium: Layers,
  low: Wind
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('triotasks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load tasks from local storage', e);
      return [];
    }
  });
  const [inputValue, setInputValue] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [errorVisible, setErrorVisible] = useState(false);
  const [isSortedByPriority, setIsSortedByPriority] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('triotasks', JSON.stringify(tasks));
  }, [tasks]);

  const sortedTasks = useMemo(() => {
    if (isSortedByPriority) {
      return [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) return (a.completed ? 1 : -1);
        return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      });
    }
    return tasks;
  }, [tasks, isSortedByPriority]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input (except for Esc to blur)
      const isTyping = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      
      if (e.key === 'Escape') {
        if (isTyping) (e.target as HTMLElement).blur();
        cancelEdit();
        setShowShortcuts(false);
        return;
      }

      if (e.key === '?' && e.shiftKey) {
        setShowShortcuts(prev => !prev);
        return;
      }

      if (isTyping) return;

      // Global navigation/actions
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        inputRef.current?.focus();
      }

      if (e.key.toLowerCase() === 'c' && e.shiftKey) {
        e.preventDefault();
        clearCompleted();
      }

      // Index-based actions
      if (['1', '2', '3'].includes(e.key)) {
        const index = parseInt(e.key) - 1;
        const task = sortedTasks[index];
        if (task) {
          if (e.altKey) {
            deleteTask(task.id);
          } else {
            toggleTask(task.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [tasks, sortedTasks, showShortcuts]);

  const addTask = () => {
    if (inputValue.trim() === '') return;
    
    if (tasks.length >= 3) {
      setErrorVisible(true);
      setTimeout(() => setErrorVisible(false), 3000);
      return;
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      text: inputValue.trim(),
      completed: false,
      priority,
      createdAt: Date.now()
    };

    setTasks([...tasks, newTask]);
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  const startEditing = (task: Task) => {
    if (task.completed) return;
    setEditingId(task.id);
    setEditText(task.text);
    setEditPriority(task.priority);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = () => {
    if (editText.trim() === '' || !editingId) return;
    setTasks(tasks.map(t => t.id === editingId ? { ...t, text: editText.trim(), priority: editPriority } : t));
    setEditingId(null);
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    const isNowCompleted = task ? !task.completed : false;
    
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    
    if (isNowCompleted) {
      // Direct celebratory feedback
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#262626', '#a8a29e', '#e7e5e4'],
        disableForReducedMotion: true
      });

      try {
        const audio = new Audio(PING_SOUND);
        audio.volume = 0.1;
        audio.play().catch(() => {}); // Browser may block auto-play until user interaction
      } catch (e) {
        // Silently fail if audio is not supported
      }
    }

    if (editingId === id) setEditingId(null);
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const clearCompleted = () => {
    setTasks(tasks.filter(t => !t.completed));
  };

  const slotsRemaining = 3 - tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <main className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-8 border border-stone-100">
        <header className="mb-8 text-center relative">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 mb-2">TrioTask</h1>
          <p className="text-stone-400 text-sm font-medium uppercase tracking-widest text-[10px]">Prime Directive: Focus</p>
          
          <button 
            onClick={() => setIsSortedByPriority(!isSortedByPriority)}
            className={`absolute -right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
              isSortedByPriority ? 'bg-stone-900 text-white shadow-md' : 'text-stone-300 hover:text-stone-500'
            }`}
            title="Toggle Priority Sort"
          >
            <ArrowUpDown size={18} />
          </button>
        </header>

        {/* Slot Progress */}
        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2].map((i) => {
            const isActive = i < tasks.length;
            const isCompleted = isActive && tasks[i].completed;
            
            return (
              <motion.div 
                key={i}
                animate={{
                  scale: isActive ? [1, 1.2, 1] : 1,
                  backgroundColor: isActive 
                    ? isCompleted ? '#e7e5e4' : '#1c1917'
                    : '#f5f5f4'
                }}
                transition={{
                  scale: { duration: 0.3 },
                  backgroundColor: { duration: 0.5 }
                }}
                className="h-2 w-12 rounded-full shadow-inner"
              />
            );
          })}
        </div>

        {/* Input Section */}
        <div className="relative mb-6">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={tasks.length >= 3 ? "List full" : "What's the mission?"}
                disabled={tasks.length >= 3}
                className={`w-full px-5 py-4 bg-stone-50 rounded-2xl border-none focus:ring-2 focus:ring-stone-800 transition-all text-stone-800 placeholder:text-stone-300 ${
                  tasks.length >= 3 ? 'cursor-not-allowed opacity-50' : ''
                }`}
              />
              <button
                onClick={addTask}
                disabled={tasks.length >= 3 || inputValue.trim() === ''}
                className={`p-4 rounded-2xl transition-all ${
                  tasks.length >= 3 
                    ? 'bg-stone-100 text-stone-300 cursor-not-allowed' 
                    : 'bg-stone-900 text-white hover:bg-stone-800 active:scale-95 shadow-lg shadow-stone-200'
                }`}
              >
                <Plus size={24} />
              </button>
            </div>

            {/* Priority Selector */}
            <div className="flex gap-2 justify-center">
              {(['low', 'medium', 'high'] as Priority[]).map((p) => {
                const Icon = PRIORITY_ICONS[p];
                return (
                  <button
                    key={p}
                    disabled={tasks.length >= 3}
                    onClick={() => setPriority(p)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                      priority === p 
                        ? PRIORITY_COLORS[p] 
                        : 'bg-transparent text-stone-300 border-stone-100 hover:border-stone-200'
                    } ${tasks.length >= 3 ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    <Icon size={12} />
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {errorVisible && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -bottom-10 left-0 right-0 flex items-center justify-center gap-2 text-red-500 text-xs font-medium"
              >
                <AlertCircle size={14} />
                <span>Space limit reached. Complete one.</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* List Section */}
        <div className="space-y-4 min-h-[260px]">
          <Reorder.Group 
            axis="y" 
            values={sortedTasks} 
            onReorder={(newOrder) => {
              // Only allow reordering if not in priority sort mode to avoid erratic jumps
              if (!isSortedByPriority) {
                setTasks(newOrder);
              }
            }}
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {sortedTasks.map((task) => (
                <TaskItem 
                  key={task.id}
                  task={task}
                  isSortedByPriority={isSortedByPriority}
                  editingId={editingId}
                  editText={editText}
                  setEditText={setEditText}
                  editPriority={editPriority}
                  setEditPriority={setEditPriority}
                  handleEditKeyDown={handleEditKeyDown}
                  saveEdit={saveEdit}
                  toggleTask={toggleTask}
                  startEditing={startEditing}
                  deleteTask={deleteTask}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>

          {tasks.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center py-12 text-stone-300 italic"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-stone-200 mb-4 flex items-center justify-center">
                <Plus size={20} className="opacity-20" />
              </div>
              <p>Minimal list. Minimal stress.</p>
            </motion.div>
          )}
        </div>

        {/* Footer info */}
        <footer className="mt-8 pt-8 border-t border-stone-100 flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <p className="text-stone-300 text-[10px] uppercase tracking-[0.2em] font-bold">
              {slotsRemaining === 0 
                ? "Max Capacity" 
                : `${slotsRemaining} Space${slotsRemaining !== 1 ? 's' : ''} Remaining`}
            </p>
            <button 
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="text-stone-200 hover:text-stone-400 transition-colors"
              title="Keyboard Shortcuts (Shift + ?)"
            >
              <Keyboard size={14} />
            </button>
          </div>

          <AnimatePresence>
            {completedCount > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={clearCompleted}
                className="text-stone-400 hover:text-stone-900 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 px-4 py-2 bg-stone-50 hover:bg-stone-100 rounded-full transition-all active:scale-95"
              >
                Clear {completedCount} Completed <span className="opacity-40 text-[8px] font-black ml-1">⇧C</span>
              </motion.button>
            )}
          </AnimatePresence>
        </footer>

        {/* Shortcuts Overlay */}
        <AnimatePresence>
          {showShortcuts && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/80 backdrop-blur-sm"
              onClick={() => setShowShortcuts(false)}
            >
              <motion.div 
                className="w-full max-w-xs bg-stone-900 text-stone-100 p-6 rounded-3xl shadow-2xl space-y-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-[0.2em]">Quick Command</h3>
                  <kbd className="px-2 py-1 bg-stone-800 rounded-lg text-[10px] border border-stone-700">ESC</kbd>
                </div>
                
                <div className="space-y-4">
                  {[
                    { key1: "N", label: "Focus Input" },
                    { key1: "1-3", label: "Toggle Completion" },
                    { key1: "ALT", key2: "1-3", label: "Delete Task" },
                    { key1: "⇧", key2: "C", label: "Clear Finished" },
                    { key1: "⇧", key2: "?", label: "Toggle This Help" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <span className="text-stone-400 text-xs font-medium group-hover:text-stone-200 transition-colors">{s.label}</span>
                      <div className="flex gap-1">
                        <kbd className="px-1.5 py-0.5 bg-stone-800 rounded min-w-[20px] text-center text-[10px] font-mono border border-stone-700">{s.key1}</kbd>
                        {s.key2 && (
                          <>
                            <span className="text-stone-600 text-[10px]">+</span>
                            <kbd className="px-1.5 py-0.5 bg-stone-800 rounded min-w-[20px] text-center text-[10px] font-mono border border-stone-700">{s.key2}</kbd>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function TaskItem({ 
  task, 
  isSortedByPriority, 
  editingId, 
  editText, 
  setEditText, 
  editPriority, 
  setEditPriority, 
  handleEditKeyDown, 
  saveEdit, 
  toggleTask, 
  startEditing, 
  deleteTask 
}: { 
  key?: string;
  task: Task; 
  isSortedByPriority: boolean; 
  editingId: string | null; 
  editText: string; 
  setEditText: React.Dispatch<React.SetStateAction<string>>;
  editPriority: Priority;
  setEditPriority: React.Dispatch<React.SetStateAction<Priority>>;
  handleEditKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  saveEdit: () => void;
  toggleTask: (id: string) => void;
  startEditing: (t: Task) => void;
  deleteTask: (id: string) => void;
}) {
  const dragControls = useDragControls();
  const Icon = PRIORITY_ICONS[task.priority];

  return (
    <Reorder.Item
      value={task}
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: task.completed ? 0.6 : 1, 
        scale: task.completed ? 0.98 : 1,
        rotateZ: task.completed ? -0.5 : 0,
      }}
      whileTap={{ scale: 0.99, rotateZ: 0 }}
      whileDrag={{ 
        scale: 1.05,
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      }}
      exit={{ 
        opacity: 0, 
        scale: 0.8, 
        x: 40,
        filter: "blur(4px)"
      }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 30,
        opacity: { duration: 0.2 }
      }}
      className={`group flex items-center gap-2 p-5 rounded-2xl border transition-[background-color,border-color,opacity,shadow] ${
        task.completed 
          ? 'bg-stone-50 border-stone-100' 
          : 'bg-white border-stone-100 hover:border-stone-200 shadow-sm'
      } ${editingId === task.id ? 'ring-2 ring-stone-900 border-transparent shadow-md' : ''}`}
    >
      {!isSortedByPriority && (
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="cursor-grab active:cursor-grabbing text-stone-200 hover:text-stone-400 p-2 -ml-2 rounded-lg hover:bg-stone-50 transition-colors shrink-0"
        >
          <GripVertical size={18} />
        </div>
      )}

      <button 
        onClick={() => toggleTask(task.id)}
        disabled={editingId === task.id}
        className={`relative transition-colors shrink-0 ${task.completed ? 'text-stone-300' : 'text-stone-800 hover:text-stone-500'} ${editingId === task.id ? 'opacity-20 cursor-not-allowed' : ''}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={task.completed ? 'checked' : 'unchecked'}
            initial={{ scale: 0.8, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotate: 15 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
          </motion.div>
        </AnimatePresence>
      </button>
      
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {editingId === task.id ? (
          <div className="space-y-2">
            <input
              autoFocus
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="w-full bg-stone-50 px-2 py-1 rounded text-base font-medium outline-none focus:bg-stone-100"
            />
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setEditPriority(p)}
                  className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider transition-all border ${
                    editPriority === p 
                      ? PRIORITY_COLORS[p] 
                      : 'bg-transparent text-stone-300 border-stone-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <span 
              onClick={() => startEditing(task)}
              className={`text-base font-medium truncate transition-all cursor-pointer ${
                task.completed ? 'text-stone-400 line-through' : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              {task.text}
            </span>
            <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${
              task.completed ? 'text-stone-300' : PRIORITY_COLORS[task.priority].split(' ')[1]
            }`}>
              <Icon size={10} />
              {task.priority} Priority
            </div>
          </>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        {editingId === task.id ? (
          <button 
            onClick={saveEdit}
            className="p-2 text-stone-900 hover:bg-stone-100 rounded-lg transition-all"
            title="Save Changes"
          >
            <Plus className="rotate-45 scale-125" size={18} />
          </button>
        ) : (
          <button 
            onClick={() => deleteTask(task.id)}
            className="p-2 text-stone-200 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 shrink-0"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
    </Reorder.Item>
  );
}
