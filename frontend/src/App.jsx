import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Activity, ShieldAlert, CheckSquare, Presentation, 
  RefreshCw, LayoutGrid, Users, ArrowRight, Volume2, Home 
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import WaitingRoom from './components/WaitingRoom';

// Initialize Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [queueState, setQueueState] = useState({
    config: { averageConsultationTime: 10, lastTokenNumber: 0 },
    patients: []
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localIp, setLocalIp] = useState(window.location.hostname);

  // Compute workable waiting room URL for local LAN QR code scanning
  const workableUrl = (() => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal && localIp && localIp !== 'localhost' && localIp !== '127.0.0.1') {
      const port = window.location.port || '5000';
      return `http://${localIp}:${port}/waiting-room`;
    }
    return window.location.origin + '/waiting-room';
  })();

  // 1. History-based Path Routing Setup
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Helper properties mapper (Postgres snake_case to JS camelCase)
  const mapPatients = (rows) => {
    if (!rows) return [];
    return rows.map(r => ({
      _id: r.id,
      name: r.name,
      tokenNumber: r.token_number,
      status: r.status,
      createdAt: r.created_at,
      calledAt: r.called_at,
      completedAt: r.completed_at
    }));
  };

  const mapConfig = (row) => {
    if (!row) return { averageConsultationTime: 10, lastTokenNumber: 0 };
    return {
      averageConsultationTime: row.average_consultation_time || 10,
      lastTokenNumber: 0
    };
  };

  // 2. Fetch and Subscribe via Supabase Realtime
  const fetchQueueState = async (showSpinner = false) => {
    try {
      if (showSpinner) setIsLoading(true);
      
      // Fetch Patients
      const { data: patientRows, error: pError } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (pError) throw pError;

      // Fetch Config
      const { data: configRow, error: cError } = await supabase
        .from('queue_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (cError) throw cError;

      setQueueState({
        config: mapConfig(configRow),
        patients: mapPatients(patientRows)
      });
      setError(null);
    } catch (err) {
      console.error('Error loading Supabase data:', err);
      setError('Cannot connect to Supabase. Check VITE_SUPABASE_URL and database tables schema.');
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchQueueState(true);
    setIsConnected(true);

    // Fetch server local network IP address
    fetch('/api/local-ip')
      .then(res => res.json())
      .then(data => {
        if (data.ip) {
          setLocalIp(data.ip);
        }
      })
      .catch(err => console.log('Error fetching local IP:', err));

    // Setup Supabase Realtime channel subscriptions
    console.log('Subscribing to Supabase Realtime channel...');
    const channel = supabase
      .channel('public:queue_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        (payload) => {
          console.log('Realtime Patients update received:', payload);
          fetchQueueState(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_config' },
        (payload) => {
          console.log('Realtime Config update received:', payload);
          fetchQueueState(false);
        }
      )
      .subscribe((status) => {
        console.log('Supabase Channel Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Supabase Database Mutation Actions
  const handleAddPatient = async (name) => {
    try {
      // Find the maximum token number from current patients list to increment
      const maxToken = queueState.patients.reduce((max, p) => p.tokenNumber > max ? p.tokenNumber : max, 0);
      const nextTokenNumber = maxToken + 1;

      const { error } = await supabase
        .from('patients')
        .insert([{ name, status: 'waiting', token_number: nextTokenNumber }]);
        
      if (error) throw error;
    } catch (err) {
      alert(`Supabase Error: ${err.message}`);
    }
  };

  const handleCallNext = async () => {
    try {
      // 1. Complete currently serving patient
      const { error: completeError } = await supabase
        .from('patients')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('status', 'serving');

      if (completeError) throw completeError;

      // 2. Fetch the oldest waiting patient
      const { data: waitingList, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .eq('status', 'waiting')
        .order('token_number', { ascending: true })
        .limit(1);

      if (fetchError) throw fetchError;

      // 3. Mark patient as serving
      if (waitingList && waitingList.length > 0) {
        const nextPatient = waitingList[0];
        const { error: serveError } = await supabase
          .from('patients')
          .update({ status: 'serving', called_at: new Date().toISOString() })
          .eq('id', nextPatient.id);

        if (serveError) throw serveError;
      }
    } catch (err) {
      alert(`Supabase Error: ${err.message}`);
    }
  };

  const handleSkipPatient = async (id) => {
    try {
      const { error } = await supabase
        .from('patients')
        .update({ status: 'skipped', completed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      alert(`Supabase Error: ${err.message}`);
    }
  };

  const handleUpdateConfig = async (averageConsultationTime) => {
    try {
      const { error } = await supabase
        .from('queue_config')
        .update({ average_consultation_time: parseInt(averageConsultationTime) || 10 })
        .eq('id', 1);

      if (error) throw error;
    } catch (err) {
      alert(`Supabase Error: ${err.message}`);
    }
  };

  const handleResetQueue = async () => {
    try {
      // Delete all patients
      const { error: deleteError } = await supabase
        .from('patients')
        .delete()
        .neq('status', 'none'); // Deletes all rows since status is never 'none'

      if (deleteError) throw deleteError;
    } catch (err) {
      alert(`Supabase Error: ${err.message}`);
    }
  };

  // 3. Routing Switch
  const renderRouteContent = () => {
    if (currentPath === '/reception') {
      return (
        <Dashboard
          patients={queueState.patients}
          config={queueState.config}
          onAddPatient={handleAddPatient}
          onCallNext={handleCallNext}
          onSkipPatient={handleSkipPatient}
          onUpdateConfig={handleUpdateConfig}
          onResetQueue={handleResetQueue}
          workableUrl={workableUrl}
        />
      );
    }
    
    if (currentPath === '/waiting-room') {
      return (
        <WaitingRoom
          patients={queueState.patients}
          config={queueState.config}
          workableUrl={workableUrl}
        />
      );
    }

    // Default: Root Welcome Portal Page
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-10 animate-fade-in">
        <div className="space-y-4">
          <div className="inline-flex w-16 h-16 bg-brand-500 text-white rounded-2xl items-center justify-center shadow-md animate-bounce">
            <Activity className="w-9 h-9" />
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight font-display sm:text-5xl">
            Queue Cure Control Portal
          </h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto">
            Choose a screen to launch. For demonstrating live updates, we suggest opening both pages side-by-side.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          
          {/* Card: Receptionist view */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between items-center text-center hover:shadow-md transition duration-200">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center mx-auto shadow-xs">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-display">1. Receptionist Dashboard</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                Add patient records, call sequential token numbers, adjust average check-in durations, and manage skipped patients.
              </p>
            </div>
            <button
              onClick={() => navigateTo('/reception')}
              className="mt-6 w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
            >
              <span>Launch Reception View</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </button>
          </div>

          {/* Card: Waiting Room display */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between items-center text-center hover:shadow-md transition duration-200">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-brand-500 text-white rounded-xl flex items-center justify-center mx-auto shadow-xs">
                <Presentation className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-display">2. Patient Waiting Board</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                Display active serving tokens, dynamic queue wait estimations, upcoming patient codes, and voice announcements.
              </p>
            </div>
            <div className="w-full mt-6 flex flex-col gap-2">
              <button
                onClick={() => navigateTo('/waiting-room')}
                className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer"
              >
                <span>Launch Waiting Board</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
              <button
                onClick={() => window.open('/waiting-room', '_blank')}
                className="w-full py-2 px-4 border border-brand-100 hover:bg-brand-50 text-brand-700 rounded-xl text-[10px] font-semibold transition flex items-center justify-center cursor-pointer"
              >
                <span>Open in New Tab ↗</span>
              </button>
            </div>
          </div>

        </div>

        {/* Demo instructions */}
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 max-w-xl mx-auto flex items-center justify-between text-left text-xs text-slate-500">
          <div>
            <span className="font-bold text-slate-700 block">Supabase Integration Active:</span>
            <span>Real-time subscriptions synchronize insertions, completes, and skips instantly across all client tabs.</span>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* GLOBAL HEADER */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo brand */}
          <div className="flex items-center space-x-2.5 select-none cursor-pointer" onClick={() => navigateTo('/')}>
            <div className="w-9 h-9 bg-brand-500 text-white rounded-xl flex items-center justify-center shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-slate-800 text-base leading-none">Queue Cure</h1>
              <span className="text-[10px] font-semibold text-slate-400 mt-0.5 tracking-wider uppercase">Smart Clinic Queue</span>
            </div>
          </div>

          {/* Quick Route toggler / Navigation */}
          {currentPath !== '/' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateTo('/')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline-block">Portal Home</span>
              </button>
              
              <button
                onClick={() => navigateTo(currentPath === '/reception' ? '/waiting-room' : '/reception')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                {currentPath === '/reception' ? (
                  <>
                    <Presentation className="w-3.5 h-3.5" />
                    <span>Go to Waiting Board</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Go to Reception</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Connection Status Badge */}
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline-block">
              {isConnected ? 'Supabase Connected' : 'Offline'}
            </span>
          </div>

        </div>
      </header>

      {/* ERROR / WARNING ALERTS */}
      {error && (
        <div className="bg-rose-50 border-b border-rose-100 py-3 px-4 text-center text-xs font-semibold text-rose-700 flex items-center justify-center space-x-2 animate-fade-in">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>{error}</span>
          <button 
            onClick={() => window.location.reload()} 
            className="underline ml-2 flex items-center hover:text-rose-950 font-bold"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry Connection
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="mt-4 text-sm font-semibold">Loading Clinic Database...</span>
          </div>
        ) : (
          renderRouteContent()
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-150 py-5 text-center text-[10px] text-slate-400">
        <span>© {new Date().getFullYear()} Queue Cure. Built for premium clinical patient experience.</span>
      </footer>

    </div>
  );
}
