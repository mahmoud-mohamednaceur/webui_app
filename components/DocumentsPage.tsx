
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FolderOpen, Book, ArrowRight, Loader2, CheckCircle2, AlertCircle, Clock, Image as ImageIcon, X, Binary, AlertTriangle } from 'lucide-react';
import Button from './ui/Button';

// Constants
const CREATE_NOTEBOOK_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-create-notebook';
const PULL_NOTEBOOKS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-pull-notebooks';
const DELETE_NOTEBOOK_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-clear-notebook';
const DELETE_ALL_NOTEBOOKS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-delete-all-notebooks';

// Simulating a consistent user/orchestrator ID for this session
const ORCHESTRATOR_ID = '301f7482-1430-466d-9721-396564618751';

// Types
type Status = 'success' | 'processing' | 'pending' | 'error';

interface Notebook {
  id: string;
  title: string;
  description?: string;
  docCount: number;
  status: Status;
  lastUpdated: string;
  image?: string; 
}

const StatusBadge = ({ status }: { status: Status }) => {
  const styles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const labels = {
    success: 'Active',
    processing: 'Syncing',
    pending: 'Queued',
    error: 'Error',
  };

  const Icons = {
    success: CheckCircle2,
    processing: Loader2,
    pending: Clock,
    error: AlertCircle,
  };

  const Icon = Icons[status];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider border backdrop-blur-md shadow-sm ${styles[status]}`}>
      <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {labels[status]}
    </div>
  );
};

// --- Modals ---

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    notebookTitle: string;
    isDeleting: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, onClose, onConfirm, notebookTitle, isDeleting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up" onClick={onClose}>
            <div className="bg-[#0A0A0F] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-red-500/5">
                     <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                        <Trash2 className="w-5 h-5" />
                     </div>
                     <h2 className="text-lg font-bold text-white">Delete Notebook?</h2>
                </div>
                <div className="p-6">
                    <p className="text-text-subtle text-sm leading-relaxed">
                        Are you sure you want to delete <span className="text-white font-bold">{notebookTitle}</span>? 
                        This action will permanently remove all documents and history associated with this context.
                    </p>
                </div>
                <div className="p-6 border-t border-white/5 bg-surface/50 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isDeleting} className="!h-9 text-xs border-white/10 hover:bg-white/5 text-text-subtle hover:text-white">Cancel</Button>
                    <Button 
                        variant="primary" 
                        onClick={onConfirm} 
                        disabled={isDeleting}
                        className="!h-9 text-xs bg-red-500 border-red-500 hover:bg-red-600 hover:border-red-600 text-white shadow-none"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Deleting...
                            </>
                        ) : (
                            "Delete Permanently"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

interface CreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: { title: string; description: string; embeddingModel: string }) => Promise<void>;
    isLoading: boolean;
}

const OpenAILogo = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.0462 6.0462 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 3.5366-2.1956a1.0276 1.0276 0 0 0 .512-.9408v-4.47l4.198 2.3766v2.8026a4.4966 4.4966 0 0 1-5.512 3.5484zm-5.916-5.061a4.4918 4.4918 0 0 1 0-5.4707v4.2154l3.638 2.0935v.0152l-2.5046 1.5227a1.0381 1.0381 0 0 0-.5235.8975v.0123a4.4842 4.4842 0 0 1-.6099-3.286zM4.567 6.7019a4.4966 4.4966 0 0 1 5.426-3.6582v2.8035L5.8012 8.22a1.0352 1.0352 0 0 0-.533.8984v4.186l-2.5532-1.5484a4.4966 4.4966 0 0 1 1.852-5.0541zm12.9367-1.5385v-2.8035a4.4966 4.4966 0 0 1 2.165 7.7821l-2.577 1.4816v-4.2068l3.7238-2.2451zM13.32 5.0804a4.4966 4.4966 0 0 1 2.787 1.105l-3.586 2.1936a1.0362 1.0362 0 0 0-.5044.9504v4.4423l-4.2503-2.3671V8.5702a4.5252 4.5252 0 0 1 5.5537-3.4898z" />
    </svg>
);

const OllamaLogo = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
       <path d="M21.56,11.6C21.34,7.82,17.83,5.71,14.78,5.32V4.07C14.78,2.5,13.61,1.21,12.12,1.21S9.46,2.5,9.46,4.07v1.25C6.4,5.71,2.9,7.82,2.68,11.6c-0.12,2.04,0.64,4.31,2.2,5.82C4.25,18.12,4,19,4,20c0,1.66,1.34,3,3,3s3-1.34,3-3c0-0.32-0.06-0.63-0.15-0.92c0.71,0.12,1.44,0.17,2.15,0.17s1.44-0.05,2.15-0.17C14.06,19.37,14,19.68,14,20c0,1.66,1.34,3,3,3s3-1.34,3-3c0-1-0.25-1.88-0.88-2.58C20.92,15.91,21.68,13.64,21.56,11.6z M16,12.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S16.83,12.5,16,12.5z M8.24,12.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S9.07,12.5,8.24,12.5z M12.12,16c-0.63,0-1.21-0.19-1.68-0.52c0.47-0.26,0.96-0.41,1.68-0.41s1.21,0.16,1.68,0.41C13.33,15.81,12.75,16,12.12,16z"/>
    </svg>
);

const CreateModal: React.FC<CreateModalProps> = ({ isOpen, onClose, onCreate, isLoading }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [embeddingModel, setEmbeddingModel] = useState('');

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setDescription('');
            setEmbeddingModel('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (title && embeddingModel) {
            await onCreate({ title, description, embeddingModel });
            // Note: We don't close here, the parent handles closing on success.
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-[#0A0A0F] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative">
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface/50">
                    <div>
                        <h2 className="text-xl font-bold text-white">Create New Notebook</h2>
                        <p className="text-sm text-text-subtle">Configure your knowledge context.</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="p-2 rounded-lg hover:bg-white/5 text-text-subtle hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* General Info */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-subtle uppercase tracking-wider">Notebook Name <span className="text-primary">*</span></label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Q4 Product Strategy"
                                    disabled={isLoading}
                                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none transition-colors text-sm font-medium placeholder-text-subtle/30 disabled:opacity-50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-subtle uppercase tracking-wider">Description</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Briefly describe the documents and purpose of this notebook..."
                                    disabled={isLoading}
                                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none transition-colors h-24 resize-none text-sm leading-relaxed placeholder-text-subtle/30 disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Embedding Model Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Binary className="w-4 h-4 text-indigo-400" />
                                <label className="text-xs font-bold text-white uppercase tracking-wider">Embedding Model <span className="text-primary">*</span></label>
                            </div>
                            
                            <p className="text-xs text-text-subtle bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg">
                                <span className="font-bold text-indigo-300">Important:</span> This selection is permanent. It determines how your documents are vectorized.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div 
                                    onClick={() => !isLoading && setEmbeddingModel('nomic-embed-text:latest')}
                                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 
                                        ${embeddingModel === 'nomic-embed-text:latest' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-surface border-white/5 hover:border-white/20'}
                                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                        <OllamaLogo className="w-6 h-6 text-orange-500" />
                                    </div>
                                    <div>
                                        <div className={`text-sm font-bold mb-1 ${embeddingModel === 'nomic-embed-text:latest' ? 'text-white' : 'text-text-subtle'}`}>Nomic Embed</div>
                                        <div className="text-[10px] text-text-subtle opacity-70 font-mono">nomic-embed-text:latest</div>
                                    </div>
                                </div>

                                <div 
                                    onClick={() => !isLoading && setEmbeddingModel('text-embedding-3-small')}
                                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 
                                        ${embeddingModel === 'text-embedding-3-small' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-surface border-white/5 hover:border-white/20'}
                                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                                        <OpenAILogo className="w-6 h-6 text-green-500" />
                                    </div>
                                    <div>
                                        <div className={`text-sm font-bold mb-1 ${embeddingModel === 'text-embedding-3-small' ? 'text-white' : 'text-text-subtle'}`}>OpenAI Small</div>
                                        <div className="text-[10px] text-text-subtle opacity-70 font-mono">text-embedding-3-small</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-surface/50 flex justify-end gap-3">
                    <Button 
                        variant="outline" 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="!h-10 border-white/10 hover:bg-white/5 text-text-subtle hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSubmit}
                        disabled={!title || !embeddingModel || isLoading}
                        className={`!h-10 shadow-none transition-opacity ${(!title || !embeddingModel) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-neon-primary'}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Notebook"
                        )}
                    </Button>
                </div>

            </div>
        </div>
    );
};

