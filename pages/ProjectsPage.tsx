
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, CheckCircle2, Circle, Plus, Trash2, 
  Loader2, MessageSquare, X, ShieldCheck, TrendingUp,
  FolderPlus, AlertCircle
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

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ currentUser }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [dbError, setDbError] = useState<string | null>(null);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const fetchData = async () => {
    if (!supabase) {
      setDbError("Supabase não configurado corretamente.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setDbError(null);
    try {
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (projError || taskError) throw new Error(projError?.message || taskError?.message);

      setProjects(projData || []);
      setTasks(taskData || []);
      
      if (projData && projData.length > 0 && !selectedId) {
        setSelectedId(projData[0].id);
      }
    } catch (e: any) {
      console.error("Erro fetch:", e);
      setDbError(`Erro de Sincronização: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || isCreatingProject || !supabase) return;
    setIsCreatingProject(true);

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ name: newProjectName.trim(), status: 'Ativo', progress: 0 }])
        .select();

      if (error) throw error;
      if (data) {
        setProjects([data[0], ...projects]);
        setSelectedId(data[0].id);
        setIsProjectModalOpen(false);
        setNewProjectName('');
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Excluir operação?') || !supabase) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      setProjects(projects.filter(p => p.id !== projectId));
      if (selectedId === projectId) setSelectedId(null);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !newTaskText.trim() || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ 
          project_id: selectedId, 
          text: newTaskText, 
          completed: false, 
          instruction_author: currentUser 
        }])
        .select();
      if (error) throw error;
      if (data) {
        setTasks([...tasks, data[0]]);
        setNewTaskText('');
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const toggleTask = async (task: Task) => {
    if (!supabase) return;
    const newStatus = !task.completed;
    const completedAt = newStatus ? new Date().toISOString() : null;
    
    // UI Otimista
    setTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, completed: newStatus, completed_at: completedAt || undefined } : t
    ));
    
    try {
      const updateData: any = { completed: newStatus };
      // Só tenta enviar completed_at se for True para evitar erros de cache se a coluna for nula
      if (newStatus) updateData.completed_at = completedAt;
      else updateData.completed_at = null;

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', task.id);

      if (error) {
        // Se o erro for especificamente sobre a coluna faltante, tenta salvar apenas o 'completed'
        if (error.message.includes('completed_at')) {
            const { error: retryError } = await supabase
                .from('tasks')
                .update({ completed: newStatus })
                .eq('id', task.id);
            if (retryError) throw retryError;
        } else {
            throw error;
        }
      }
    } catch (err: any) {
      console.error(err);
      fetchData(); // Recarrega estado real do banco
      alert(`Aviso: O status foi alterado, mas houve um problema no banco de dados. Certifique-se de rodar o SQL de atualização no painel do Supabase.\n\nErro: ${err.message}`);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Excluir tarefa?') || !supabase) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const saveTaskDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !supabase) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          text: editingTask.text,
          assignee_id: editingTask.assignee_id,
          instructions: editingTask.instructions,
          assignee_notes: editingTask.assignee_notes,
          instruction_author: editingTask.instruction_author || currentUser,
          notes_author: currentUser
        })
        .eq('id', editingTask.id);
      if (error) throw error;
      setTasks(tasks.map(t => t.id === editingTask.id ? { ...editingTask, notes_author: currentUser } : t));
      setIsTaskModalOpen(false);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

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
      return { label: `${d}/${m}`, completed: completedCount };
    });
  }, [tasks]);

  const projectsWithProgress = useMemo(() => {
    return projects.map(p => {
      const pTasks = tasks.filter(t => t.project_id === p.id);
      const completedCount = pTasks.filter(t => t.completed).length;
      const progress = pTasks.length > 0 ? Math.round((completedCount / pTasks.length) * 100) : 0;
      return { ...p, progress };
    });
  }, [projects, tasks]);

  const selectedProject = projectsWithProgress.find(p => p.id === selectedId);
  const projectTasks = tasks.filter(t => t.project_id === selectedId);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Sincronizando Fluxo...</p>
    </div>
  );

  if (dbError) return (
    <div className="bg-rose-50 border border-rose-100 p-10 rounded-[3rem] text-center space-y-4">
      <AlertCircle className="mx-auto text-rose-500" size={48}/>
      <h3 className="text-xl font-black text-rose-900 uppercase">Erro de Banco</h3>
      <p className="text-rose-700 font-medium">{dbError}</p>
      <button onClick={fetchData} className="px-8 py-3 bg-rose-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Reconectar</button>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm flex flex-col justify-center">
           <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4"><TrendingUp size={24}/></div>
           <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">Performance Semanal</h3>
           <p className="text-gray-400 text-xs font-bold uppercase mt-2 tracking-widest">Tarefas entregues</p>
           <div className="mt-6">
              <span className="text-4xl font-black text-indigo-600">{tasks.filter(t => t.completed).length}</span>
              <span className="text-gray-300 font-black text-lg ml-2 uppercase">Concluídas</span>
           </div>
        </div>
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm h-[220px]">
           <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productivityData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} dy={10} />
                 <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}} />
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
        <div className="lg:col-span-4 space-y-4">
          <div className="px-4 py-2">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Operações</h3>
               <button onClick={() => setIsProjectModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg"><Plus size={14}/> Nova</button>
            </div>
            {projectsWithProgress.map((project) => (
              <div key={project.id} className="relative group mb-4">
                <button onClick={() => setSelectedId(project.id)} className={`w-full text-left p-6 rounded-[2.5rem] border-2 transition-all relative overflow-hidden ${selectedId === project.id ? 'bg-white border-indigo-600 shadow-xl' : 'bg-white border-transparent shadow-sm hover:border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-3">
                     <h4 className="font-black text-gray-900 truncate uppercase tracking-tight flex-1 pr-6">{project.name}</h4>
                     <span className="text-[11px] font-black text-indigo-600 ml-2">{project.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                     <div className="h-full bg-indigo-600 transition-all duration-700 ease-out" style={{ width: `${project.progress}%` }} />
                  </div>
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }} className="absolute top-6 right-6 p-2 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8">
          {selectedProject ? (
            <div className="bg-white border border-gray-200 rounded-[3rem] p-10 shadow-2xl flex flex-col min-h-[600px]">
              <div className="flex justify-between items-center border-b border-gray-100 pb-8 mb-8">
                <div>
                   <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">{selectedProject.name}</h2>
                   <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Gestão de Fluxo - Cloud Sync</p>
                </div>
                <div className="text-right">
                   <span className="text-2xl font-black text-indigo-600">{selectedProject.progress}%</span>
                   <p className="text-[9px] font-black text-gray-300 uppercase">Concluído</p>
                </div>
              </div>

              <div className="space-y-8">
                <form onSubmit={addTask} className="flex gap-4">
                  <input type="text" placeholder="Qual a próxima ação da operação?" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none shadow-inner" />
                  <button type="submit" className="px-8 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-all">Add</button>
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
                        <button onClick={() => deleteTask(task.id)} className="p-4 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                      </div>
                    </div>
                  ))}
                  {projectTasks.length === 0 && <div className="py-20 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest border-4 border-dashed border-gray-50 rounded-[3rem]">Sem tarefas ativas no banco</div>}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50/50 rounded-[3rem] p-20 text-center border-4 border-dashed border-gray-200">
               <Briefcase size={48} className="mx-auto text-gray-200 mb-6"/>
               <h3 className="text-xl font-black text-gray-300 uppercase tracking-widest">Aguardando Seleção</h3>
            </div>
          )}
        </div>
      </div>

      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl animate-scale-in">
             <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2"><FolderPlus size={20} className="text-indigo-600"/> Iniciar Operação</h3>
                <button onClick={() => setIsProjectModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"><X size={24}/></button>
             </div>
             <form onSubmit={addProject} className="p-10 space-y-8">
                <div>
                   <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Nome da Operação</label>
                   <input required autoFocus type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 shadow-inner" placeholder="Ex: Escala Global" />
                </div>
                <button type="submit" disabled={isCreatingProject} className="w-full bg-indigo-600 text-white font-black uppercase text-xs tracking-widest py-5 rounded-[1.5rem] shadow-xl hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                  {isCreatingProject ? <Loader2 className="animate-spin"/> : 'Confirmar Lançamento'}
                </button>
             </form>
          </div>
        </div>
      )}

      {isTaskModalOpen && editingTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl animate-scale-in">
             <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-gray-900 uppercase tracking-tight">Registro Detalhado</h3>
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
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Usuário</label>
                    <div className="px-6 py-4 bg-indigo-600 rounded-2xl text-white text-sm font-black flex items-center gap-3 shadow-lg shadow-indigo-100"><ShieldCheck size={20}/> {currentUser}</div>
                  </div>
                </div>
                <div>
                   <label className="block text-[11px] font-black uppercase text-indigo-600 tracking-widest mb-4">Instruções</label>
                   <textarea rows={4} value={editingTask.instructions || ''} onChange={e => setEditingTask({...editingTask, instructions: e.target.value})} className="w-full bg-gray-50 border-none rounded-3xl px-6 py-5 text-sm font-medium shadow-inner focus:ring-2 focus:ring-indigo-600" />
                </div>
                <div>
                   <label className="block text-[11px] font-black uppercase text-emerald-600 tracking-widest mb-4">Notas / Feedback</label>
                   <textarea rows={3} value={editingTask.assignee_notes || ''} onChange={e => setEditingTask({...editingTask, assignee_notes: e.target.value})} className="w-full bg-emerald-50/30 border-none rounded-3xl px-6 py-5 text-sm font-medium shadow-inner focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="flex gap-6">
                   <button type="button" onClick={() => setIsTaskModalOpen(false)} className="flex-1 font-black text-xs uppercase text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
                   <button type="submit" className="flex-[2] bg-indigo-600 text-white font-black uppercase text-xs tracking-widest py-5 rounded-[1.5rem] shadow-xl hover:bg-indigo-700 hover:-translate-y-0.5 transition-all">Salvar Alterações</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};
