
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, CheckCircle2, Circle, User, Plus, Trash2, 
  LayoutGrid, Loader2, Users, BarChart3, MessageSquare, 
  X, UserCheck, ShieldCheck, CornerDownRight, TrendingUp,
  FolderPlus
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { supabase } from '../services/supabaseClient';
import { Project, Task, TeamMember } from '../types';

interface ProjectsPageProps {
  currentUser: string;
}

const TEAM_MEMBERS_LIST: TeamMember[] = [
  { id: 'JOÃO PEDRO', name: 'JOÃO PEDRO', role: 'Operação' },
  { id: 'ARTHUR', name: 'ARTHUR', role: 'Operação' },
  { id: 'VINICIUS', name: 'VINICIUS', role: 'Operação' }
];

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Operação Principal', status: 'Ativo', progress: 0 }
];

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ currentUser }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  
  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  // States for forms
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

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
      
      if (hasData && !selectedId) setSelectedId(projRes.data![0].id);
      else if (!selectedId) setSelectedId('p1');
    } catch (e) {
      setProjects(MOCK_PROJECTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || isCreatingProject) return;
    setIsCreatingProject(true);

    const projectPayload = {
      name: newProjectName.trim(),
      status: 'Ativo',
      progress: 0
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('projects').insert([projectPayload]).select();
        if (data) {
          setProjects([data[0], ...projects]);
          setSelectedId(data[0].id);
          setIsProjectModalOpen(false);
          setNewProjectName('');
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      const mockId = Math.random().toString();
      const newProj = { ...projectPayload, id: mockId } as Project;
      setProjects([newProj, ...projects]);
      setSelectedId(mockId);
      setIsProjectModalOpen(false);
      setNewProjectName('');
    }
    setIsCreatingProject(false);
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Excluir esta operação e todas as suas tarefas?')) return;
    
    if (supabase) {
      await supabase.from('tasks').delete().eq('project_id', projectId);
      await supabase.from('projects').delete().eq('id', projectId);
    }
    
    setProjects(projects.filter(p => p.id !== projectId));
    setTasks(tasks.filter(t => t.project_id !== projectId));
    if (selectedId === projectId) setSelectedId(projects[0]?.id || null);
  };

  // --- Lógica de Produtividade (Gráfico) ---
  const productivityData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const completedCount = tasks.filter(t => 
        t.completed && 
        t.completed_at && 
        t.completed_at.split('T')[0] === date
      ).length;

      const [y, m, d] = date.split('-');
      return {
        date,
        label: `${d}/${m}`,
        completed: completedCount
      };
    });
  }, [tasks]);

  // --- Lógica de Progresso por Projeto ---
  const projectsWithProgress = useMemo(() => {
    return projects.map(p => {
      const pTasks = tasks.filter(t => t.project_id === p.id);
      const completed = pTasks.filter(t => t.completed).length;
      const progress = pTasks.length > 0 ? Math.round((completed / pTasks.length) * 100) : 0;
      return { ...p, progress };
    });
  }, [projects, tasks]);

  const selectedProject = projectsWithProgress.find(p => p.id === selectedId);
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

  const deleteTask = async (taskId: string) => {
    if (!confirm('Excluir esta tarefa?')) return;
    if (supabase) await supabase.from('tasks').delete().eq('id', taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const saveTaskDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    const originalTask = tasks.find(t => t.id === editingTask.id);
    let updatedTask = { ...editingTask };

    if (editingTask.instructions !== originalTask?.instructions) updatedTask.instruction_author = currentUser;
    if (editingTask.assignee_notes !== originalTask?.assignee_notes) updatedTask.notes_author = currentUser;

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
      
      {/* HEADER E GRÁFICO DE PRODUTIVIDADE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm flex flex-col justify-center">
           <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4">
              <TrendingUp size={24}/>
           </div>
           <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">Performance Semanal</h3>
           <p className="text-gray-400 text-xs font-bold uppercase mt-2 tracking-widest">Tarefas entregues pela equipe</p>
           <div className="mt-6">
              <span className="text-4xl font-black text-indigo-600">{tasks.filter(t => t.completed).length}</span>
              <span className="text-gray-300 font-black text-lg ml-2 uppercase">Total</span>
           </div>
        </div>
        
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm h-[220px]">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productivityData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} dy={10} />
                 <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                 />
                 <Bar dataKey="completed" name="Concluídas" radius={[6, 6, 0, 0]} barSize={40}>
                    {productivityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.completed > 0 ? '#4f46e5' : '#e2e8f0'} />
                    ))}
                 </Bar>
              </BarChart>
           </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* SIDEBAR DE PROJETOS */}
        <div className="lg:col-span-4 space-y-4">
          <div className="px-4 py-2">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Operações Ativas</h3>
               <button 
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
               >
                 <Plus size={14}/> Nova
               </button>
            </div>
            
            {projectsWithProgress.map((project) => (
              <div key={project.id} className="relative group mb-4">
                <button 
                  onClick={() => setSelectedId(project.id)} 
                  className={`w-full text-left p-6 rounded-[2.5rem] border-2 transition-all relative overflow-hidden ${selectedId === project.id ? 'bg-white border-indigo-600 shadow-xl' : 'bg-white border-transparent shadow-sm hover:border-gray-200'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                     <h4 className="font-black text-gray-900 truncate uppercase tracking-tight flex-1 pr-6">{project.name}</h4>
                     <span className="text-[11px] font-black text-indigo-600 ml-2">{project.progress}%</span>
                  </div>
                  
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                     <div 
                      className="h-full bg-indigo-600 transition-all duration-1000 ease-out" 
                      style={{ width: `${project.progress}%` }}
                     />
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${project.progress === 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {project.progress === 100 ? 'Concluído' : project.status}
                    </span>
                  </div>
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                  className="absolute top-6 right-6 p-2 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16}/>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* LISTA DE TAREFAS */}
        <div className="lg:col-span-8">
          {selectedProject ? (
            <div className="bg-white border border-gray-200 rounded-[3rem] p-10 shadow-2xl flex flex-col min-h-[600px]">
              <div className="flex justify-between items-center border-b border-gray-100 pb-8 mb-8">
                <div>
                   <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{selectedProject.name}</h2>
                   <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Gestão de Fluxo e Micro-Gerenciamento</p>
                </div>
                <div className="text-right">
                   <span className="text-2xl font-black text-indigo-600">{selectedProject.progress}%</span>
                   <p className="text-[9px] font-black text-gray-300 uppercase">Concluído</p>
                </div>
              </div>

              <div className="space-y-8">
                <form onSubmit={addTask} className="flex gap-4">
                  <input type="text" placeholder="Qual a próxima ação da operação?" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none shadow-inner" />
                  <button type="submit" className="px-8 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Add</button>
                </form>

                <div className="space-y-4">
                  {projectTasks.map((task) => (
                    <div key={task.id} className="group flex items-center justify-between p-6 rounded-[2.5rem] border bg-white border-gray-100 hover:border-indigo-200 transition-all shadow-sm">
                      <div className="flex items-center gap-6">
                        <button onClick={() => toggleTask(task)} className="transition-transform active:scale-90">
                           {task.completed ? <CheckCircle2 size={32} className="text-emerald-500" /> : <Circle size={32} className="text-gray-200" />}
                        </button>
                        <div>
                          <span className={`text-lg font-bold ${task.completed ? 'line-through text-gray-300' : 'text-gray-800'}`}>{task.text}</span>
                          <div className="flex items-center gap-4 mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-600">
                             {task.instruction_author && <div className="flex items-center gap-1"><ShieldCheck size={12}/> {task.instruction_author}</div>}
                             {task.assignee_id && <div className="flex items-center gap-1 text-gray-400">| RESP: {task.assignee_id}</div>}
                             {task.completed && task.completed_at && <div className="flex items-center gap-1 text-emerald-500">| OK: {new Date(task.completed_at).toLocaleDateString('pt-BR')}</div>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => {setEditingTask({...task}); setIsTaskModalOpen(true);}} className="p-4 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"><MessageSquare size={22}/></button>
                        <button onClick={() => deleteTask(task.id)} className="p-4 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                      </div>
                    </div>
                  ))}
                  {projectTasks.length === 0 && (
                    <div className="py-20 text-center text-gray-300 font-bold uppercase text-xs tracking-widest border-4 border-dashed border-gray-50 rounded-[3rem]">Nenhuma tarefa ativa</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50/50 rounded-[3rem] p-20 text-center border-4 border-dashed border-gray-200">
               <Briefcase size={48} className="mx-auto text-gray-200 mb-6"/>
               <h3 className="text-xl font-black text-gray-300 uppercase tracking-widest">Selecione uma operação para gerir</h3>
            </div>
          )}
        </div>
      </div>

      {/* MODAL NOVA OPERAÇÃO */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
             <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2"><FolderPlus size={20} className="text-indigo-600"/> Iniciar Operação</h3>
                <button onClick={() => setIsProjectModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"><X size={24}/></button>
             </div>
             <form onSubmit={addProject} className="p-10 space-y-8">
                <div>
                   <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Nome da Operação / Projeto</label>
                   <input 
                    required 
                    autoFocus
                    type="text" 
                    value={newProjectName} 
                    onChange={e => setNewProjectName(e.target.value)} 
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 shadow-inner"
                    placeholder="Ex: Escala de Verão 2024"
                   />
                </div>
                <button 
                  type="submit" 
                  disabled={isCreatingProject}
                  className="w-full bg-indigo-600 text-white font-black uppercase text-xs tracking-widest py-5 rounded-[1.5rem] shadow-xl hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  {isCreatingProject ? <Loader2 className="animate-spin"/> : 'Confirmar Lançamento'}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* MODAL EDIÇÃO TAREFA */}
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
