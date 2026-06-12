import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Users, Clock, ArrowRight, Activity, Calendar, Award, CheckCircle2 } from 'lucide-react';

export default function WaitingRoom({ patients, config, workableUrl }) {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isFlashing, setIsFlashing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const prevServingTokenRef = useRef(null);

  // Live clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const waitingPatients = patients.filter(p => p.status === 'waiting');
  const servingPatient = patients.find(p => p.status === 'serving');
  const completedPatients = patients.filter(p => p.status === 'completed');
  
  // Calculate average consultation time and estimations
  const averageTime = config.averageConsultationTime || 10;
  const totalWaitingTime = waitingPatients.length * averageTime;
  const totalRegistered = patients.length;
  
  // Live Progress Ratio
  const progressPercentage = totalRegistered > 0 
    ? Math.round((completedPatients.length / totalRegistered) * 100) 
    : 0;

  // Flash highlight effect when the serving token changes
  useEffect(() => {
    if (servingPatient) {
      const currentToken = servingPatient.tokenNumber;
      if (prevServingTokenRef.current !== currentToken) {
        // Trigger highlight flash
        setIsFlashing(true);
        const timer = setTimeout(() => setIsFlashing(false), 1200);

        // Trigger voice synthesis if enabled
        if (voiceEnabled) {
          announceToken(servingPatient);
        }
        
        prevServingTokenRef.current = currentToken;
        return () => clearTimeout(timer);
      }
    } else {
      prevServingTokenRef.current = null;
    }
  }, [servingPatient, voiceEnabled]);

  const announceToken = (patient) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `Token number ${patient.tokenNumber}, ${patient.name}. Please proceed to the consultation room.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.includes('en-US') || v.lang.includes('en-GB'));
      if (preferredVoice) utterance.voice = preferredVoice;
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Wait Severity Tag
  const getWaitSeverity = (minutes) => {
    if (minutes <= 30) return { color: 'text-emerald-700 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500', text: 'Normal Wait' };
    if (minutes <= 60) return { color: 'text-amber-705 bg-amber-50 border-amber-100', dot: 'bg-amber-500', text: 'Moderate Wait' };
    return { color: 'text-rose-700 bg-rose-50 border-rose-100', dot: 'bg-rose-500', text: 'Long Wait' };
  };
  const waitSeverity = getWaitSeverity(totalWaitingTime);

  return (
    <div className="space-y-6 animate-fade-in px-2 sm:px-0">
      
      {/* 1. PUBLIC SCREEN HEADER BAR */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500 rounded-full blur-[120px] opacity-25 -z-0"></div>
        
        <div className="z-10 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
            <Activity className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl tracking-tight">Clinic Queue Board</h2>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Real-time patient waiting display</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          {/* Voice toggle button */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-semibold border transition duration-150 cursor-pointer ${
              voiceEnabled 
                ? 'bg-brand-500/10 border-brand-500/30 text-brand-400 hover:bg-brand-500/20' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
            }`}
          >
            {voiceEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-brand-400 animate-bounce" />
                <span>Voice Enabled</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span>Voice Muted</span>
              </>
            )}
          </button>
          
          <div className="text-slate-400 text-[10px] sm:text-xs flex items-center bg-slate-800/50 px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-800">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            <span>Today's Board</span>
          </div>
        </div>
      </div>

      {/* 2. LIVE PROGRESS BAR BAR */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-3">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-brand-500" />
            <span className="font-bold text-slate-700">Clinic Service Progress</span>
          </div>
          <span className="font-semibold text-slate-400">
            {completedPatients.length} of {totalRegistered} patients served ({progressPercentage}%)
          </span>
        </div>
        
        {/* Progress tracks bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* 3. MAIN DISPLAY - MOBILE-FIRST STACK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* NOW SERVING TICKET-STYLE CARD */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col justify-between min-h-[420px]">
          
          {/* Card header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">
              Active Call Counter
            </span>
            <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Serving Live</span>
            </div>
          </div>

          {/* Persistent Doctor, Room, and Live Clock Header */}
          <div className="p-6 border-b border-slate-100/50 bg-slate-50/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
                </span>
                <span className="font-bold text-slate-800 text-sm">Dr. Evelyn Vance</span>
                <span className="text-[10px] bg-slate-200 text-slate-655 font-extrabold px-2.5 py-0.5 rounded-full select-none">
                  Room 101
                </span>
              </div>
              <div className="flex items-center space-x-2 text-slate-500 font-mono font-bold text-xs bg-white border border-slate-150 px-3 py-1.5 rounded-xl shadow-3xs w-fit select-none">
                <Clock className="w-4 h-4 text-brand-500 animate-pulse" />
                <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>

            {/* In-Card Session Progress Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 font-bold uppercase tracking-wider">
                <span>Session Completion</span>
                <span className="text-slate-600 font-semibold">{completedPatients.length} / {totalRegistered} Patients ({progressPercentage}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-150/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-700 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Ticket Body Content */}
          <div className={`p-8 my-auto flex flex-col items-center justify-center text-center transition-all duration-300 ${
            isFlashing 
              ? 'bg-brand-50/40 scale-[1.01] ring-2 ring-brand-400' 
              : ''
          }`}>
            
            {servingPatient ? (
              <div className="space-y-4 w-full max-w-md">
                
                {/* Animated Status Alert */}
                <div className="text-center font-display text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center justify-center space-x-1.5 py-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Now Consulting</span>
                </div>

                {/* Physical ticket visual styling */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative shadow-xs">
                  {/* Left and Right punches */}
                  <div className="absolute top-1/2 -left-3.5 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-r border-slate-200"></div>
                  <div className="absolute top-1/2 -right-3.5 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-l border-slate-200"></div>
                  
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Ticket Code</span>
                  <div className="text-6xl sm:text-7xl lg:text-8xl font-black text-brand-500 font-display mt-2 leading-none">
                    {String(servingPatient.tokenNumber).padStart(3, '0')}
                  </div>
                  
                  {/* Faux Barcode decoration */}
                  <div className="mt-5 flex items-center justify-center space-x-0.5 opacity-60">
                    {[3, 1, 4, 2, 5, 1, 3, 2, 4, 1, 6, 2, 3, 1, 4].map((h, i) => (
                      <div key={i} className="bg-slate-800 rounded-xs" style={{ width: `${h}px`, height: '24px' }}></div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                    {servingPatient.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Please proceed to the consultation room
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-10">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-350">
                  <Activity className="w-8 h-8 stroke-1 animate-pulse" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-400">Waiting for first call</h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
                  The clinic queue has not started yet. New tokens will light up here instantly.
                </p>
              </div>
            )}
          </div>

          {/* Ticket Footer details */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
            <span className="flex items-center">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mr-2"></span>
              Socket.IO Live Updates Connected
            </span>
            <span className="font-semibold text-slate-400 select-none">ID: QC-TICKET-SYS</span>
          </div>

        </div>

        {/* STATS & UPCOMING QUEUE LIST */}
        <div className="space-y-6">
          
          {/* Detailed wait time estimations */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-800 text-sm">Estimated Waiting Time</h4>
              <span className={`inline-flex items-center space-x-1.5 text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${waitSeverity.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${waitSeverity.dot} animate-pulse`}></span>
                <span>{waitSeverity.text}</span>
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wide">Patients Ahead</span>
                <span className="text-xl sm:text-2xl font-black text-slate-800 font-display mt-1 flex items-center">
                  <Users className="w-5 h-5 mr-1.5 text-brand-500" />
                  {waitingPatients.length}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 flex flex-col justify-between">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wide">Total Estimated Wait</span>
                <span className="text-xl sm:text-2xl font-black text-slate-800 font-display mt-1 flex items-center">
                  <Clock className="w-5 h-5 mr-1.5 text-cyan-600 animate-pulse" />
                  {totalWaitingTime}m
                </span>
              </div>
            </div>

            {/* Waiting Math explanation */}
            <div className="bg-brand-50/30 border border-brand-100/50 rounded-xl p-3 text-[10px] text-slate-500 flex items-center space-x-2">
              <Award className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span>
                Calculation: <span className="font-bold">{waitingPatients.length} patients ahead</span> × <span className="font-bold">{averageTime} mins avg</span> = <span className="font-bold">{totalWaitingTime} mins total</span>.
              </span>
            </div>
          </div>

          {/* Upcoming list */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col min-h-[260px]">
            <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Upcoming Tokens</h4>
            
            <div className="mt-3 flex-1 overflow-y-auto space-y-2">
              {waitingPatients.length > 0 ? (
                waitingPatients.slice(0, 5).map((patient, index) => {
                  const ahead = index;
                  const patientWaitTime = ahead * averageTime;
                  return (
                    <div 
                      key={patient._id} 
                      className={`p-3 rounded-xl border border-slate-100 flex items-center justify-between text-sm transition hover:border-brand-200 animate-fade-in ${
                        index === 0 ? 'bg-brand-50/20 border-brand-100' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-semibold text-sm ${
                          index === 0 ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {String(patient.tokenNumber).padStart(3, '0')}
                        </span>
                        <div>
                          <h4 className="font-semibold text-slate-800 text-xs">{patient.name}</h4>
                          <span className="text-[9px] font-semibold text-brand-600 flex items-center mt-0.5">
                            {ahead === 0 ? 'Calling Next' : `${ahead} tokens ahead`}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-700 block">{patientWaitTime} mins</span>
                        <span className="text-[9px] text-slate-400">est. wait</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-14 text-slate-350 text-xs text-center">
                  <span>No upcoming tokens</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Queue is currently clear!</span>
                </div>
              )}
            </div>
            
            {waitingPatients.length > 5 && (
              <div className="text-center pt-3 text-[10px] font-semibold text-brand-600 flex items-center justify-center">
                <span>+ {waitingPatients.length - 5} more in queue</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            )}
          </div>

          {/* Mobile Queue Tracker (QR Code) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-3">
            <span className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 w-full">Mobile Queue Tracker</span>
            <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-2xl shadow-3xs">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(workableUrl)}`}
                alt="Scan QR Code"
                className="w-28 h-28 mix-blend-multiply animate-fade-in"
                loading="lazy"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-[200px]">
              Scan this QR code to track your queue status live on your phone.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
