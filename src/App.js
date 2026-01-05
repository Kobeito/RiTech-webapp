import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  MapPin, 
  User, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Search,
  Trash2,
  Video,
  Shield,
  Key,
  Zap,
  LayoutDashboard,
  Briefcase,
  FileText,
  FileCheck,
  ShoppingCart,
  Package,
  PauseCircle,
  XCircle,
  CalendarDays,
  Pencil,
  Hash,
  Flame,
  Hourglass,
  Lock,
  LogOut,
  FileBarChart,
  Printer,
  Settings,
  AlertTriangle,
  RefreshCw 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  serverTimestamp,
  enableIndexedDbPersistence 
} from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- APP CONFIGURATION ---
const APP_NAME = "RiTech APP"; // <--- MODIFICA QUI IL NOME DELL'APP

// --- Constants & Utilities ---
const JOB_TYPES = [
  { id: 'cctv', label: 'Videosorveglianza', icon: <Video size={16} /> },
  { id: 'alarm', label: 'Impianto Allarme', icon: <Shield size={16} /> },
  { id: 'access', label: 'Controllo Accessi', icon: <Key size={16} /> },
  { id: 'electric', label: 'Elettrico Generale', icon: <Zap size={16} /> },
];

const STATUS_TYPES = [
  { id: 'quote_needed', label: 'Fare Preventivo', color: 'bg-blue-200 text-blue-900 border-blue-300', icon: <FileText size={14} /> },
  { id: 'quote_done', label: 'Fatto Preventivo', color: 'bg-cyan-200 text-cyan-900 border-cyan-300', icon: <FileCheck size={14} /> },
  { id: 'order_material', label: 'Ordinare Materiale', color: 'bg-orange-200 text-orange-900 border-orange-300', icon: <ShoppingCart size={14} /> },
  { id: 'waiting_material', label: 'Attesa Materiale', color: 'bg-indigo-200 text-indigo-900 border-indigo-300', icon: <Hourglass size={14} /> },
  { id: 'material_ordered', label: 'Materiale Ordinato', color: 'bg-purple-200 text-purple-900 border-purple-300', icon: <Package size={14} /> },
  { id: 'todo', label: 'Da Fare', color: 'bg-red-200 text-red-900 border-red-300', icon: <AlertCircle size={14} /> },
  { id: 'progress', label: 'In Corso', color: 'bg-yellow-200 text-yellow-900 border-yellow-300', icon: <Clock size={14} /> },
  { id: 'suspended', label: 'Sospeso', color: 'bg-gray-200 text-gray-900 border-gray-300', icon: <PauseCircle size={14} /> },
  { id: 'done', label: 'Completato', color: 'bg-green-200 text-green-900 border-green-300', icon: <CheckCircle2 size={14} /> },
  { id: 'cancelled', label: 'Annullato', color: 'bg-slate-300 text-slate-700 border-slate-400', icon: <XCircle size={14} /> },
];

const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const getJobRankScore = (job) => {
  const isDone = job.status === 'done' || job.status === 'cancelled';
  const isPriority = job.isPriority === true;
  const createdAt = job.createdAt?.seconds || 9999999999; 
  const endDateStr = job.endDate || '1970-01-01';
  const endDateVal = new Date(endDateStr).getTime();
  
  if (!isDone && isPriority) return 10000000000 + createdAt;
  if (!isDone && !isPriority) return 20000000000 + createdAt;
  return 30000000000 + (9999999999999 - endDateVal); 
};

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
  };
  return <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const Input = ({ label, value, onChange, placeholder, type = "text", className = "" }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
    />
  </div>
);

