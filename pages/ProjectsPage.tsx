
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, CheckCircle2, Circle, User, Plus, Trash2, 
  LayoutGrid, Loader2, Users, BarChart3, MessageSquare, 
  X, UserCheck, ShieldCheck, CornerDownRight
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Project, Task, TeamMember } from '../types';

interface ProjectsPageProps {
  currentUser: string;
}

// Lista oficial de membros da equipe (mesmos do login)
const TEAM_MEMBERS_LIST: TeamMember[] = [
  { id: 'JOÃO PEDRO', name: 'JOÃO PEDRO', role: 'Operação' },
  { id: 'ARTHUR', name: 'ARTHUR', role: 'Operação' },
  { id: 'VINICIUS', name: 'VINICIUS', role: 'Operação' }
];

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Operação Principal', status: 'Ativo', progress: 100 }
];

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ currentUser }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'management'>('management');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchData = async () => {
    setLoading(true);
    if (!supabase) {
      setProjects(MOCK_PROJECTS);
      setSelectedId('p1');
      setLoading(false);
      return;
    }

    try {
      const [projRes, taskRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').order('created_at', { ascending: true })
      ]);
      
      const hasData = (projRes.data?.length || 0) > 0;
      setProjects(hasData ? projRes.data! : MOCK_PROJECTS);
      setTasks(taskRes.data || []);
      
      if (hasData) setSelectedId(projRes.data![0].id);
      else setSelectedId('p1');
    } catch (e) {
      setProjects(MOCK_PROJECTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const selectedProject = projects.find(p => p.id === selectedId);
  const projectTasks = tasks.filter(t => t.project_id === selectedId);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !newTaskText.trim()) return;
    
    const taskPayload = { 
      project_id: selectedId, 
      text: newTaskText, 
      completed: false, 
      instruction_author: currentUser 
    };

    if (supabase) {
      const { data } = await supabase.from('tasks').insert([taskPayload]).select();
      if (data) setTasks([...tasks, data[0]]);
    } else {
      setTasks([...tasks, { ...taskPayload, id: Math.random().toString() } as Task]);
    }
    setNewTaskText('');
  };

  const toggleTask = async (task: Task) => {
    const newStatus = !task.completed;
    const completedAt = newStatus ? new Date().toISOString() : null;
    
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newStatus, completed_at: completedAt || undefined } : t));
    if (supabase) await supabase.from('tasks').update({ completed: newStatus, completed_at: completedAt }).eq('id', task.id);
  };

  const saveTaskDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const originalTask = tasks.find(t => t.id === editingTask.id);
    let updatedTask = { ...editingTask };

    // Registra quem editou as instruções ou notas
    if (editingTask.instructions !== originalTask?.instructions) {
      updatedTask.instruction_author = currentUser;
    }
    if (editingTask.assignee_notes !== originalTask?.assignee_notes) {
      updatedTask.notes_author = currentUser;
    }

    if (supabase) {
      await supabase.from('tasks').update({
        text: updatedTask.text,
        assignee_id: updatedTask.assignee_id,
        instructions: updatedTask.instructions,
        assignee_notes: updatedTask.assignee_notes,
        instruction_author: updatedTask.instruction_author,
        notes_author: updatedTask.notes_author
      }).eq('id', updatedTask.id);
    }

    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setIsTaskModalOpen(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-gray-200 w-fit shadow-sm">
        <button onClick={() => setActiveSubTab('management')} className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-indigo-600 text-white shadow-xl shadow-indigo-100">
          <LayoutGrid size={16} /> Gestão de Tarefas
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-4">
          <div className="px-4 py-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Projetos Ativos</h3>
            {projects.map((project) => (
              <button key={project.id} onClick={() => setSelectedId(project.id)} className={`w-full text-left p-6 rounded-[2rem] border-2 mb-4 transition-all ${selectedId === project.id ? 'bg-white border-indigo-600 shadow-xl' : 'bg-white border-transparent shadow-sm hover:border-gray-200'}`}>
                <h4 className="font-black text-gray-900 mb-1 truncate uppercase tracking-tight">{project.name}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-indigo-50 text-indigo-600">{project.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8">
          {selectedProject && (
            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-2xl flex flex-col">
              <div className="flex justify-between items-center border-b border-gray-100 pb-8 mb-8">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{selectedProject.name}</h2>
              </div>
              <div className="space-y-8">
                <form onSubmit={addTask} className="flex gap-4">
                  <input type="text" placeholder="Qual a próxima ação da operação?" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none shadow-inner" />
                  <button type="submit" className="px-8 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Add</button>
                </form>
                <div className="space-y-4">
                  {projectTasks.map((task) => (
                    <div key={task.id} className="group flex items-center justify-between p-6 rounded-[2rem] border bg-white border-gray-100 hover:border-indigo-200 transition-all shadow-sm">
                      <div className="flex items-center gap-6">
                        <button onClick={() => toggleTask(task)} className="transition-transform active:scale-90">{task.completed ? <CheckCircle2 size={32} className="text-emerald-500" /> : <Circle size={32} className="text-gray-200" />}</button>
                        <div>
                          <span className={`text-lg font-bold ${task.completed ? 'line-through text-gray-300' : 'text-gray-800'}`}>{task.text}</span>
                          <div className="flex items-center gap-4 mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-600">
                             {task.instruction_author && <div className="flex items-center gap-1"><ShieldCheck size={12}/> {task.instruction_author}</div>}
                             {task.assignee_id && <div className="flex items-center gap-1 text-gray-400">| RESP: {task.assignee_id}</div>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => {setEditingTask({...task}); setIsTaskModalOpen(true);}} className="p-4 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"><MessageSquare size={22}/></button>
                    </div>
                  ))}
                  {projectTasks.length === 0 && (
                    <div className="py-10 text-center text-gray-300 font-bold uppercase text-xs tracking-widest border-2 border-dashed border-gray-100 rounded-[2rem]">Nenhuma tarefa ativa</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isTaskModalOpen && editingTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-in">
             <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-gray-900 uppercase tracking-tight">Registro de Operação</h3>
                <button onClick={() => setIsTaskModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"><X size={24}/></button>
             </div>
             <form onSubmit={saveTaskDetails} className="p-10 space-y-10">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Responsável</label>
                    <select value={editingTask.assignee_id || ''} onChange={e => setEditingTask({...editingTask, assignee_id: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 shadow-inner appearance-none">
                      <option value="">Não Atribuído</option>
                      {TEAM_MEMBERS_LIST.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Usuário Logado</label>
                    <div className="px-6 py-4 bg-indigo-600 rounded-2xl text-white text-sm font-black flex items-center gap-3 shadow-lg shadow-indigo-100">
                       <ShieldCheck size={20}/> {currentUser}
                    </div>
                  </div>
                </div>

                <div>
                   <div className="flex justify-between items-center mb-4">
                      <label className="block text-[11px] font-black uppercase text-indigo-600 tracking-widest">Instruções de Comando</label>
                      {editingTask.instruction_author && <span className="text-[9px] font-black text-gray-300 uppercase">Por: {editingTask.instruction_author}</span>}
                   </div>
                   <textarea rows={4} value={editingTask.instructions || ''} onChange={e => setEditingTask({...editingTask, instructions: e.target.value})} className="w-full bg-gray-50 border-none rounded-3xl px-6 py-5 text-sm font-medium shadow-inner focus:ring-2 focus:ring-indigo-600" placeholder="O que deve ser executado nesta tarefa?" />
                </div>

                <div>
                   <div className="flex justify-between items-center mb-4">
                      <label className="block text-[11px] font-black uppercase text-emerald-600 tracking-widest">Notas de Execução / Feedback</label>
                      {editingTask.notes_author && <span className="text-[9px] font-black text-gray-300 uppercase">Anotado por: {editingTask.notes_author}</span>}
                   </div>
                   <textarea rows={3} value={editingTask.assignee_notes || ''} onChange={e => setEditingTask({...editingTask, assignee_notes: e.target.value})} className="w-full bg-emerald-50/30 border-none rounded-3xl px-6 py-5 text-sm font-medium shadow-inner focus:ring-2 focus:ring-emerald-500" placeholder="Relato de como foi a execução..." />
                </div>

                <div className="flex gap-6 pt-4">
                   <button type="button" onClick={() => setIsTaskModalOpen(false)} className="flex-1 font-black text-xs uppercase text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
                   <button type="submit" className="flex-[2] bg-indigo-600 text-white font-black uppercase text-xs tracking-widest py-5 rounded-[1.5rem] shadow-xl hover:bg-indigo-700 hover:-translate-y-0.5 transition-all">Salvar Operação</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
