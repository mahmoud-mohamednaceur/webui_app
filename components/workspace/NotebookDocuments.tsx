
import React, { useState, useRef, useEffect } from 'react';
import { FileText, CheckCircle2, Loader2, Clock, AlertCircle, MoreVertical, Search, Plus, UploadCloud, HardDrive, Type, ArrowLeft, Share2, Folder, RefreshCw, Copy, Check, File as FileIcon, LayoutGrid, List as ListIcon, Globe, Shield, Settings, Cpu, Database, ScanLine, FileCode, Layers, ArrowRight, Code, AlertTriangle, Terminal, Sparkles, BrainCircuit, Zap, FolderOpen } from 'lucide-react';
import Button from '../ui/Button';
import type { NotebookConfig } from '../../App';

// --- CONSTANTS ---
// Webhook for listing folders in SharePoint
const SHAREPOINT_DISCOVERY_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/f7753880-c229-4e49-8539-74558801ef78-share-point';
// Webhook for processing the actual ingestion
const INGESTION_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/b65632eb-86bc-4cf6-8586-5980beaa3282-share-point-files-ingestion';
// Webhook for retrieving notebook status and files
const NOTEBOOK_STATUS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/a34aa1cf-d399-4120-a2b6-4e47ca21805b-notebook-status';

// Types
type Status = 'success' | 'processing' | 'pending' | 'error';

interface Document {
    id: string;
    name: string;
    type: string;
    status: 'completed' | 'processing' | 'pending' | 'error';
    size: string;
    added: string;
}

