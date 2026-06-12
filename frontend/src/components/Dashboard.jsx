import React, { useState } from 'react';
import { 
  UserPlus, Play, RotateCcw, Clock, AlertTriangle, 
  CheckCircle, Users, EyeOff, Search, Sparkles, UserCheck, HelpCircle
} from 'lucide-react';

export default function Dashboard({ patients, config, onAddPatient, onCallNext, onSkipPatient, onUpdateConfig, onResetQueue, workableUrl }) {
  const [newPatientName, setNewPatientName] = useState('');
  const [tempConsultationTime, setTempConsultationTime] = useState(config.averageConsultationTime || 10);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // New States: Search and Skip Confirmation
  const [searchTerm, setSearchTerm] = useState('');
  const [patientToSkip, setPatientToSkip] = useState(null);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    onAddPatient(newPatientName.trim());
    setNewPatientName('');
  };

  const saveConfig = (e) => {
    e.preventDefault();
    onUpdateConfig(tempConsultationTime);
  };

  // Filter queue lists
  const waitingPatients = patients.filter(p => p.status === 'waiting');
  const servingPatient = patients.find(p => p.status === 'serving');
  const finishedPatients = patients.filter(p => p.status === 'completed' || p.status === 'skipped');

  // Search filter
  const filteredWaitingPatients = waitingPatients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(p.tokenNumber).includes(searchTerm)
  );

  // Compute Analytics
  const totalRegistered = patients.length;
  const waitingCount = waitingPatients.length;
  const completedCount = patients.filter(p => p.status === 'completed').length;
  const skippedCount = patients.filter(p => p.status === 'skipped').length;
  
  // Calculate average wait time (from registration to being called)
  const servedPatients = patients.filter(p => (p.status === 'completed' || p.status === 'serving') && p.calledAt);
  const totalWaitTimeMs = servedPatients.reduce((sum, p) => {
    const waitMs = new Date(p.calledAt) - new Date(p.createdAt);
    return sum + (waitMs > 0 ? waitMs : 0);
  }, 0);
  const avgWaitTimeMins = servedPatients.length > 0 
    ? Math.round(totalWaitTimeMs / (servedPatients.length * 60000)) 
    : 0;

  // Calculate skip rate
  const skipRate = totalRegistered > 0 
    ? Math.round((skippedCount / totalRegistered) * 100) 
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. ANALYTICS CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Patients Today Card */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Patients Today</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black text-slate-800 font-display">{totalRegistered}</span>
              <span className="text-xs font-medium text-slate-400">registered</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Waiting Card */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Waiting</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black text-slate-800 font-display">{waitingCount}</span>
              <span className="text-xs font-medium text-slate-400">in queue</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Serving Card */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Serving</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black text-slate-800 font-display">{servingPatient ? 1 : 0}</span>
              <span className="text-xs font-medium text-slate-400">active</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
            <UserCheck className="w-6 h-6 animate-bounce" />
          </div>
        </div>

        {/* Completed Card */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Completed</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-3xl font-black text-slate-800 font-display">{completedCount}</span>
              <span className="text-xs font-medium text-slate-400">consulted</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. MAIN REGISTRATION AND CONTROLS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Serving Panel */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50 rounded-bl-full -z-0 opacity-50"></div>
          <div className="z-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Consultation</span>
            <div className="mt-2 flex items-center space-x-4">
              {servingPatient ? (
                <>
                  <div className="w-14 h-14 bg-brand-500 text-white rounded-xl flex items-center justify-center font-display text-2xl font-bold pulse-ring">
                    {String(servingPatient.tokenNumber).padStart(3, '0')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800">{servingPatient.name}</h3>
                    <p className="text-xs text-brand-600 flex items-center mt-0.5">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      Started {new Date(servingPatient.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-2 text-slate-400 font-medium text-sm flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                  <span>No active consultation</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 z-10">
            <button 
              onClick={onCallNext}
              disabled={waitingPatients.length === 0}
              className="w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:opacity-55 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-semibold transition duration-150 flex items-center justify-center shadow-xs hover:shadow-sm cursor-pointer"
            >
              <Play className="w-4 h-4 mr-2 fill-current" />
              Call Next Patient
            </button>
          </div>
        </div>

        {/* Quick Add Patient */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Register Patient</span>
            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3">
              <input
                type="text"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                placeholder="Patient's Full Name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm transition"
              />
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 rounded-xl font-semibold transition flex items-center justify-center text-sm cursor-pointer"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add to Queue
              </button>
            </form>
          </div>
        </div>

        {/* Set Consultation Time */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Consultation Settings</span>
            <form onSubmit={saveConfig} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Average Consultation (Minutes)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={tempConsultationTime}
                    onChange={(e) => setTempConsultationTime(parseInt(e.target.value) || 10)}
                    className="w-full pl-4 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm transition"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                    mins
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-brand-50 hover:bg-brand-100 text-brand-700 py-2.5 px-4 rounded-xl font-semibold transition text-sm flex items-center justify-center cursor-pointer"
              >
                <Clock className="w-4 h-4 mr-2" />
                Save Settings
              </button>
            </form>
          </div>
        </div>

        {/* Live Waiting Room QR Code */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between items-center text-center">
          <div className="w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">Live Waiting Room QR</span>
            <div className="p-2 bg-slate-50 border border-slate-150 rounded-2xl shadow-3xs inline-block">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(workableUrl)}`}
                alt="Scan Live Queue QR"
                className="w-24 h-24 mix-blend-multiply"
                loading="lazy"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium leading-normal mt-3 max-w-[170px]">
            Scan this QR code at the desk to view the live waiting room on your mobile device.
          </p>
        </div>
      </div>

      {/* 3. MAIN QUEUE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Waiting List Card with Search */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          
          {/* Header & Search Bar */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Waiting Queue</h3>
              <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                <span>{waitingCount} total waiting</span>
                <span className="text-slate-300">•</span>
                <span>{filteredWaitingPatients.length} shown</span>
                <span className="text-slate-300">•</span>
                <span className="text-brand-600 font-semibold">Avg Wait: {avgWaitTimeMins}m</span>
                <span className="text-slate-300">•</span>
                <span className="text-rose-605 font-semibold">Skip Rate: {skipRate}%</span>
              </p>
            </div>
            
            {/* Search Input Box */}
            <div className="relative max-w-xs w-full">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search patient name..."
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-2 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Queue Table with Empty Handling */}
          <div className="overflow-x-auto flex-1 min-h-[350px]">
            {waitingPatients.length === 0 ? (
              /* PREMIUM EMPTY QUEUE STATE */
              <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center text-brand-500 mb-4 animate-pulse">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800 text-base">Queue is Empty</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  There are no patients currently waiting in line. Enter a patient name in the settings above to create a token.
                </p>
                <div className="mt-4 text-xs font-semibold text-brand-600 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  Avg wait time is currently {avgWaitTimeMins} minutes.
                </div>
              </div>
            ) : filteredWaitingPatients.length === 0 ? (
              /* SEARCH EMPTY STATE */
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-12 h-12 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-center text-slate-350 mb-3">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-slate-700 text-sm">No Search Matches</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  No patient matches found for "<span className="font-semibold">{searchTerm}</span>".
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-3 text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer"
                >
                  Clear search query
                </button>
              </div>
            ) : (
              /* PATIENT TABLE */
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-6">Token</th>
                    <th className="py-3 px-6">Patient Name</th>
                    <th className="py-3 px-6">Registered Time</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWaitingPatients.map((patient) => {
                    const elapsed = Math.round((new Date() - new Date(patient.createdAt)) / 60000);
                    return (
                      <tr key={patient._id} className="hover:bg-slate-50/50 transition duration-150 animate-fade-in">
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold font-display">
                            {String(patient.tokenNumber).padStart(3, '0')}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-700 text-sm">{patient.name}</td>
                        <td className="py-4 px-6 text-xs text-slate-400">
                          {new Date(patient.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {elapsed > 0 && <span className="ml-1.5 text-brand-600">({elapsed}m ago)</span>}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => setPatientToSkip(patient)}
                            className="inline-flex items-center text-xs text-rose-600 hover:text-white border border-rose-100 hover:bg-rose-500 rounded-lg px-2.5 py-1.5 font-semibold transition cursor-pointer"
                            title="Mark patient as skipped"
                          >
                            <EyeOff className="w-3.5 h-3.5 mr-1" />
                            Skip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* History Log Board */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Daily Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">Completed and skipped records</p>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-xs font-semibold text-slate-400 hover:text-rose-600 flex items-center transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Queue
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[350px] space-y-3">
            {finishedPatients.length > 0 ? (
              [...finishedPatients].reverse().map((patient) => (
                <div 
                  key={patient._id} 
                  className={`p-3 rounded-xl border flex items-center justify-between text-sm ${
                    patient.status === 'completed' 
                      ? 'bg-emerald-50/40 border-emerald-100/50' 
                      : 'bg-rose-50/40 border-rose-100/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-semibold text-sm ${
                      patient.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {String(patient.tokenNumber).padStart(3, '0')}
                    </span>
                    <div>
                      <h4 className="font-medium text-slate-700 leading-tight">{patient.name}</h4>
                      <span className="text-[10px] text-slate-400">
                        Log: {patient.completedAt ? new Date(patient.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    patient.status === 'completed'
                      ? 'bg-emerald-200/50 text-emerald-800'
                      : 'bg-rose-200/50 text-rose-800'
                  }`}>
                    {patient.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs text-center">
                <UserCheck className="w-8 h-8 text-slate-350 stroke-1 mb-1.5" />
                <span>No logs recorded for today yet.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. MODALS */}

      {/* Confirmation skip modal */}
      {patientToSkip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 animate-slide-up">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 text-rose-600 mb-4 mx-auto">
              <EyeOff className="w-6 h-6" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Skip Patient?</h3>
            <p className="text-center text-slate-500 text-sm mt-2">
              Are you sure you want to skip **{patientToSkip.name}** (Token {String(patientToSkip.tokenNumber).padStart(3, '0')})? 
              This will remove them from the queue and log them as skipped.
            </p>
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => setPatientToSkip(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold transition text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onSkipPatient(patientToSkip._id);
                  setPatientToSkip(null);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold transition text-sm cursor-pointer"
              >
                Yes, Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Overlay */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 animate-slide-up">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 text-rose-600 mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-800">Reset Entire Queue?</h3>
            <p className="text-center text-slate-500 text-sm mt-2">
              This will permanently delete all patient logs, waiting lists, and reset the token numbering back to 0. This cannot be undone.
            </p>
            <div className="flex items-center space-x-3 mt-6">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold transition text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onResetQueue();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold transition text-sm cursor-pointer"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