// --- Main Page Component ---

interface DocumentsPageProps {
  onOpenNotebook?: (id: string, name: string, description: string) => void;
  onRegisterEmbedding?: (id: string, modelId: string) => void;
}

const DocumentsPage: React.FC<DocumentsPageProps> = ({ onOpenNotebook, onRegisterEmbedding }) => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Action States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Clear All States
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  
  // Single Delete States
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  // Fetch Notebooks on Mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchNotebooks = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(PULL_NOTEBOOKS_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orchestrator_id: ORCHESTRATOR_ID })
            });

            if (response.ok) {
                const text = await response.text();
                let data = [];
                try {
                    const parsed = JSON.parse(text);
                    // Handle n8n array wrapping or direct array
                    data = Array.isArray(parsed) ? parsed : (parsed.data || [parsed]);
                    // If n8n returns [{json: {...}}] structure
                    if (data.length > 0 && data[0].json) {
                        data = data.map((item: any) => item.json);
                    }
                } catch (e) {
                    console.warn("Invalid JSON response from notebook fetch");
                }

                if (!isMounted) return;

                const mappedNotebooks: Notebook[] = data.map((item: any) => {
                    // Safe ID access to prevent crash
                    const nId = item.notebook_id ? String(item.notebook_id) : `unknown-${Math.random().toString(36).substr(2, 9)}`;
                    const nTitle = item.notebook_title || 'Untitled Notebook';

                    // Use safe ID for split
                    const idHash = nId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                    const hue = (idHash * 137) % 360;
                    
                    return {
                        id: nId,
                        title: nTitle,
                        description: item.notebook_description,
                        docCount: item.number_of_documents || 0,
                        status: 'success' as Status, // Defaulting to success as retrieved from DB
                        lastUpdated: item.updated_at ? new Date(item.updated_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : 'Unknown',
                        image: `linear-gradient(${hue}deg, #0f0c29 0%, #302b63 100%)` 
                    };
                }).filter((n: Notebook) => n.id && !n.id.startsWith('unknown-')); // Filter out invalid items if necessary
                
                // Sort by last updated desc
                mappedNotebooks.sort((a, b) => {
                     const dateA = new Date(a.lastUpdated).getTime();
                     const dateB = new Date(b.lastUpdated).getTime();
                     if (isNaN(dateA) || isNaN(dateB)) return 0;
                     return dateB - dateA;
                });

                setNotebooks(mappedNotebooks);
            } else {
                console.error("Failed to fetch notebooks:", response.status);
            }
        } catch (error) {
            console.error("Error fetching notebooks:", error);
        } finally {
            if (isMounted) setIsLoading(false);
        }
    };

    fetchNotebooks();
    
    return () => { isMounted = false; };
  }, []);

  const handleRequestDelete = (notebook: Notebook, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setNotebookToDelete(notebook);
  };

  const handleExecuteDelete = async () => {
    if (!notebookToDelete) return;
    
    setIsDeletingSingle(true);
    const id = notebookToDelete.id;
    
    try {
        const payload = { 
            notebook_id: id,
            orchestrator_id: ORCHESTRATOR_ID // Include for consistency
        };

        const response = await fetch(DELETE_NOTEBOOK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        // Strict response check
        if (!response.ok) {
            throw new Error("Failed to delete");
        }

        // Only update state after success
        setNotebooks(prev => prev.filter(n => n.id !== id));
        setNotebookToDelete(null); 

    } catch (error) {
        console.error("Error deleting notebook:", error);
        alert("Failed to delete notebook. Please check your connection.");
    } finally {
        setIsDeletingSingle(false);
    }
  };

  const handleClearClick = () => {
     if (confirmClear) {
         handleExecuteClear();
     } else {
         setConfirmClear(true);
         // Reset confirmation if not clicked within 3 seconds
         setTimeout(() => setConfirmClear(false), 3000);
     }
  };

  const handleExecuteClear = async () => {
    console.log("🚀 Executing Clear All...");
    setIsClearing(true);
    setConfirmClear(false);
    
    try {
        // Construct payload strictly matching request requirements
        const payload = { orchestrator_id: ORCHESTRATOR_ID };
        console.log("📤 Sending Payload:", payload);

        const response = await fetch(DELETE_ALL_NOTEBOOKS_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Strict response check
        if (!response.ok) {
             const errorText = await response.text();
             throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }
        
        // Only update state after success
        setNotebooks([]);
        console.log("✅ Successfully cleared all notebooks");
    } catch (error: any) {
        console.error("❌ Failed to delete all notebooks:", error);
        alert(`Failed to delete notebooks: ${error.message}. Please ensure the backend is reachable.`);
    } finally {
        setIsClearing(false);
    }
  };

  const handleCreate = async (data: { title: string; description: string; embeddingModel: string }) => {
    setIsCreating(true);
    // Generate IDs
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    try {
        const payload = {
            notebook_id: newId,
            orchestrator_id: ORCHESTRATOR_ID,
            notebook_title: data.title,
            notebook_description: data.description || '',
            number_of_documents: 0,
            created_at: now,
            updated_at: now
        };

        console.log("🚀 Syncing New Notebook to Database:", payload);

        // Await confirmation
        const response = await fetch(CREATE_NOTEBOOK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Strict check before UI update
        if (!response.ok) {
            throw new Error(`Server status: ${response.status}`);
        }
        
        // Success: Update UI
        const newNotebook: Notebook = {
          id: newId,
          title: data.title,
          description: data.description,
          docCount: 0,
          status: 'success',
          lastUpdated: 'Just now',
          image: `linear-gradient(${Math.random() * 360}deg, #0f0c29 0%, #302b63 100%)`
        };
        
        setNotebooks([newNotebook, ...notebooks]);
        
        // Register Embedding (App State)
        if (onRegisterEmbedding) {
            onRegisterEmbedding(newId, data.embeddingModel);
        }

        setIsCreateModalOpen(false);

    } catch (error) {
        console.error("❌ Failed to create notebook:", error);
        alert("Failed to create notebook. Please ensure the backend is online.");
    } finally {
        setIsCreating(false);
    }
  };

  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-full min-h-[500px]">
              <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-text-subtle text-sm animate-pulse">Loading notebooks...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto min-h-full flex flex-col animate-fade-in-up">
      
      <CreateModal 
        isOpen={isCreateModalOpen} 
        onClose={() => !isCreating && setIsCreateModalOpen(false)} 
        onCreate={handleCreate}
        isLoading={isCreating}
      />

      <DeleteConfirmModal 
        isOpen={!!notebookToDelete}
        onClose={() => !isDeletingSingle && setNotebookToDelete(null)}
        onConfirm={handleExecuteDelete}
        notebookTitle={notebookToDelete?.title || 'Unknown Notebook'}
        isDeleting={isDeletingSingle}
      />

      {/* Header Section */}
      <div className="relative z-20 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-4xl font-display font-bold text-white tracking-tight mb-2">Notebooks</h1>
          <p className="text-text-subtle text-lg">Manage your knowledge base contexts.</p>
        </div>
        
        <div className="flex gap-4">
            <Button 
                variant="outline" 
                onClick={handleClearClick}
                disabled={isClearing || (notebooks.length === 0 && !isClearing)}
                className={`!h-10 !px-4 !text-xs border-white/10 uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
                    ${confirmClear 
                        ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 hover:border-red-600 animate-pulse' 
                        : 'hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5 text-text-subtle'
                    }`}
            >
              {isClearing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Clearing...
                  </>
              ) : confirmClear ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 mr-2" />
                    Confirm Delete?
                  </>
              ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Clear All
                  </>
              )}
            </Button>
            <Button 
                variant="primary" 
                onClick={() => setIsCreateModalOpen(true)}
                className="!h-10 !px-5 shadow-neon-primary uppercase tracking-wider !text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              New Notebook
            </Button>
        </div>
      </div>

      {/* Grid */}
      {notebooks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-3xl bg-surface/20 text-center">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 animate-pulse-slow">
                    <FolderOpen className="w-10 h-10 text-text-subtle opacity-50" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">No notebooks found</h3>
                <p className="text-text-subtle mb-8 max-w-md">Get started by creating a new notebook to organize your documents.</p>
                <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>Create Notebook</Button>
            </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {notebooks.map((notebook) => (
                <div 
                key={notebook.id} 
                onClick={() => onOpenNotebook && onOpenNotebook(notebook.id, notebook.title, notebook.description || '')}
                className="group relative bg-surface border border-white/5 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)] cursor-pointer flex flex-col h-[280px]"
                >
                    {/* Hover Glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0"></div>

                    {/* Cover Image / Header Area */}
                    <div 
                        className="h-36 w-full relative bg-[#0A0A0F] overflow-hidden"
                    >
                        {notebook.image ? (
                             <div className="absolute inset-0" style={{ background: notebook.image }}></div>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-surface-highlight">
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-50"></div>
                                <ImageIcon className="w-8 h-8 text-white/10" />
                            </div>
                        )}
                        
                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent opacity-90"></div>
                        
                        {/* Status Badge (Top Right) */}
                        <div className="absolute top-4 right-4 z-10">
                             <StatusBadge status={notebook.status} />
                        </div>

                        {/* Icon (Overlapping) */}
                        <div className="absolute -bottom-6 left-6 z-10">
                            <div className="w-12 h-12 rounded-2xl bg-surface border border-white/10 flex items-center justify-center text-primary shadow-xl group-hover:scale-110 group-hover:border-primary/40 group-hover:shadow-neon-primary transition-all duration-300">
                                <Book className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 pt-8 flex-1 flex flex-col relative z-10">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-white mb-1 truncate group-hover:text-primary transition-colors font-display">{notebook.title}</h3>
                            <p className="text-[10px] text-text-subtle font-mono opacity-60 uppercase tracking-widest mb-1 truncate" title={notebook.id}>ID: {notebook.id}</p>
                            {notebook.description && <p className="text-xs text-text-subtle line-clamp-1">{notebook.description}</p>}
                        </div>

                        {/* Metrics Footer */}
                        <div className="mt-auto flex justify-between items-end pt-4 border-t border-white/5 group-hover:border-white/10 transition-colors">
                            <div className="flex flex-col">
                                <span className="block text-[10px] text-text-subtle uppercase tracking-wider font-bold mb-1">Documents</span>
                                <span className="text-lg font-bold text-white font-mono">{notebook.docCount}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={(e) => handleRequestDelete(notebook, e)}
                                    title="Delete Notebook"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-text-subtle hover:text-white hover:bg-red-500/80 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="w-8 h-8 rounded-lg bg-surface border border-white/5 flex items-center justify-center text-text-subtle group-hover:text-white group-hover:border-white/20 transition-all">
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
