
import React, { useState, useEffect } from 'react';
import { Briefcase, CheckCircle2, Circle, User, Plus, Trash2, LayoutGrid, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface Task {
  id: string;
  project_id: string;
  text: string;
  completed: boolean;
  assignee: string;
}

interface Project {
  id: string;
  name: string;
  status: 'Ativo' | 'Pausado' | 'Concluído';
  progress: number;
}

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    const [projRes, taskRes] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at', { ascending: true })
    ]);
    
    if (projRes.data) setProjects(projRes.data);
    if (taskRes.data) setTasks(taskRes.data);
    if (projRes.data && projRes.data.length > 0 && !selectedId) setSelectedId(projRes.data[0].id);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const selectedProject = projects.find(p => p.id === selectedId);
  const projectTasks = tasks.filter(t => t.project_id === selectedId);

  const createNewProject = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('projects').insert([{ name: 'Novo Projeto Operacional' }]).select();
    if (data) {
      setProjects([data[0], ...projects]);
      setSelectedId(data[0].id);
    }
  };

  const deleteProject = async (id: string) => {
    if (!supabase) return;
    if (confirm('Excluir este projeto e todas as tarefas vinculadas?')) {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (!error) {
        setProjects(projects.filter(p => p.id !== id));
        if (selectedId === id) setSelectedId(null);
      }
    }
  };

  const updateProjectName = async (id: string, name: string) => {
    if (!supabase) return;
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    await supabase.from('projects').update({ name }).eq('id', id);
  };

  const updateProjectStatus = async (id: string, status: any) => {
    if (!supabase) return;
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    await supabase.from('projects').update({ status }).eq('id', id);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedId || !newTaskText.trim()) return;
    
    const { data, error } = await supabase.from('tasks').insert([{
      project_id: selectedId,
      text: newTaskText,
      completed: false,
      assignee: 'Responsável'
    }]).select();

    if (data) {
      setTasks([...tasks, data[0]]);
      setNewTaskText('');
      updateProgress(selectedId);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    if (!supabase) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !completed } : t));
    await supabase.from('tasks').update({ completed: !completed }).eq('id', taskId);
    if (selectedId) updateProgress(selectedId);
  };

  const deleteTask = async (taskId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) {
      setTasks(tasks.filter(t => t.id !== taskId));
      if (selectedId) updateProgress(selectedId);
    }
  };

  const updateProgress = async (projectId: string) => {
    if (!supabase) return;
    const currentTasks = tasks.filter(t => t.project_id === projectId);
    const completed = currentTasks.filter(t => t.completed).length;
    const progress = currentTasks.length > 0 ? Math.round((completed / currentTasks.length) * 100) : 0;
    
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, progress } : p));
    await supabase.from('projects').update({ progress }).eq('id', projectId);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in pb-20">
      <div className="lg:col-span-1 space-y-4">
        <button onClick={createNewProject} className="w-full flex items-center justify-center gap-2 p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-lg font-bold">
          <Plus size={20} /> Criar Novo Projeto
        </button>
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Lista de Operações</h3>
          {projects.map((project) => (
            <button key={project.id} onClick={() => setSelectedId(project.id)} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedId === project.id ? 'bg-white border-indigo-600 ring-2 ring-indigo-50 shadow-md' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-xl ${selectedId === project.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}><LayoutGrid size={18} /></div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${project.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{project.status}</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2 truncate text-sm">{project.name}</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${project.progress}%` }} /></div>
                <span className="text-[10px] font-bold text-gray-400">{project.progress}%</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2">
        {selectedProject ? (
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm h-full flex flex-col min-h-[500px]">
            <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-6">
              <div className="flex-1">
                <input type="text" value={selectedProject.name} onChange={(e) => updateProjectName(selectedProject.id, e.target.value)} className="text-2xl font-bold text-gray-900 bg-transparent border-none focus:ring-0 w-full p-0" />
                <div className="flex items-center gap-6 mt-3">
                  <select value={selectedProject.status} onChange={(e) => updateProjectStatus(selectedProject.id, e.target.value)} className="text-xs font-bold bg-gray-50 border-none rounded-lg px-2 py-1">
                    <option value="Ativo">Ativo</option><option value="Pausado">Pausado</option><option value="Concluído">Concluído</option>
                  </select>
                  <button onClick={() => deleteProject(selectedProject.id)} className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-700 font-bold ml-auto"><Trash2 size={14} /> Excluir Projeto</button>
                </div>
              </div>
            </div>
            <div className="space-y-6 flex-1">
              <form onSubmit={addTask} className="flex gap-2">
                <input type="text" placeholder="Adicionar tarefa operacional..." value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                <button type="submit" className="px-6 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-bold">Add</button>
              </form>
              <div className="space-y-2 overflow-y-auto max-h-[500px]">
                {projectTasks.map((task) => (
                  <div key={task.id} className={`flex items-center justify-between p-4 rounded-2xl border ${task.completed ? 'bg-gray-50 opacity-60' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-4 flex-1">
                      <button onClick={() => toggleTask(task.id, task.completed)}>{task.completed ? <CheckCircle2 className="text-emerald-500" /> : <Circle className="text-gray-300" />}</button>
                      <span className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.text}</span>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-rose-500 p-1"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl p-20 bg-gray-50/50">
            <Briefcase size={48} className="mb-4 opacity-10" /><p className="font-bold">Selecione um projeto para gerenciar tarefas</p>
          </div>
        )}
      </div>
    </div>
  );
};