const StatusBadge = ({ status }: { status: Document['status'] }) => {
    const config = {
        completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
        processing: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
        pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
        error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
    };
    const { icon: Icon, color, bg, border } = config[status];

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${color} ${bg} border ${border} shadow-sm`}>
            <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
            {status}
        </span>
    );
};

// --- Ingestion Configuration Types ---

type ParserType = 'llamaindex' | 'mistral_ocr' | 'n8n_basic' | 'docling' | 'gemini_ocr';
type ChunkerType = 'code_node' | 'agentic' | 'docling';
type DestinationType = 'qdrant' | 'postgres' | 'pinecone';

interface IngestionConfig {
    parser: ParserType;
    chunker: ChunkerType;
    contextAugmentation: boolean; // New Flag
    destination: DestinationType;
    
    // Recursive Text Splitter (Code Node) Params
    chunkSize: number;
    chunkOverlap: number;
    separators: string[];

    // Agentic Chunking Params
    agenticModel: string;
    splitInstructions: string;
    minChunkSize: number;
    maxChunkSize: number;
}

const DEFAULT_CONFIG: IngestionConfig = {
    parser: 'n8n_basic',
    chunker: 'code_node',
    contextAugmentation: false,
    
    // Recursive Defaults
    chunkSize: 600,
    chunkOverlap: 60,
    separators: ['\n\n', '\n', '. ', ' ', ''],

    // Agentic Defaults
    agenticModel: 'gpt-4o-mini',
    splitInstructions: `<role>You are a document segmentation expert. Your task is to identify the optimal transition point where one topic ends and another begins.</role>

<objective>Find a natural breakpoint that keeps semantically related content together. Split only where topics genuinely transition—not arbitrarily.</objective>

<constraint>The split MUST occur BEFORE character position \${maxChunkSize}.</constraint>

<indicators>Evaluate these signals (from strongest to weakest):
1. Section headings or explicit topic markers
2. Paragraph boundaries with clear shifts in subject
3. Completed arguments before new ideas begin
4. Thematic transitions between distinct concepts
</indicators>

<rules>
- Preserve semantic coherence—never split mid-thought
- Choose the LAST strong transition point within the limit
- Prioritize meaning over proximity to the character limit
</rules>

<output_format>
Return ONLY the final word appearing immediately before your chosen split.
No explanations, no punctuation—just the single word.

Example:
If the text ends with: "The company was founded in 2022."
Output: 2022
</output_format>`,
    minChunkSize: 300,
    maxChunkSize: 800,

    destination: 'postgres'
};

// --- Ingestion Settings Component ---

interface IngestionSettingsProps {
    onBack: () => void;
    onStart: (config: IngestionConfig) => void;
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

const IngestionSettings: React.FC<IngestionSettingsProps> = ({ onBack, onStart, isLoading }) => {
    const [config, setConfig] = useState<IngestionConfig>(DEFAULT_CONFIG);

    const updateConfig = (key: keyof IngestionConfig, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const ConfigSection = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
        <div className="mb-8 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-2">
                <div className="p-2 rounded-lg bg-surface border border-white/10 text-primary">
                    <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children}
            </div>
        </div>
    );

    const SelectionCard = ({ 
        selected, 
        onClick, 
        title, 
        description, 
        icon: Icon,
        disabled = false,
        disabledReason
    }: { 
        selected: boolean, 
        onClick: () => void, 
        title: string, 
        description: string, 
        icon: any,
        disabled?: boolean,
        disabledReason?: string
    }) => (
        <div 
            onClick={!disabled ? onClick : undefined}
            className={`p-4 rounded-xl border-2 transition-all duration-200 relative group overflow-hidden flex flex-col h-full
                ${disabled 
                    ? 'opacity-60 cursor-not-allowed bg-surface/20 border-white/5 grayscale' 
                    : selected 
                        ? 'cursor-pointer bg-primary/5 border-primary shadow-[0_0_20px_rgba(126,249,255,0.1)]' 
                        : 'cursor-pointer bg-surface/50 border-white/5 hover:border-white/20 hover:bg-surface'
                }`}
        >
            {selected && !disabled && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary text-black flex items-center justify-center">
                    <Check className="w-3 h-3" />
                </div>
            )}
            <div className={`mb-3 w-10 h-10 rounded-lg flex items-center justify-center border
                ${disabled
                    ? 'bg-white/5 border-white/10 text-text-subtle'
                    : selected 
                        ? 'bg-primary/20 border-primary/30 text-primary' 
                        : 'bg-white/5 border-white/10 text-text-subtle group-hover:text-white'
                }
            `}>
                <Icon className="w-5 h-5" />
            </div>
            <h4 className={`text-sm font-bold mb-1 ${selected && !disabled ? 'text-white' : 'text-gray-400'}`}>{title}</h4>
            <p className="text-xs text-text-subtle leading-relaxed mb-2 flex-1">{description}</p>
            
            {disabled && disabledReason && (
                <div className="mt-3 flex items-start gap-2 text-[10px] text-amber-400/90 font-medium bg-amber-500/10 p-2 rounded border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span className="leading-tight">{disabledReason}</span>
                </div>
            )}
        </div>
    );

    const AGENTIC_MODELS = [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'OpenAI - Cost Effective', provider: 'openai', disabled: false },
        { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI - High Intelligence', provider: 'openai', disabled: true, reason: 'Temporarily disabled.' },
        { id: 'qwen2.5:7b-instruct-q4_K_M', name: 'Qwen 2.5 7B', description: 'Ollama - Local', provider: 'ollama', disabled: true, reason: 'Coming soon. Needs GPU.' },
        { id: 'llama-3.2-1b', name: 'Llama 3.2 1B', description: 'Ollama - Local', provider: 'ollama', disabled: true, reason: 'Coming soon. Needs GPU.' },
        { id: 'mistral-large', name: 'Mistral Large', description: 'Ollama - Local', provider: 'ollama', disabled: true, reason: 'Coming soon. Needs GPU.' },
    ];

    return (
        <div className="h-full flex flex-col bg-[#0E0E12] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        disabled={isLoading}
                        className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-text-subtle hover:text-white hover:border-primary/30 transition-all hover:-translate-x-1 disabled:opacity-50"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            Ingestion Settings
                        </h2>
                        <p className="text-text-subtle text-sm mt-1">Configure how your data is parsed, chunked, and indexed.</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {/* 1. Parsing Strategy */}
                <ConfigSection title="Parsing Strategy" icon={ScanLine}>
                    <SelectionCard 
                        selected={config.parser === 'n8n_basic'}
                        onClick={() => updateConfig('parser', 'n8n_basic')}
                        title="Basic Extractor"
                        description="Simple text/HTML extraction using standard n8n nodes. Best for simple files."
                        icon={FileText}
                    />
                    <SelectionCard 
                        selected={config.parser === 'llamaindex'}
                        onClick={() => updateConfig('parser', 'llamaindex')}
                        title="LlamaParse"
                        description="Advanced parsing for complex PDFs with tables and figures."
                        icon={Cpu}
                    />
                    <SelectionCard 
                        selected={config.parser === 'mistral_ocr'}
                        onClick={() => updateConfig('parser', 'mistral_ocr')}
                        title="Mistral OCR"
                        description="High-fidelity optical character recognition for scanned documents."
                        icon={ScanLine}
                    />
                    <SelectionCard 
                        selected={config.parser === 'gemini_ocr'}
                        onClick={() => updateConfig('parser', 'gemini_ocr')}
                        title="Gemini OCR"
                        description="Multimodal parsing using Google Gemini Vision capabilities."
                        icon={Sparkles}
                    />
                     <SelectionCard 
                        selected={config.parser === 'docling'}
                        onClick={() => updateConfig('parser', 'docling')}
                        title="Docling Parser"
                        description="Specialized layout analysis and structure extraction."
                        icon={FileCode}
                        disabled={true}
                        disabledReason="Resource heavy. Requires GPU upgrade. Coming soon."
                    />
                </ConfigSection>

                {/* 2. Chunking Strategy */}
                <ConfigSection title="Chunking Strategy" icon={Layers}>
                    <SelectionCard 
                        selected={config.chunker === 'code_node'}
                        onClick={() => updateConfig('chunker', 'code_node')}
                        title="Recursive Text Splitter"
                        description="Standard splitting using separators and overlap."
                        icon={Code}
                    />
                    <SelectionCard 
                        selected={config.chunker === 'agentic'}
                        onClick={() => updateConfig('chunker', 'agentic')}
                        title="Agentic Chunking"
                        description="Semantic splitting based on content meaning and context boundaries."
                        icon={Cpu}
                    />
                    <SelectionCard 
                        selected={config.chunker === 'docling'}
                        onClick={() => updateConfig('chunker', 'docling')}
                        title="Docling Chunker"
                        description="Hierarchical chunking preserving document structure."
                        icon={FileCode}
                        disabled={true}
                        disabledReason="Resource heavy. Requires GPU upgrade. Coming soon."
                    />
                </ConfigSection>

                {/* Chunking Parameters (Conditional) */}
                {config.chunker === 'code_node' && (
                    <div className="mb-8 p-6 rounded-xl bg-surface/30 border border-white/5 animate-fade-in-up">
                        <h4 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Terminal className="w-3.5 h-3.5" />
                            Recursive Splitter Parameters
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-sm font-medium text-white">Chunk Size</label>
                                    <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{config.chunkSize}</span>
                                </div>
                                <input 
                                    type="range" min="100" max="2000" step="50"
                                    value={config.chunkSize}
                                    onChange={(e) => updateConfig('chunkSize', parseInt(e.target.value))}
                                    className="w-full h-2 bg-surface rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                                />
                                <p className="text-xs text-text-subtle">Target characters per chunk.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-sm font-medium text-white">Chunk Overlap</label>
                                    <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{config.chunkOverlap}</span>
                                </div>
                                <input 
                                    type="range" min="0" max="200" step="10"
                                    value={config.chunkOverlap}
                                    onChange={(e) => updateConfig('chunkOverlap', parseInt(e.target.value))}
                                    className="w-full h-2 bg-surface rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                                />
                                <p className="text-xs text-text-subtle">Overlap between adjacent chunks (rec. 10%).</p>
                            </div>
                        </div>
                    </div>
                )}

                {config.chunker === 'agentic' && (
                    <div className="mb-8 p-6 rounded-xl bg-surface/30 border border-white/5 animate-fade-in-up">
                        <h4 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-6 flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5" />
                            Agentic Chunking Configuration
                        </h4>
                        
                        {/* Model Selection */}
                        <div className="mb-6 pb-6 border-b border-white/5">
                            <label className="text-sm font-medium text-white mb-3 block">Segmentation Model</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {AGENTIC_MODELS.map(model => (
                                    <div 
                                        key={model.id}
                                        onClick={() => !model.disabled && updateConfig('agenticModel', model.id)}
                                        className={`relative p-3 rounded-lg border flex items-start gap-3 transition-all ${
                                            model.disabled 
                                                ? 'opacity-60 bg-white/5 border-white/5 cursor-not-allowed grayscale' 
                                                : config.agenticModel === model.id 
                                                    ? 'bg-secondary/10 border-secondary cursor-pointer shadow-lg' 
                                                    : 'bg-surface border-white/10 hover:border-white/20 cursor-pointer'
                                        }`}
                                    >
                                        <div className={`mt-0.5 w-8 h-8 rounded flex items-center justify-center border shrink-0 ${
                                            model.provider === 'openai' 
                                                ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                                                : 'bg-orange-500/10 border-orange-500/20 text-orange-500'
                                        }`}>
                                            {model.provider === 'openai' ? <OpenAILogo className="w-4 h-4" /> : <OllamaLogo className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className={`text-sm font-bold ${config.agenticModel === model.id ? 'text-white' : 'text-gray-400'}`}>{model.name}</div>
                                                {config.agenticModel === model.id && !model.disabled && <Check className="w-3 h-3 text-secondary" />}
                                            </div>
                                            <div className="text-[10px] text-text-subtle mt-0.5">{model.description}</div>
                                            {model.disabled && (
                                                <div className="mt-2 flex items-center gap-1.5 text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 w-fit">
                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                    {model.reason}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white">Split Instructions</label>
                                <textarea 
                                    value={config.splitInstructions}
                                    onChange={(e) => updateConfig('splitInstructions', e.target.value)}
                                    placeholder="Describe how the agent should determine split points..."
                                    className="w-full h-24 bg-surface border border-white/10 rounded-xl px-4 py-3 text-white focus:border-secondary/50 focus:outline-none transition-colors text-xs font-mono resize-none leading-relaxed"
                                />
                                <p className="text-xs text-text-subtle">Prompt to guide the agent in identifying semantic boundaries.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium text-white">Min Chunk Size</label>
                                        <span className="text-xs font-mono text-secondary bg-secondary/10 px-2 py-0.5 rounded">{config.minChunkSize}</span>
                                    </div>
                                    <input 
                                        type="range" min="100" max="1000" step="50"
                                        value={config.minChunkSize}
                                        onChange={(e) => updateConfig('minChunkSize', parseInt(e.target.value))}
                                        className="w-full h-2 bg-surface rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-medium text-white">Max Chunk Size</label>
                                        <span className="text-xs font-mono text-secondary bg-secondary/10 px-2 py-0.5 rounded">{config.maxChunkSize}</span>
                                    </div>
                                    <input 
                                        type="range" min="500" max="2000" step="50"
                                        value={config.maxChunkSize}
                                        onChange={(e) => updateConfig('maxChunkSize', parseInt(e.target.value))}
                                        className="w-full h-2 bg-surface rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. NEW: Context Augmentation */}
                <ConfigSection title="Context Augmentation" icon={BrainCircuit}>
                    <SelectionCard 
                        selected={!config.contextAugmentation}
                        onClick={() => updateConfig('contextAugmentation', false)}
                        title="Standard Indexing"
                        description="Fast, direct indexing of chunks. Ideal for well-structured documents."
                        icon={Zap}
                    />
                    <SelectionCard 
                        selected={config.contextAugmentation}
                        onClick={() => updateConfig('contextAugmentation', true)}
                        title="AI Context Enrichment"
                        description="Uses LLMs to generate hypothetical questions and summaries for every chunk, fixing 'lost context' in split documents."
                        icon={Sparkles}
                    />
                </ConfigSection>

                {/* Warning for Augmentation */}
                {config.contextAugmentation && (
                     <div className="mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4 animate-fade-in-up">
                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-200 mb-1">High Latency & Cost Warning</h4>
                            <p className="text-xs text-amber-200/80 leading-relaxed">
                                Enabling Context Enrichment will significantly increase processing time and cost. 
                                The system calls an LLM (e.g., OpenAI) for <strong>every single chunk</strong> to generate metadata. 
                                Only use this for complex, unstructured documents where standard retrieval fails.
                            </p>
                        </div>
                     </div>
                )}

                {/* 4. Ingestion Destination */}
                <ConfigSection title="Destination & Indexing" icon={Database}>
                    <SelectionCard 
                        selected={config.destination === 'postgres'}
                        onClick={() => updateConfig('destination', 'postgres')}
                        title="PostgreSQL (pgvector)"
                        description="Relational database with vector extension. Best for hybrid search."
                        icon={Database}
                    />
                    <SelectionCard 
                        selected={config.destination === 'qdrant'}
                        onClick={() => updateConfig('destination', 'qdrant')}
                        title="Qdrant Vector DB"
                        description="High-performance vector similarity search engine."
                        icon={Database}
                        disabled={true}
                        disabledReason="Temporarily unavailable."
                    />
                     <SelectionCard 
                        selected={config.destination === 'pinecone'}
                        onClick={() => updateConfig('destination', 'pinecone')}
                        title="Pinecone"
                        description="Managed vector database service."
                        icon={UploadCloud}
                        disabled={true}
                        disabledReason="Temporarily unavailable."
                    />
                </ConfigSection>
            </div>

            {/* Footer Actions */}
            <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs text-text-subtle">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>Configuration Validated</span>
                </div>
                <div className="flex gap-3">
                     <Button 
                        variant="outline" 
                        onClick={onBack}
                        disabled={isLoading}
                        className="border-white/10 hover:bg-white/5 text-text-subtle hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={() => onStart(config)}
                        disabled={isLoading}
                        className="shadow-neon-primary px-8"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        {isLoading ? 'Processing...' : 'Start Ingestion Process'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- SharePoint Component ---

interface SharePointItem {
    id: string;
    name: string;
    [key: string]: any;
}

interface SharePointExplorerProps {
    notebookId: string;
    onConfigure: (item: SharePointItem) => void;
}

const SharePointExplorer: React.FC<SharePointExplorerProps> = ({ notebookId, onConfigure }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [items, setItems] = useState<SharePointItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchFolders = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // STRICT: POST request with EMPTY BODY as required by the webhook for Discovery
            const response = await fetch(SHAREPOINT_DISCOVERY_WEBHOOK_URL, {
                method: 'POST',
                body: null
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch folders: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            let parsedItems: SharePointItem[] = [];
            if (Array.isArray(data)) {
                parsedItems = data.map(item => item.json ? item.json : item);
            } else if (typeof data === 'object' && data) {
                const list = data.data || data.value || data.folders || data.items || [data];
                if (Array.isArray(list)) {
                    parsedItems = list;
                }
            }

            const normalizedItems = parsedItems.map(item => ({
                ...item,
                id: item.id || item.driveId || item.folderId || item.webUrl || 'unknown_id',
                name: item.name || item.folderName || item.driveName || item.displayName || 'Untitled Folder'
            })).filter(item => item.id !== 'unknown_id');

            setItems(normalizedItems);
            
            if (normalizedItems.length === 0) {
                console.warn("Received empty list from SharePoint webhook", data);
                if (Array.isArray(data) && data.length === 0) {
                     setError("No folders found (Empty Response).");
                }
            }

        } catch (err: any) {
            console.error("SharePoint fetch error:", err);
            setError(err.message || "Failed to connect to SharePoint.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfigureClick = () => {
        if (!selectedId) return;
        const selectedItem = items.find(i => i.id === selectedId);
        if (selectedItem) {
            onConfigure(selectedItem);
        }
    };

    const handleCopyId = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
    };

    return (
        <div className="h-full flex flex-col w-full relative">
            
            {/* Header / Connection Status */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-[#0078D4]/20 text-[#0078D4] border border-[#0078D4]/30">
                            <Share2 className="w-5 h-5" />
                        </span>
                        Microsoft SharePoint
                    </h3>
                    <p className="text-text-subtle text-sm max-w-lg">
                        Connect to your organization's SharePoint drives. Select a root folder to recursively index all contained documents.
                    </p>
                </div>
                
                {items.length > 0 && (
                     <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Connected</span>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={fetchFolders}
                            disabled={isLoading}
                            className="!h-9 !px-3 !text-xs border-white/10 hover:bg-white/5"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                     </div>
                )}
            </div>

            {/* Main Content Panel */}
            <div className="flex-1 bg-surface/30 border border-white/10 rounded-2xl overflow-hidden flex flex-col relative shadow-xl backdrop-blur-sm">
                
                {/* Empty State / Initial Connect */}
                {items.length === 0 && !isLoading && !error && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#0A0A0F] to-[#0F0F13]">
                        <div className="w-20 h-20 rounded-2xl bg-[#0078D4]/10 border border-[#0078D4]/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,120,212,0.1)] group">
                            <Share2 className="w-10 h-10 text-[#0078D4] group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Connect to Drive</h4>
                        <p className="text-text-subtle text-sm max-w-sm mb-8 leading-relaxed">
                            Establish a secure connection to fetch available document libraries and folders from your SharePoint instance.
                        </p>
                        <Button 
                            variant="primary" 
                            onClick={fetchFolders}
                            className="!h-12 !px-8 !text-sm bg-[#0078D4] hover:bg-[#006cbd] border-none text-white shadow-[0_0_20px_rgba(0,120,212,0.3)] hover:shadow-[0_0_30px_rgba(0,120,212,0.5)]"
                        >
                            Connect & Fetch Folders
                        </Button>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                     <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-[#0F0F13] border border-white/10 shadow-2xl">
                            <Loader2 className="w-10 h-10 text-[#0078D4] animate-spin" />
                            <div className="text-center">
                                <p className="text-sm font-bold text-white">Authenticating...</p>
                                <p className="text-xs text-text-subtle mt-1">Fetching directory structure</p>
                            </div>
                        </div>
                     </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0A0A0F]">
                         <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20 mb-4 animate-pulse">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                         </div>
                         <h4 className="text-lg font-bold text-white mb-2">Connection Failed</h4>
                         <p className="text-red-400 text-xs bg-red-500/5 px-4 py-2 rounded-lg border border-red-500/10 mb-6 font-mono max-w-md text-center">
                            {error}
                         </p>
                         <Button variant="outline" onClick={fetchFolders} className="border-white/10 hover:bg-white/5">Try Again</Button>
                    </div>
                )}

                {/* Folders List */}
                {items.length > 0 && (
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Toolbar */}
                        <div className="px-6 py-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div className="flex items-center gap-2 text-xs font-bold text-text-subtle uppercase tracking-wider">
                                <Folder className="w-3.5 h-3.5" />
                                <span>Directory Listing</span>
                            </div>
                            <span className="text-[10px] font-mono text-text-subtle bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                {items.length} Items Found
                            </span>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {items.map((item) => {
                                    const isSelected = selectedId === item.id;
                                    return (
                                        <div 
                                            key={item.id}
                                            onClick={() => setSelectedId(item.id)}
                                            className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-4 overflow-hidden ${
                                                isSelected 
                                                    ? 'bg-[#0078D4]/10 border-[#0078D4]/50 shadow-[0_0_20px_rgba(0,120,212,0.15)]' 
                                                    : 'bg-[#15151A] border-white/5 hover:border-white/15 hover:bg-[#1A1A20]'
                                            }`}
                                        >
                                            {/* Selection Indicator Bar */}
                                            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0078D4]"></div>}

                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                                isSelected ? 'bg-[#0078D4] text-white shadow-lg' : 'bg-white/5 text-text-subtle group-hover:text-white group-hover:bg-white/10'
                                            }`}>
                                                <Folder className="w-5 h-5" />
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h4 className={`text-sm font-bold truncate pr-2 ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                                        {item.name}
                                                    </h4>
                                                </div>
                                                
                                                <div className="mt-2 flex items-center gap-2 group/id">
                                                    <code className={`px-1.5 py-0.5 rounded border text-[9px] font-mono truncate max-w-[140px] transition-colors ${
                                                        isSelected ? 'bg-black/30 border-[#0078D4]/30 text-[#0078D4]' : 'bg-black/30 border-white/5 text-text-subtle'
                                                    }`} title={item.id}>
                                                        {item.id}
                                                    </code>
                                                    <button 
                                                        onClick={(e) => handleCopyId(e, item.id)}
                                                        className="opacity-0 group-hover/id:opacity-100 p-1 hover:bg-white/10 rounded text-text-subtle hover:text-white transition-opacity"
                                                        title="Copy ID"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <div className="absolute top-2 right-2">
                                                    <div className="bg-[#0078D4] rounded-full p-0.5">
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Floating Action Bar */}
                {selectedId && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-auto md:min-w-[400px] z-30 animate-fade-in-up">
                        <div className="bg-[#0F0F13]/90 backdrop-blur-xl border border-white/10 p-2 pl-4 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] flex items-center justify-between gap-6 ring-1 ring-white/5">
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-text-subtle uppercase font-bold tracking-wider">Folder Selected</span>
                                <span className="text-xs font-mono text-white truncate max-w-[200px]">{items.find(i => i.id === selectedId)?.name}</span>
                            </div>
                            <Button 
                                variant="primary" 
                                onClick={handleConfigureClick}
                                className="!h-10 !px-6 !text-xs bg-[#0078D4] hover:bg-[#006cbd] border-none text-white shadow-[0_0_15px_rgba(0,120,212,0.4)] whitespace-nowrap"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Configure Ingestion
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Ingestion Page Component ---

type IngestType = 'computer' | 'text' | 'sharepoint';

interface IngestPageProps {
    onBack: () => void;
    notebookId: string;
    notebookName: string;
    notebookDescription: string;
    notebookSettings: NotebookConfig;
}

const IngestPage: React.FC<IngestPageProps> = ({ onBack, notebookId, notebookName, notebookDescription, notebookSettings }) => {
    const [activeType, setActiveType] = useState<IngestType>('computer');
    const [dragActive, setDragActive] = useState(false);
    
    // Ingestion Data State
    const [textTitle, setTextTitle] = useState('');
    const [textContent, setTextContent] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Flow State
    const [configMode, setConfigMode] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pendingSource, setPendingSource] = useState<{ 
        type: IngestType, 
        data: any 
    } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    // --- Step 1: Pre-Check and Move to Config ---

    const handleConfigureText = () => {
        if (!textTitle || !textContent) return;
        setPendingSource({
            type: 'text',
            data: { title: textTitle, content: textContent }
        });
        setConfigMode(true);
    };

    const handleConfigureFile = () => {
        if (!selectedFile) return;
        setPendingSource({
            type: 'computer',
            data: { file: selectedFile }
        });
        setConfigMode(true);
    };

    const handleConfigureSharePoint = (item: SharePointItem) => {
        setPendingSource({
            type: 'sharepoint',
            data: { id: item.id, name: item.name }
        });
        setConfigMode(true);
    };

    // --- Helper: Convert File to Base64 ---
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    // --- Step 2: Final Execution ---

    const handleFinalIngest = async (ingestionConfig: IngestionConfig) => {
        if (!pendingSource) return;
        setIsProcessing(true);

        try {
            // Mappings for UI Names
            const PARSER_NAMES: Record<string, string> = {
                'n8n_basic': 'Basic Extractor',
                'llamaindex': 'LlamaParse',
                'mistral_ocr': 'Mistral OCR',
                'docling': 'Docling Parser',
                'gemini_ocr': 'Gemini OCR'
            };

            const CHUNKER_NAMES: Record<string, string> = {
                'code_node': 'Recursive Text Splitter',
                'agentic': 'Agentic Chunking',
                'docling': 'Docling Chunker'
            };

            const DESTINATION_NAMES: Record<string, string> = {
                'postgres': 'PostgreSQL (pgvector)',
                'qdrant': 'Qdrant Vector DB',
                'pinecone': 'Pinecone'
            };

            const METHOD_NAMES: Record<string, string> = {
                'computer': 'computer upload',
                'text': 'text',
                'sharepoint': 'SharePoint'
            };

            // Flattened, Explicit Payload Structure
            let payload: any = {
                // 1. Notebook Identity
                notebook_id: notebookId,
                notebook_name: notebookName,
                notebook_description: notebookDescription,

                // 2. Notebook Settings (from Settings Page)
                embedding_model: notebookSettings.embeddingModel,
                inference_provider: notebookSettings.inference.provider,
                inference_model: notebookSettings.inference.model,
                inference_temperature: notebookSettings.inference.temperature,
                
                // 3. Ingestion Method
                ingestion_method: METHOD_NAMES[pendingSource.type],
                
                // 4. Ingestion Config (Mapped to UI Names)
                config_parser_mode: PARSER_NAMES[ingestionConfig.parser],
                config_chunking_mode: CHUNKER_NAMES[ingestionConfig.chunker],
                config_destination: DESTINATION_NAMES[ingestionConfig.destination],
                config_enable_context_augmentation: ingestionConfig.contextAugmentation === true,
                
                // 5. Recursive Chunking Params
                recursive_chunk_size: ingestionConfig.chunkSize,
                recursive_chunk_overlap: ingestionConfig.chunkOverlap,
                recursive_separators: ingestionConfig.separators,

                // 6. Agentic Chunking Params
                agentic_model: ingestionConfig.agenticModel,
                agentic_instructions: ingestionConfig.splitInstructions,
                agentic_min_size: ingestionConfig.minChunkSize,
                agentic_max_size: ingestionConfig.maxChunkSize,
                
                timestamp: new Date().toISOString(),
            };

            // 7. Source Data Injection
            if (pendingSource.type === 'text') {
                payload = {
                    ...payload,
                    action: 'ingest_raw_text',
                    text_title: pendingSource.data.title,
                    text_content: pendingSource.data.content
                };
            } else if (pendingSource.type === 'computer') {
                // Convert file to base64 for JSON transmission
                const base64Content = await fileToBase64(pendingSource.data.file);
                
                payload = {
                    ...payload,
                    action: 'ingest_file',
                    file_name: pendingSource.data.file.name,
                    file_size: pendingSource.data.file.size,
                    file_type: pendingSource.data.file.type,
                    file_content_base64: base64Content
                };
            } else if (pendingSource.type === 'sharepoint') {
                payload = {
                    ...payload,
                    action: 'process_sharepoint_folder',
                    sharepoint_folder_id: pendingSource.data.id,
                    sharepoint_folder_name: pendingSource.data.name
                };
            }

            console.log("🚀 Sending Ingestion Payload:", payload);

            // POST with application/json
            const response = await fetch(INGESTION_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert(`Ingestion started successfully for ${METHOD_NAMES[pendingSource.type].toUpperCase()} source.`);
                // Reset UI
                setConfigMode(false);
                setPendingSource(null);
                setTextTitle('');
                setTextContent('');
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                throw new Error(`Server status: ${response.status}`);
            }

        } catch (error: any) {
            console.error('Ingest Error:', error);
            alert(`Failed to start ingestion: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Render Config Mode
    if (configMode) {
        return (
            <IngestionSettings 
                onBack={() => setConfigMode(false)}
                onStart={handleFinalIngest}
                isLoading={isProcessing}
            />
        );
    }

    // Render Source Selection Mode
    return (
        <div className="h-full flex flex-col animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-text-subtle hover:text-white hover:border-primary/30 transition-all hover:-translate-x-1"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            Ingest Documents
                        </h2>
                        <p className="text-text-subtle text-sm mt-1">Add knowledge to your RAG context from various sources.</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-[#0E0E12] border border-white/10 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
                
                {/* Source Selection Sidebar */}
                <div className="w-full md:w-72 bg-[#0A0A0F] border-r border-white/5 p-4 flex flex-col gap-2 relative z-10">
                    <div className="text-[10px] font-bold text-text-subtle uppercase tracking-wider mb-4 px-2 mt-2 opacity-50">Select Source</div>
                    
                    {[
                        { id: 'computer', icon: HardDrive, label: 'From Computer', sub: 'Upload Local Files', color: 'text-primary', activeBorder: 'border-primary', activeBg: 'bg-primary/10' },
                        { id: 'text', icon: Type, label: 'Raw Text', sub: 'Paste & Edit', color: 'text-secondary', activeBorder: 'border-secondary', activeBg: 'bg-secondary/10' },
                        { id: 'sharepoint', icon: Share2, label: 'SharePoint', sub: 'Microsoft Graph', color: 'text-[#0078D4]', activeBorder: 'border-[#0078D4]', activeBg: 'bg-[#0078D4]/10' }
                    ].map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => setActiveType(item.id as IngestType)}
                            className={`group flex items-center gap-4 px-4 py-4 rounded-xl text-sm transition-all text-left relative overflow-hidden ${
                                activeType === item.id 
                                    ? `${item.activeBg} border ${item.activeBorder} shadow-lg` 
                                    : 'bg-white/[0.02] border border-transparent hover:bg-white/5 hover:border-white/5'
                            }`}
                        >
                            {/* Icon Container */}
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                                activeType === item.id 
                                    ? `bg-surface border-${item.color.split('-')[1]}/30 ${item.color}` 
                                    : 'bg-white/5 border-white/5 text-text-subtle group-hover:text-white group-hover:bg-white/10'
                            }`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            
                            <div className="flex flex-col z-10">
                                <span className={`font-bold transition-colors ${activeType === item.id ? 'text-white' : 'text-text-subtle group-hover:text-white'}`}>{item.label}</span>
                                <span className="text-[10px] font-normal opacity-70">{item.sub}</span>
                            </div>

                            {/* Active Glow */}
                            {activeType === item.id && (
                                <div className={`absolute -right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-current opacity-20 blur-xl rounded-full pointer-events-none ${item.color}`}></div>
                            )}
                        </button>
                    ))}
                    
                    {/* Security Badge */}
                    <div className="mt-auto p-4 rounded-xl bg-surface/30 border border-white/5 flex items-center gap-3">
                         <Shield className="w-8 h-8 text-emerald-500/50" />
                         <div>
                             <div className="text-[10px] font-bold text-white mb-0.5">Secure Transfer</div>
                             <div className="text-[9px] text-text-subtle leading-tight">All uploads are encrypted and processed in sovereign cloud.</div>
                         </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 bg-[#0F0F13] overflow-y-auto custom-scrollbar relative flex flex-col">
                    
                    {/* Dynamic Background Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                    {/* Option 1: Computer */}
                    {activeType === 'computer' && (
                        <div className="h-full flex flex-col max-w-2xl mx-auto w-full relative z-10 justify-center">
                            {!selectedFile ? (
                                <div 
                                    className={`relative group border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-12 transition-all duration-300 min-h-[400px] cursor-pointer
                                        ${dragActive 
                                            ? 'border-primary bg-primary/5 scale-[0.99] shadow-[0_0_50px_rgba(126,249,255,0.1)]' 
                                            : 'border-white/10 hover:border-primary/50 hover:bg-surface/50'
                                        }`}
                                    onDragEnter={() => setDragActive(true)}
                                    onDragLeave={() => setDragActive(false)}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 transition-all duration-500
                                        ${dragActive ? 'bg-primary/20 scale-110' : 'bg-surface border border-white/10 shadow-2xl group-hover:scale-105 group-hover:border-primary/30'}
                                    `}>
                                        <UploadCloud className={`w-10 h-10 transition-colors ${dragActive ? 'text-primary' : 'text-text-subtle group-hover:text-primary'}`} />
                                    </div>
                                    
                                    <h3 className="text-2xl font-bold text-white mb-3">Drop file to upload</h3>
                                    <p className="text-text-subtle text-sm text-center max-w-xs mb-8 leading-relaxed">
                                        Drag & drop your document here, or click to browse files from your computer.
                                    </p>
                                    
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-text-subtle">PDF</span>
                                        <span className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-text-subtle">DOCX</span>
                                        <span className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-text-subtle">TXT</span>
                                        <span className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-text-subtle">CSV</span>
                                    </div>

                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileChange} 
                                        className="hidden" 
                                    />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in-up">
                                    <div className="w-full max-w-md bg-surface border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                                        {/* Glow Effect */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full pointer-events-none"></div>

                                        <div className="flex items-start gap-5 mb-8">
                                            <div className="w-16 h-16 bg-[#1A1A21] rounded-2xl flex items-center justify-center border border-white/5 shadow-inner shrink-0">
                                                <FileIcon className="w-8 h-8 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">{selectedFile.name}</h3>
                                                <div className="flex items-center gap-3 text-text-subtle text-xs">
                                                    <span className="font-mono">{(selectedFile.size / 1024).toFixed(2)} KB</span>
                                                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                                    <span className="uppercase">{selectedFile.name.split('.').pop()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <Button 
                                                variant="primary" 
                                                onClick={handleConfigureFile}
                                                className="w-full !h-12 !text-sm shadow-neon-primary"
                                            >
                                                <Settings className="w-4 h-4 mr-2" />
                                                Next: Configure Ingestion
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                className="w-full !h-12 !text-sm border-white/10 hover:bg-white/5 text-text-subtle hover:text-white" 
                                                onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Option 2: Raw Text */}
                    {activeType === 'text' && (
                        <div className="h-full flex flex-col gap-6 max-w-3xl mx-auto w-full relative z-10">
                             <div className="mb-2">
                                <h3 className="text-xl font-bold text-white mb-2">Raw Text Editor</h3>
                                <p className="text-text-subtle text-sm">Paste content directly. Useful for quick notes, code snippets, or unformatted data.</p>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-2 block flex items-center gap-2">
                                        Document Title
                                        <span className="text-secondary">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={textTitle}
                                        onChange={(e) => setTextTitle(e.target.value)}
                                        placeholder="e.g. System Architecture Constraints" 
                                        className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-5 py-4 text-white focus:border-secondary/50 focus:outline-none transition-colors shadow-inner text-sm font-medium"
                                    />
                                </div>
                                <div className="flex-1 flex flex-col h-[400px]">
                                    <label className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-2 block flex items-center gap-2">
                                        Content Body
                                        <span className="text-secondary">*</span>
                                    </label>
                                    <div className="relative flex-1 group">
                                        <textarea 
                                            value={textContent}
                                            onChange={(e) => setTextContent(e.target.value)}
                                            placeholder="// Paste text content here..." 
                                            className="w-full h-full bg-[#0A0A0F] border border-white/10 rounded-xl px-5 py-5 text-gray-300 focus:border-secondary/50 focus:outline-none transition-colors resize-none font-mono text-xs leading-relaxed shadow-inner"
                                            spellCheck={false}
                                        />
                                        <div className="absolute bottom-4 right-4 text-[10px] text-text-subtle/50 font-mono">
                                            {textContent.length} chars
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-white/5">
                                <Button 
                                    variant="secondary" 
                                    className="!h-12 px-8 disabled:opacity-50 shadow-neon-secondary"
                                    onClick={handleConfigureText}
                                    disabled={!textTitle || !textContent}
                                >
                                    <ArrowRight className="w-4 h-4 mr-2" />
                                    Next: Configure Ingestion
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Option 3: SharePoint */}
                    {activeType === 'sharepoint' && (
                        <div className="h-full relative z-10 flex flex-col">
                            <SharePointExplorer 
                                notebookId={notebookId} 
                                onConfigure={handleConfigureSharePoint}
                            />
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

interface NotebookDocumentsProps {
    notebookId: string;
    notebookName: string;
    notebookDescription: string;
    config: NotebookConfig;
}

const NotebookDocuments: React.FC<NotebookDocumentsProps> = ({ notebookId, notebookName, notebookDescription, config }) => {
  const [viewMode, setViewMode] = useState<'list' | 'ingest'>('list');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [stats, setStats] = useState<{total: number, size: string}>({ total: 0, size: '0 MB' });

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
        const response = await fetch(NOTEBOOK_STATUS_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notebook_id: notebookId })
        });

        if (response.ok) {
            const rawData = await response.json();
            console.log("Raw Webhook Response:", rawData);

            let filesList: any[] = [];
            let statsData: any = {};

            // Parsing Logic to handle n8n Variations
            if (Array.isArray(rawData)) {
                // Check if it's n8n style [{json: ...}, {json: ...}]
                if (rawData.length > 0 && rawData[0].json) {
                    const unwrapped = rawData.map((item: any) => item.json);
                    
                    // CASE 1: The array ITSELF is the list of files
                    // Heuristic: check if the first item looks like a file (has id/name)
                    if (unwrapped[0].id || unwrapped[0].file_id || unwrapped[0].name || unwrapped[0].file_name) {
                        filesList = unwrapped;
                    } 
                    // CASE 2: It's a wrapped response like [{json: { files: [...] }}]
                    else if (Array.isArray(unwrapped[0].files)) {
                        filesList = unwrapped[0].files;
                        if (unwrapped[0].stats) statsData = unwrapped[0].stats;
                    }
                    else if (Array.isArray(unwrapped[0].data)) {
                        filesList = unwrapped[0].data;
                         if (unwrapped[0].stats) statsData = unwrapped[0].stats;
                    }
                } else {
                    // Raw array [ {...}, {...} ]
                    filesList = rawData;
                }
            } else if (typeof rawData === 'object' && rawData !== null) {
                // CASE 3: Single object { files: [...] } or { data: [...] }
                if (Array.isArray(rawData.files)) {
                    filesList = rawData.files;
                    if (rawData.stats) statsData = rawData.stats;
                }
                else if (Array.isArray(rawData.data)) {
                    filesList = rawData.data;
                     if (rawData.stats) statsData = rawData.stats;
                }
                // CASE 4: Single object representing a list wrapper { results: [...] }
                else if (Array.isArray(rawData.results)) {
                    filesList = rawData.results;
                     if (rawData.stats) statsData = rawData.stats;
                }
            }
            
            const mappedDocs: Document[] = filesList.map((f: any) => ({
                id: f.id || f.file_id || Math.random().toString(36),
                name: f.name || f.file_name || 'Untitled',
                type: f.type || f.mime_type?.split('/').pop()?.toUpperCase() || 'UNKNOWN',
                status: ((f.status === 'success' || f.status === 'completed') ? 'completed' : 
                        (f.status === 'processing') ? 'processing' : 
                        (f.status === 'failed' || f.status === 'error') ? 'error' : 'pending') as Document['status'],
                size: f.size_formatted || f.size || '0 KB',
                added: f.created_at ? new Date(f.created_at).toLocaleString() : 'Unknown'
            }));
            
            setDocuments(mappedDocs);
            
            // Extract stats if available
            if (Object.keys(statsData).length > 0) {
                setStats({
                    total: statsData.total_documents || mappedDocs.length,
                    size: statsData.total_size || '0 MB'
                });
            } else {
                 setStats({
                    total: mappedDocs.length,
                    size: 'Unknown'
                });
            }
        }
    } catch (e) {
        console.error("Failed to fetch documents", e);
    } finally {
        setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'list') {
        fetchDocuments();
    }
  }, [notebookId, viewMode]);

  if (viewMode === 'ingest') {
      return (
          <div className="p-6 md:p-10 h-full">
             <IngestPage 
                onBack={() => setViewMode('list')} 
                notebookId={notebookId}
                notebookName={notebookName}
                notebookDescription={notebookDescription}
                notebookSettings={config}
             />
          </div>
      );
  }

  return (
    <div className="p-6 md:p-10 h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 animate-fade-in-up">
            <div>
                <h2 className="text-2xl font-bold text-white">Documents</h2>
                <p className="text-text-subtle text-sm mt-1">Manage and ingest knowledge base sources.</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64 group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-text-subtle group-focus-within:text-primary transition-colors" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search files..." 
                        className="w-full bg-surface border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-all shadow-sm"
                    />
                </div>
                
                <Button 
                    variant="outline" 
                    className="!h-[42px] !px-3 border-white/10 hover:bg-white/5"
                    onClick={fetchDocuments}
                    title="Refresh List"
                    disabled={isLoadingDocs}
                >
                    <RefreshCw className={`w-4 h-4 ${isLoadingDocs ? 'animate-spin' : ''}`} />
                </Button>

                <Button 
                    variant="primary" 
                    className="!h-[42px] !px-4 md:!px-6 whitespace-nowrap shadow-neon-primary hover:scale-[1.02] active:scale-[0.98] transition-transform"
                    onClick={() => setViewMode('ingest')}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Ingest Documents
                </Button>
            </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 bg-[#0E0E12] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl animate-fade-in-up relative" style={{ animationDelay: '0.1s' }}>
            {/* Gloss Highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <div className="overflow-auto custom-scrollbar flex-1 relative">
                {isLoadingDocs && documents.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0E0E12]/80 backdrop-blur-sm z-20">
                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                        <span className="text-xs text-text-subtle">Loading documents...</span>
                    </div>
                )}
                
                {!isLoadingDocs && documents.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-subtle opacity-50 p-8">
                        <FolderOpen className="w-12 h-12 mb-4 stroke-1" />
                        <p className="text-sm font-bold">No Documents Found</p>
                        <p className="text-xs mt-1">Ingest content to populate this notebook.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/[0.02] border-b border-white/5 sticky top-0 backdrop-blur-md z-10">
                            <tr>
                                <th className="py-4 px-6 text-[11px] font-bold text-text-subtle/70 uppercase tracking-wider">File Name</th>
                                <th className="py-4 px-6 text-[11px] font-bold text-text-subtle/70 uppercase tracking-wider">Status</th>
                                <th className="py-4 px-6 text-[11px] font-bold text-text-subtle/70 uppercase tracking-wider">Type</th>
                                <th className="py-4 px-6 text-[11px] font-bold text-text-subtle/70 uppercase tracking-wider text-right">Size</th>
                                <th className="py-4 px-6 text-[11px] font-bold text-text-subtle/70 uppercase tracking-wider text-right">Added</th>
                                <th className="py-4 px-6 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {documents.map((doc) => (
                                <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-primary group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-white group-hover:text-primary transition-colors line-clamp-1">{doc.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <StatusBadge status={doc.status} />
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-mono text-text-subtle bg-white/5 border border-white/10 px-2 py-1 rounded-md">{doc.type}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right text-sm text-text-subtle font-mono">{doc.size}</td>
                                    <td className="py-4 px-6 text-right text-sm text-text-subtle">{doc.added}</td>
                                    <td className="py-4 px-6 text-center">
                                        <button className="text-text-subtle hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/5 rounded-lg">
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
            {/* Footer Stats */}
            <div className="px-6 py-3 bg-[#0A0A0F] border-t border-white/5 flex justify-between items-center text-xs text-text-subtle">
                <div className="flex items-center gap-4">
                    <span>Total Documents: <span className="text-white font-bold">{stats.total}</span></span>
                    <span className="w-px h-3 bg-white/10"></span>
                    <span>Total Size: <span className="text-white font-bold">{stats.size}</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="opacity-80">System Operational</span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default NotebookDocuments;