const Card = ({ children, onClick, className = '' }) => (
  <div onClick={onClick} className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:bg-slate-50 transition-colors ${className}`}>
    {children}
  </div>
);

// --- Main App ---
export default function ElectroManager() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false); 
  const [pinInput, setPinInput] = useState('');
  
  const [view, setView] = useState('dashboard');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [reportType, setReportType] = useState('materials'); 
  
  const [newPin, setNewPin] = useState('');
  
  const [rawClients, setRawClients] = useState([]);
  const [rawSites, setRawSites] = useState([]);
  const [rawJobs, setRawJobs] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, collection: null, id: null, title: '' });

  // Auth & Persistence
  useEffect(() => {
    const initAuth = async () => {
      try {
        await enableIndexedDbPersistence(db);
      } catch (err) {
        console.log("Persistence not enabled:", err.code);
      }

      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- HELPER: Re-connect & Auth Check ---
  const getAuthenticatedUser = async () => {
    if (auth.currentUser) return auth.currentUser;
    try {
      console.log("Tentativo riconnessione sessione...");
      const cred = await signInAnonymously(auth);
      return cred.user;
    } catch (e) {
      console.error("Errore riconnessione:", e);
      alert("Connessione persa. Controlla internet o riavvia l'app.");
      return null;
    }
  };

  // --- Listeners ---
  useEffect(() => {
    if (!user) return;
    const unsubClients = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'clients'), (snap) => setRawClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.error("Sync error clients", err));
    const unsubSites = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'sites'), (snap) => setRawSites(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.error("Sync error sites", err));
    const unsubJobs = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'jobs'), (snap) => setRawJobs(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.error("Sync error jobs", err));
    return () => { unsubClients(); unsubSites(); unsubJobs(); };
  }, [user]);

  // --- Derived State ---
  const validSites = useMemo(() => rawSites.filter(site => rawClients.some(client => client.id === site.clientId)), [rawSites, rawClients]);
  const validJobs = useMemo(() => rawJobs.filter(job => validSites.some(site => site.id === job.siteId)), [rawJobs, validSites]);

  const getActiveJobsCount = (siteId) => validJobs.filter(j => j.siteId === siteId && j.status !== 'done' && j.status !== 'cancelled').length;
  const getActiveSitesCount = (clientId) => {
    const clientSites = validSites.filter(s => s.clientId === clientId);
    return clientSites.filter(site => getActiveJobsCount(site.id) > 0).length;
  };

  const sitesWithRank = useMemo(() => {
    return validSites.map(site => {
      const siteJobs = validJobs.filter(j => j.siteId === site.id);
      const activeCount = getActiveJobsCount(site.id);
      if (siteJobs.length === 0) return { ...site, rankScore: 9999999999999, activeJobs: 0 };
      const bestJobScore = Math.min(...siteJobs.map(getJobRankScore));
      return { ...site, rankScore: bestJobScore, activeJobs: activeCount };
    }).sort((a, b) => a.rankScore - b.rankScore);
  }, [validSites, validJobs]);

  const clientsWithRank = useMemo(() => {
    return rawClients.map(client => {
      const clientSites = sitesWithRank.filter(s => s.clientId === client.id);
      const activeSites = getActiveSitesCount(client.id);
      if (clientSites.length === 0) return { ...client, rankScore: 9999999999999, activeSites: 0 };
      const bestSiteScore = Math.min(...clientSites.map(s => s.rankScore));
      return { ...client, rankScore: bestSiteScore, activeSites: activeSites };
    }).sort((a, b) => a.rankScore - b.rankScore);
  }, [rawClients, sitesWithRank]);

  const filteredClients = useMemo(() => clientsWithRank.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase())), [clientsWithRank, searchTerm]);
  
  const displayedSites = useMemo(() => {
    let list = sitesWithRank;
    if (selectedClient) list = list.filter(s => s.clientId === selectedClient.id);
    return list.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [sitesWithRank, selectedClient, searchTerm]);

  const displayedJobs = useMemo(() => {
    let list = validJobs.map(j => ({ ...j, rankScore: getJobRankScore(j) }));
    if (selectedSite) list = list.filter(j => j.siteId === selectedSite.id);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(j => j.description.toLowerCase().includes(lower) || j.offerRef?.toLowerCase().includes(lower) || j.technicianNotes?.toLowerCase().includes(lower));
    }
    return list.sort((a, b) => a.rankScore - b.rankScore);
  }, [validJobs, selectedSite, searchTerm]);

  const activeJobsCount = validJobs.filter(j => j.status !== 'done' && j.status !== 'cancelled').length;
  const totalSitesCount = validSites.length;
  const priorityJobsList = validJobs.filter(j => j.isPriority && j.status !== 'done' && j.status !== 'cancelled').sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

  // --- Handlers ---
  const handleLogin = () => {
    const storedPin = localStorage.getItem('electro_manager_pin') || '1234';
    if (pinInput === storedPin) { setIsAuthenticated(true); setPinInput(''); } 
    else { alert("PIN Errato. Se è il primo accesso prova 1234"); }
  };

  const handleLogout = () => { setIsAuthenticated(false); setView('dashboard'); };

  const handleChangePin = () => {
    if (newPin.length < 4) { alert("Il PIN deve essere di almeno 4 cifre."); return; }
    localStorage.setItem('electro_manager_pin', newPin);
    alert("PIN modificato con successo!");
    setNewPin('');
  };

  const navigateTo = (newView, client = null, site = null) => {
    setSearchTerm(''); setSelectedClient(client); setSelectedSite(site); setView(newView);
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) { setIsSaving(false); return; }

    let collectionName = view; 
    if (view === 'dashboard') collectionName = 'clients'; 
    const collRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, collectionName);
    const payload = { ...formData, createdAt: modalMode === 'add' ? serverTimestamp() : undefined, status: formData.status || 'todo' };
    if (modalMode === 'edit') delete payload.createdAt;
    if (view === 'sites' && modalMode === 'add') { payload.clientId = selectedClient.id; payload.clientName = selectedClient.name; }
    if (view === 'jobs' && modalMode === 'add') { payload.siteId = selectedSite.id; payload.clientName = selectedClient ? selectedClient.name : formData.clientName; payload.siteName = selectedSite ? selectedSite.name : formData.siteName; }

    try {
      if (modalMode === 'add') await addDoc(collRef, payload);
      else await updateDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, collectionName, formData.id), payload);
      setIsModalOpen(false); setFormData({});
    } catch (e) { console.error(e); alert("Errore nel salvataggio. Riprova tra un istante."); } 
    finally { setIsSaving(false); }
  };

  const handleEdit = (item, e) => { e.stopPropagation(); setFormData(item); setModalMode('edit'); setIsModalOpen(true); };
  
  const requestDelete = (coll, id, title, e) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, collection: coll, id: id, title: title || 'questo elemento' });
  };

  const executeDelete = async () => {
    if (!deleteConfirm.id) return;
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return;

    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, deleteConfirm.collection, deleteConfirm.id));
      
      if (deleteConfirm.collection === 'clients') {
        const sitesToDelete = rawSites.filter(s => s.clientId === deleteConfirm.id);
        for (const s of sitesToDelete) {
           await deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'sites', s.id));
           const jobsToDelete = rawJobs.filter(j => j.siteId === s.id);
           for (const j of jobsToDelete) await deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'jobs', j.id));
        }
      }
      else if (deleteConfirm.collection === 'sites') {
        const jobsToDelete = rawJobs.filter(j => j.siteId === deleteConfirm.id);
        for (const j of jobsToDelete) await deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'jobs', j.id));
      }

      setDeleteConfirm({ isOpen: false, collection: null, id: null, title: '' }); 
    } catch (err) {
      console.error(err);
      alert("Errore durante l'eliminazione. Riprova.");
    }
  };
  
  const handleUpdateStatus = async (jobId, newStatus) => {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) return;

    if (newStatus === 'done') {
      const job = rawJobs.find(j => j.id === jobId);
      if (!job.endDate) { alert("⚠️ Data Fine Lavori obbligatoria per completare."); return; }
    }
    
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'jobs', jobId), { status: newStatus });
    } catch (e) {
      console.error(e);
      alert("Errore di connessione. Riprova.");
    }
  };

  const jumpToJob = (job) => {
    const site = rawSites.find(s => s.id === job.siteId);
    if (site) navigateTo('jobs', null, site);
    else alert("Impossibile trovare il cantiere collegato.");
  };

  // --- Views ---

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white animate-in fade-in">
        <div className="bg-blue-600 p-4 rounded-full mb-6 shadow-lg shadow-blue-500/50"><Lock size={48} /></div>
        <h1 className="text-3xl font-bold mb-2">{APP_NAME}</h1>
        <p className="text-slate-400 mb-8">Accesso Sicuro</p>
        <div className="w-full max-w-xs space-y-4">
          <input type="password" pattern="[0-9]*" inputMode="numeric" className="w-full text-center text-2xl tracking-widest bg-slate-800 border border-slate-700 rounded-xl py-4 focus:ring-2 focus:ring-blue-500 outline-none text-white" placeholder="P I N" maxLength={4} value={pinInput} onChange={(e) => setPinInput(e.target.value)} />
          <Button onClick={handleLogin} className="w-full py-4 text-lg">Accedi</Button>
          <p className="text-center text-xs text-slate-500 mt-4">PIN Default: 1234</p>
        </div>
      </div>
    );
  }

  const renderDashboardView = () => (
    <div className="space-y-6 pb-24 animate-in fade-in">
      <div className="bg-slate-900 -m-4 mb-2 p-6 pb-8 rounded-b-3xl text-white">
        <div className="flex justify-between items-center mb-4">
          <div><p className="text-slate-400 text-xs font-bold uppercase">Benvenuto</p><h1 className="text-2xl font-bold">Dashboard</h1></div>
          <div className="flex gap-2">
            <button onClick={() => setView('settings')} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-blue-400"><Settings size={20} /></button>
            <button onClick={handleLogout} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-red-400"><LogOut size={20} /></button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div onClick={() => navigateTo('sites')} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 active:bg-slate-700 active:scale-95 transition-all cursor-pointer">
            <div className="text-slate-400 text-xs font-medium mb-1">Cantieri</div>
            <div className="text-2xl font-bold text-white flex items-center gap-2">{totalSitesCount} <MapPin size={16} className="text-orange-500" /></div>
          </div>
          <div onClick={() => navigateTo('jobs')} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 active:bg-slate-700 active:scale-95 transition-all cursor-pointer">
            <div className="text-slate-400 text-xs font-medium mb-1">Lavori Totali</div>
            <div className="text-2xl font-bold text-white flex items-center gap-2">{activeJobsCount} <Briefcase size={16} className="text-blue-400" /></div>
          </div>
        </div>
      </div>
      <div className="px-1 grid grid-cols-2 gap-3">
        <Card onClick={() => navigateTo('clients')} className="bg-gradient-to-br from-blue-600 to-blue-700 border-none text-white shadow-lg">
          <div className="flex flex-col items-center py-2"><User size={24} className="mb-2 text-blue-200" /><span className="font-bold">Clienti</span></div>
        </Card>
        <Card onClick={() => setView('reports')} className="bg-gradient-to-br from-purple-600 to-purple-700 border-none text-white shadow-lg">
          <div className="flex flex-col items-center py-2"><FileBarChart size={24} className="mb-2 text-purple-200" /><span className="font-bold">Report</span></div>
        </Card>
      </div>
      <div className="px-1">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 mt-4"><Flame size={18} className="text-orange-500" fill="currentColor" /> Lavori Prioritari</h3>
        {priorityJobsList.length === 0 ? (
          <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-slate-200"><CheckCircle2 size={32} className="mx-auto text-green-500 mb-2 opacity-50" /><p className="text-slate-400 text-sm">Nessuna emergenza.</p></div>
        ) : (
          <div className="space-y-3">
            {priorityJobsList.map(job => (
              <Card key={job.id} onClick={() => jumpToJob(job)} className="border-l-4 border-l-orange-500 bg-orange-50/50">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs text-slate-500 truncate max-w-[200px] font-medium">{job.clientName || 'Cliente'} • {job.siteName || 'Cantiere'}</span></div>
                    <h4 className="font-bold text-slate-800 leading-tight">{job.description}</h4>
                  </div>
                  <ChevronRight size={18} className="text-orange-300" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSettingsView = () => (
    <div className="space-y-6 pb-24 animate-in slide-in-from-right duration-200 bg-white min-h-screen">
      <div className="bg-slate-900 sticky top-0 z-10 p-4 border-b border-slate-800 flex items-center gap-3 text-white">
        <button onClick={() => navigateTo('dashboard')} className="p-2 -ml-2 hover:bg-slate-800 rounded-full"><ArrowLeft size={20} /></button>
        <h2 className="font-bold text-lg">Impostazioni</h2>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg mb-4 text-slate-800">Sicurezza</h3>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <label className="block text-sm font-medium text-slate-500 mb-2">Nuovo PIN Accesso</label>
          <div className="flex gap-2">
            <input type="text" pattern="[0-9]*" inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value)} className="flex-1 p-3 rounded-xl border border-slate-300 focus:border-blue-500 outline-none text-center tracking-widest text-lg" placeholder="####" />
            <Button onClick={handleChangePin}>Salva</Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Il PIN viene salvato solo su questo dispositivo.</p>
        </div>
      </div>
    </div>
  );

  const renderReportsView = () => {
    let filteredReportJobs = [];
    if (reportType === 'materials') filteredReportJobs = validJobs.filter(j => j.status === 'order_material');
    else if (reportType === 'quotes') filteredReportJobs = validJobs.filter(j => j.status === 'quote_needed');
    else if (reportType === 'active') filteredReportJobs = validJobs.filter(j => j.status !== 'done' && j.status !== 'cancelled');

    return (
      <div className="space-y-4 pb-24 animate-in slide-in-from-right duration-200 bg-white min-h-screen">
        <div className="bg-slate-900 sticky top-0 z-20 p-4 text-white flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => navigateTo('dashboard')} className="p-2 -ml-2 hover:bg-slate-800 rounded-full"><ArrowLeft size={20} /></button>
            <h2 className="font-bold text-lg">Reportistica</h2>
          </div>
          <button onClick={() => window.print()} className="p-2 bg-slate-800 rounded-full hover:text-blue-400"><Printer size={20} /></button>
        </div>
        <div className="px-4 print:p-0">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 print:hidden">
            <button onClick={() => setReportType('materials')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${reportType === 'materials' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>Materiali ({validJobs.filter(j => j.status === 'order_material').length})</button>
            <button onClick={() => setReportType('quotes')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${reportType === 'quotes' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>Preventivi ({validJobs.filter(j => j.status === 'quote_needed').length})</button>
            <button onClick={() => setReportType('active')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${reportType === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>Tutti Attivi ({validJobs.filter(j => j.status !== 'done' && j.status !== 'cancelled').length})</button>
          </div>
          <div className="space-y-4 print:space-y-2">
            <div className="hidden print:block mb-4 border-b pb-2">
              <h1 className="text-2xl font-bold text-black">{APP_NAME} Report</h1>
              <p className="text-sm text-gray-500">Generato il {new Date().toLocaleDateString()}</p>
              <p className="text-sm font-bold uppercase mt-2">{reportType === 'materials' ? 'Lista Materiali da Ordinare' : reportType === 'quotes' ? 'Lista Preventivi da Fare' : 'Lista Lavori Attivi'}</p>
            </div>
            {filteredReportJobs.length === 0 ? <div className="text-center py-10 text-slate-400">Nessun dato per questo report.</div> : 
              filteredReportJobs.map((job) => (
                <div key={job.id} className="bg-white border border-slate-200 rounded-xl p-4 print:border-black print:rounded-none print:border-0 print:border-b">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 print:text-black">{job.clientName || 'Cliente'} &bull; {job.siteName || 'Cantiere'}</div>
                    {job.isPriority && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold print:border print:border-black print:text-black">PRIORITARIO</span>}
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 leading-tight mb-2 print:text-black">{job.description}</h3>
                  {job.technicianNotes && <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 print:bg-transparent print:p-0 print:text-xs print:italic"><span className="font-bold text-xs block mb-1">NOTE:</span> {job.technicianNotes}</div>}
                  {job.offerRef && <div className="mt-2 text-xs font-mono bg-slate-100 inline-block px-2 py-1 rounded print:bg-transparent print:p-0">RIF: {job.offerRef}</div>}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    );
  };

  const renderClientsView = () => (
    <div className="space-y-4 pb-24 animate-in slide-in-from-right duration-200">
      <div className="bg-white sticky top-0 z-10 p-4 border-b border-slate-100 flex items-center gap-3">
        <button onClick={() => navigateTo('dashboard')} className="p-2 -ml-2 hover:bg-slate-50 rounded-full"><LayoutDashboard size={20} className="text-slate-600" /></button>
        <h2 className="font-bold text-lg text-slate-800">Lista Clienti</h2>
      </div>
      <div className="px-4 relative">
        <Search className="absolute left-7 top-3.5 text-slate-400" size={18} />
        <input type="text" placeholder="Cerca cliente..." className="w-full bg-slate-100 border-none rounded-xl py-3 pl-10 pr-4 text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all mb-4" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <div className="space-y-3">
          {filteredClients.map(client => (
            <Card key={client.id} onClick={() => navigateTo('sites', client)}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">{client.name.charAt(0).toUpperCase()}</div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800">{client.name}</h3>
                      {client.activeSites > 0 && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{client.activeSites} Attivi</span>}
                    </div>
                    {client.rankScore < 20000000000 && <span className="flex items-center gap-1 text-[10px] text-red-600 font-bold uppercase mt-0.5"><Flame size={10} fill="currentColor" /> Richiede Attenzione</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => handleEdit(client, e)} className="p-2 text-slate-300 hover:text-blue-500"><Pencil size={18} /></button>
                  <button onClick={(e) => requestDelete('clients', client.id, client.name, e)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
                  <ChevronRight className="text-slate-300" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div className="fixed bottom-6 right-6"><button onClick={() => { setFormData({}); setModalMode('add'); setIsModalOpen(true); }} className="bg-blue-600 text-white p-4 rounded-full shadow-lg shadow-blue-300 hover:bg-blue-700 transition-transform hover:scale-105 active:scale-95"><Plus size={24} /></button></div>
    </div>
  );

  const renderSitesView = () => (
    <div className="space-y-4 pb-24 animate-in slide-in-from-right duration-200">
      <div className="bg-white sticky top-0 z-10 p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateTo('clients')} className="p-2 -ml-2 hover:bg-slate-50 rounded-full"><ArrowLeft size={20} className="text-slate-600" /></button>
          <div className="overflow-hidden"><h2 className="font-bold text-lg text-slate-800 leading-tight">{selectedClient ? selectedClient.name : 'Tutti i Cantieri'}</h2><p className="text-xs text-slate-500">{selectedClient ? 'Seleziona Cantiere' : 'Lista ordinata per urgenza'}</p></div>
        </div>
        <button onClick={() => navigateTo('dashboard')} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-blue-600 transition-colors"><LayoutDashboard size={20} /></button>
      </div>
      <div className="px-4 space-y-3">
        <div className="relative mb-4">
           <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
           <input type="text" placeholder="Cerca cantiere..." className="w-full bg-slate-100 border-none rounded-xl py-3 pl-10 pr-4 text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {displayedSites.map(site => (
          <Card key={site.id} onClick={() => navigateTo('jobs', selectedClient, site)}>
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <div className="mt-1 bg-orange-100 p-2 rounded-lg text-orange-600 h-fit"><MapPin size={20} /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{site.name}</h3>
                    {site.activeJobs > 0 && <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{site.activeJobs} Attivi</span>}
                  </div>
                  {!selectedClient && site.clientName && <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">{site.clientName}</p>}
                  {site.rankScore < 20000000000 && <span className="flex items-center gap-1 text-[10px] text-red-600 font-bold uppercase mt-1"><Flame size={10} fill="currentColor" /> Urgente</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => handleEdit(site, e)} className="p-2 text-slate-300 hover:text-blue-500"><Pencil size={18} /></button>
                <button onClick={(e) => requestDelete('sites', site.id, site.name, e)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {selectedClient && <div className="fixed bottom-6 right-6"><button onClick={() => { setFormData({}); setModalMode('add'); setIsModalOpen(true); }} className="bg-orange-500 text-white p-4 rounded-full shadow-lg shadow-orange-200 hover:bg-orange-600 transition-transform hover:scale-105 active:scale-95"><Plus size={24} /></button></div>}
    </div>
  );

  const renderJobsView = () => (
    <div className="space-y-4 pb-24 animate-in slide-in-from-right duration-200">
      <div className="bg-white sticky top-0 z-10 p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => { if (selectedSite) { navigateTo('sites', selectedClient); } else { navigateTo('sites'); } }} className="p-2 -ml-2 hover:bg-slate-50 rounded-full"><ArrowLeft size={20} className="text-slate-600" /></button>
          <div className="overflow-hidden"><h2 className="font-bold text-lg text-slate-800 truncate">{selectedSite ? selectedSite.name : 'Tutti i Lavori'}</h2><p className="text-xs text-slate-500">{selectedSite ? 'Lavori da eseguire' : 'Ordinati per urgenza'}</p></div>
        </div>
        <button onClick={() => navigateTo('dashboard')} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-blue-600 transition-colors"><LayoutDashboard size={20} /></button>
      </div>
      <div className="px-4 space-y-3">
        <div className="relative mb-4">
           <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
           <input type="text" placeholder="Cerca lavoro..." className="w-full bg-slate-100 border-none rounded-xl py-3 pl-10 pr-4 text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {displayedJobs.map(job => {
          const status = STATUS_TYPES.find(s => s.id === job.status) || STATUS_TYPES.find(s => s.id === 'todo');
          const type = JOB_TYPES.find(t => t.id === job.type) || JOB_TYPES[3];
          return (
            <div key={job.id} className={`relative overflow-hidden rounded-2xl shadow-sm border p-4 transition-colors ${status.color}`}>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 font-medium text-sm opacity-90">{type.icon} <span>{type.label}</span></div>
                  <div className="relative z-10">
                    <select value={job.status} onChange={(e) => handleUpdateStatus(job.id, e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">{STATUS_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase cursor-pointer bg-white shadow-sm whitespace-nowrap text-slate-800">{status.icon} {status.label}</div>
                  </div>
                </div>
                <div className="z-0">
                  <h3 className="text-lg font-bold leading-tight">{job.description}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {job.isPriority && <span className="flex items-center gap-1 text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm"><Flame size={12} fill="currentColor" /> PRIORITARIO</span>}
                    {job.offerRef && <span className="flex items-center gap-1 text-xs bg-white px-2 py-0.5 rounded-full font-bold text-slate-700 shadow-sm"><Hash size={12} /> {job.offerRef}</span>}
                  </div>
                  {!selectedSite && <p className="text-xs opacity-75 mt-2 font-medium">{job.clientName ? `${job.clientName} > ` : ''} {job.siteName || 'Cantiere sconosciuto'}</p>}
                  {(job.startDate || job.endDate) && (
                    <div className="flex gap-3 mt-3 text-xs bg-white p-2 rounded-lg w-fit shadow-sm text-slate-600">
                      <div className="flex items-center gap-1"><CalendarDays size={14} className="text-slate-400" /><span>{job.startDate ? formatDate(job.startDate) : '---'}</span></div>
                      <ArrowLeft size={12} className="rotate-180 text-slate-300" />
                      <div className="flex items-center gap-1"><span>{job.endDate ? formatDate(job.endDate) : '---'}</span></div>
                    </div>
                  )}
                </div>
                {job.technicianNotes && <div className="bg-white/50 p-3 rounded-lg text-sm border border-white/40 mt-1 shadow-sm"><span className="font-bold text-xs opacity-60 block mb-1">NOTE TECNICHE:</span>{job.technicianNotes}</div>}
                <div className="flex justify-end pt-3 border-t border-black/10 mt-1">
                   <button onClick={(e) => handleEdit(job, e)} className="text-xs flex items-center gap-1 hover:opacity-100 opacity-70 mr-4 font-bold"><Pencil size={14} /> Modifica</button>
                   <button onClick={(e) => requestDelete('jobs', job.id, job.description, e)} className="text-xs flex items-center gap-1 hover:opacity-100 opacity-70 font-bold text-red-800"><Trash2 size={14} /> Elimina</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {selectedSite && <div className="fixed bottom-6 right-6"><button onClick={() => { setFormData({ status: 'todo', type: 'electric' }); setModalMode('add'); setIsModalOpen(true); }} className="bg-indigo-600 text-white p-4 rounded-full shadow-lg shadow-indigo-300 hover:bg-indigo-700 transition-transform hover:scale-105 active:scale-95"><Plus size={24} /></button></div>}
    </div>
  );

  const renderModalContent = () => (
    <div className="space-y-4 pt-2">
      {(view === 'dashboard' || view === 'clients') && <Input label="Nome Cliente" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Es. Rossi SRL" />}
      {view === 'sites' && <Input label="Nome Cantiere" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Es. Sede Principale" />}
      {view === 'jobs' && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {JOB_TYPES.map(t => <button key={t.id} onClick={() => setFormData({...formData, type: t.id})} className={`p-2 border rounded-lg text-xs flex flex-col items-center gap-1 ${formData.type === t.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'text-slate-500'}`}>{t.icon} {t.label}</button>)}
          </div>
          <div className="flex items-center gap-2 bg-red-50 p-3 rounded-xl border border-red-100">
             <input type="checkbox" id="priorityCheck" checked={formData.isPriority || false} onChange={e => setFormData({...formData, isPriority: e.target.checked})} className="w-5 h-5 text-red-600 rounded focus:ring-red-500" />
             <label htmlFor="priorityCheck" className="flex items-center gap-2 text-sm font-bold text-red-700"><Flame size={16} fill="currentColor" /> Contrassegna come Prioritario</label>
          </div>
          <Input label="Descrizione" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Es. Installazione..." />
          <Input label="Rif. Offerta" value={formData.offerRef || ''} onChange={e => setFormData({...formData, offerRef: e.target.value})} placeholder="Es. OFF-2024-001" />
          <div className="grid grid-cols-2 gap-3">
             <Input label="Inizio Lavori" type="date" value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})} />
             <Input label="Fine Lavori" type="date" value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})} />
          </div>
          <textarea className="w-full p-3 border rounded-xl bg-slate-50 text-sm h-24" placeholder="Note tecniche..." value={formData.technicianNotes || ''} onChange={e => setFormData({...formData, technicianNotes: e.target.value})} />
        </>
      )}
      <Button onClick={handleSave} className="w-full mt-4" disabled={isSaving}>{isSaving ? 'Salvataggio...' : 'Salva'}</Button>
    </div>
  );

  if (!user) return <div className="h-screen flex items-center justify-center text-slate-400 animate-pulse">Caricamento App...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-safe select-none">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl relative overflow-hidden">
        
        {/* Modale Inserimento / Modifica */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl">{modalMode === 'add' ? 'Aggiungi Nuovo' : 'Modifica'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full"><ArrowLeft size={20}/></button>
              </div>
              {renderModalContent()}
            </div>
          </div>
        )}

        {/* Modale Conferma Eliminazione */}
        {deleteConfirm.isOpen && (
          <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="bg-red-100 p-3 rounded-full mb-3 text-red-600">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="font-bold text-xl text-slate-900">Sei sicuro?</h3>
                <p className="text-slate-500 mt-2 text-sm">
                  Stai per eliminare <strong>{deleteConfirm.title}</strong>. Questa azione non può essere annullata.
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Annulla
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-4">
          {view === 'dashboard' && renderDashboardView()}
          {view === 'settings' && renderSettingsView()}
          {view === 'clients' && renderClientsView()}
          {view === 'sites' && renderSitesView()}
          {view === 'jobs' && renderJobsView()}
          {view === 'reports' && renderReportsView()}
        </div>
      </div>
    </div>
  );
}
