
import React, { useState, useEffect } from 'react';
import { Briefcase, CheckCircle2, Circle, User, Plus, Trash2, Clock, Check } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  assignee: string;
}

interface Project {
  id: string;
  name: string;
  status: 'Ativo' | 'Pausado' | 'Concluído';
  progress: number;
  tasks: Task[];
}

const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Loja Lumora (Dropshipping)',
    status: 'Ativo',
    progress: 65,
    tasks: [
      { id: 't1', text: 'Configurar Checkout Transparente', completed: true, assignee: 'Ana' },
      { id: 't2', text: 'Criar Criativos de Escala (Vídeo)', completed: false, assignee: 'Carlos' },
      { id: 't3', text: 'Mineração de 5 Novos Produtos', completed: true, assignee: 'Ana' },
      { id: 't4', text: 'Setup do Pixel do Facebook', completed: false, assignee: 'Gestor' }
    ]
  },
  {
    id: 'p2',
    name: 'Infoproduto Desafio 21 Dias',
    status: 'Pausado',
    progress: 20,
    tasks: [
      { id: 't5', text: 'Finalizar Landing Page', completed: false, assignee: 'Carlos' },
      { id: 't6', text: 'Configurar Área de Membros', completed: false, assignee: 'Ana' }
    ]
  }
];

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [selectedId, setSelectedId] = useState<string | null>('p1');
  const [newTaskText, setNewTaskText] = useState('');

  const selectedProject = projects.find(p => p.id === selectedId);

  // Recalculate progress automatically when tasks change
  useEffect(() => {
    if (selectedProject) {
        const total = selectedProject.tasks.length;
        const done = selectedProject.tasks.filter(t => t.completed).length;
        const newProgress = total > 0 ? Math.round((done / total) * 100) : 0;
        
        if (newProgress !== selectedProject.progress) {
            updateProject(selectedProject.id, { progress: newProgress });
        }
    }
  }, [selectedProject?.tasks]);

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const toggleTask = (projectId: string, taskId: string) => {
    setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        return {
            ...p,
            tasks: p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
        };
    }));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !newTaskText.trim()) return;
    
    const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        text: newTaskText,
        completed: false,
        assignee: 'Eu'
    };

    setProjects(prev => prev.map(p => {
        if (p.id !== selectedId) return p;
        return { ...p, tasks: [...p.tasks, newTask] };
    }));
    setNewTaskText('');
  };

  const deleteTask = (projectId: string, taskId: string) => {
    setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        return { ...p, tasks: p.tasks.filter(t => t.id !== taskId) };
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      
      {/* Sidebar: Project List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-gray-900">Projetos Ativos</h3>
          <button className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <Plus size={16} />
          </button>
        </div>

        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => setSelectedId(project.id)}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
              selectedId === project.id 
                ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 shadow-sm' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Briefcase size={20} className={selectedId === project.id ? 'text-indigo-600' : 'text-gray-400'} />
              </div>
              <select 
                value={project.status} 
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => updateProject(project.id, { status: e.target.value as any })}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border-none outline-none cursor-pointer ${
                    project.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 
                    project.status === 'Pausado' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <option value="Ativo">Ativo</option>
                <option value="Pausado">Pausado</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
            <h4 className="font-bold text-gray-900 mb-2 truncate">{project.name}</h4>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-500" 
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-gray-500">{project.progress}%</span>
            </div>
          </button>
        ))}
      </div>

      {/* Detail View: Tasks */}
      <div className="lg:col-span-2">
        {selectedProject ? (
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm h-full">
            <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-6">
              <div className="flex-1">
                <input 
                    type="text" 
                    value={selectedProject.name} 
                    onChange={(e) => updateProject(selectedProject.id, { name: e.target.value })}
                    className="text-2xl font-bold text-gray-900 bg-transparent border-none focus:ring-0 w-full p-0"
                />
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={14} />
                    <span>Progresso Automático</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>{selectedProject.tasks.filter(t => t.completed).length} de {selectedProject.tasks.length} concluídas</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <form onSubmit={addTask} className="flex gap-2 mb-6">
                 <input 
                    type="text" 
                    placeholder="Nova tarefa..." 
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                 />
                 <button type="submit" className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
                    <Plus size={20}/>
                 </button>
              </form>

              <div className="space-y-3">
                {selectedProject.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-50 hover:bg-gray-50 group transition-all">
                    <div className="flex items-center gap-4 flex-1">
                        <button onClick={() => toggleTask(selectedProject.id, task.id)}>
                            {task.completed ? (
                            <CheckCircle2 size={24} className="text-indigo-600" />
                            ) : (
                            <Circle size={24} className="text-gray-300 group-hover:text-indigo-400" />
                            )}
                        </button>
                        <input 
                            type="text" 
                            value={task.text}
                            onChange={(e) => {
                                const newTasks = selectedProject.tasks.map(t => t.id === task.id ? {...t, text: e.target.value} : t);
                                updateProject(selectedProject.id, { tasks: newTasks });
                            }}
                            className={`bg-transparent border-none focus:ring-0 p-0 font-medium flex-1 ${task.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                            <User size={12} className="text-gray-400" />
                            <input 
                                type="text"
                                value={task.assignee}
                                onChange={(e) => {
                                    const newTasks = selectedProject.tasks.map(t => t.id === task.id ? {...t, assignee: e.target.value} : t);
                                    updateProject(selectedProject.id, { tasks: newTasks });
                                }}
                                className="bg-transparent border-none focus:ring-0 p-0 text-xs font-bold text-gray-600 w-16"
                            />
                        </div>
                        <button 
                            onClick={() => deleteTask(selectedProject.id, task.id)}
                            className="text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                    </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl p-20">
            <Briefcase size={48} className="mb-4 opacity-10" />
            <p>Selecione um projeto</p>
          </div>
        )}
      </div>
    </div>
  );
};
