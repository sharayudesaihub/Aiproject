import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Send,
  Trash2, Bot, Clock, Sparkles, History,
  MessageCircle, Command
} from 'lucide-react';

interface RecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface RecognitionError {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: RecognitionError) => void) | null;
  start: () => void;
  stop: () => void;
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

interface HistoryItem {
  id: number;
  command: string;
  answer: string;
  time: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [input, setInput] = useState('');

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('alexa-history') || '[]');
    } catch {
      return [];
    }
  });

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const chatRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    localStorage.setItem('alexa-history', JSON.stringify(history));
  }, [history]);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const processCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;

    setIsProcessing(true);
    setTranscript(command);
    setResponse('');

    const messages: ChatMessage[] = [
      ...chatRef.current,
      { role: 'user' as const, content: command }
    ].slice(-20);

    let answer = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });

      const data = await res.json();
      if (!res.ok || !data.reply) throw new Error(data.error || 'No reply');

      answer = data.reply.trim();
      chatRef.current = [...messages, { role: 'assistant' as const, content: answer }];
    } catch (error) {
      console.error(error);
      answer =
        'Sorry, I could not reach my brain. Please check that the server is running and your API key is set.';
    }

    setResponse(answer);

    setHistory(prev => [
      {
        id: Date.now(),
        command,
        answer,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      },
      ...prev
    ].slice(0, 20));

    speak(answer);
    setIsProcessing(false);
  }, [speak]);

  useEffect(() => {
    const browserWindow = window as WindowWithSpeech;
    const SpeechRecognition =
      browserWindow.SpeechRecognition ||
      browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      processCommand(result);
    };

    recognition.onend = () => setIsListening(false);

    recognition.onerror = (event) => {
      setIsListening(false);

      const messages: Record<string, string> = {
        'not-allowed': 'Please allow microphone access in your browser.',
        'no-speech': 'I could not hear anything. Please try again.',
        'network': 'Network error. Please check your connection.',
        'audio-capture': 'No microphone was detected.'
      };

      setResponse(
        messages[event.error] || 'Something went wrong. Please try again.'
      );
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      window.speechSynthesis?.cancel();
    };
  }, [processCommand]);

  const startListening = () => {
    if (!recognitionRef.current || isListening) return;

    window.speechSynthesis?.cancel();
    setTranscript('');
    setResponse('');

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error(error);
      setResponse('Unable to start the microphone. Please try again.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const clearHistory = () => {
    setHistory([]);
    chatRef.current = [];
  };

  const submitCommand = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isProcessing) return;

    window.speechSynthesis.cancel();
    processCommand(input);
    setInput('');
  };

  const suggestions = [
    'Explain black holes simply',
    'Give me a healthy dinner idea',
    'Who invented the telephone?',
    'Translate "good morning" to Hindi',
    'Tell me a joke'
  ];

  return (
    <div className="min-h-screen bg-[#080d1a] text-white px-4 py-8">

      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <header className="flex items-center justify-between mb-12">

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-500/20">
              <Bot className="text-blue-400 w-8 h-8" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Mini <span className="text-blue-400">Alexa</span>
              </h1>
              <p className="text-xs text-slate-400">
                Your Personal Voice Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            <span className="text-sm text-slate-300">Online</span>
          </div>

        </header>

        {/* Main Assistant */}
        <main className="bg-[#111a2d] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl">

          <div className="text-center mb-10">

            <div className="flex justify-center mb-5">
              <div className="bg-blue-500/10 p-4 rounded-full">
                <Sparkles className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-3">
              How can I help you?
            </h2>

            <p className="text-slate-400">
              Ask me anything. Speak or type to get started.
            </p>

          </div>

          {/* Microphone */}
          <div className="flex flex-col items-center mb-10">

            <button
              onClick={isListening ? stopListening : startListening}
              disabled={!isSupported || isProcessing}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
              className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-40 ${
                isListening
                  ? 'bg-red-500 shadow-lg shadow-red-500/40 scale-110'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30 hover:scale-105'
              }`}
            >
              {isListening ? (
                <MicOff size={48} />
              ) : (
                <Mic size={48} />
              )}

              {isListening && (
                <span className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></span>
              )}
            </button>

            <p className="mt-5 text-sm text-blue-300">
              {isListening
                ? 'Listening to your voice...'
                : isProcessing
                  ? 'Thinking...'
                  : isSpeaking
                    ? 'Alexa is speaking...'
                    : 'Click microphone to speak'}
            </p>

          </div>

          {/* Browser support */}
          {isSupported === false && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-300 text-sm text-center">
              Speech recognition is not supported in this browser. Try Google Chrome.
            </div>
          )}

          {/* Text Input */}
          <form onSubmit={submitCommand} className="flex gap-2 mb-8">

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 min-w-0 bg-[#080d1a] border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-blue-500 text-white placeholder:text-slate-500"
            />

            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl px-5 transition"
            >
              <Send size={20} />
            </button>

          </form>

          {/* Conversation */}
          {(transcript || response || isProcessing) && (
            <div className="space-y-4 mb-8">

              {transcript && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <MessageCircle size={18} />
                    <span className="text-sm font-semibold">You said</span>
                  </div>
                  <p className="text-slate-200">{transcript}</p>
                </div>
              )}

              {(response || isProcessing) && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <Bot size={20} />
                    <span className="text-sm font-semibold">Mini Alexa</span>
                  </div>

                  <p className="text-slate-100 leading-relaxed">
                    {isProcessing ? 'Thinking...' : response}
                  </p>

                  {!isProcessing && (
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => speak(response)}
                        className="flex items-center gap-2 text-sm text-blue-300 hover:text-white"
                      >
                        <Volume2 size={17} /> Repeat
                      </button>

                      {isSpeaking && (
                        <button
                          onClick={stopSpeaking}
                          className="flex items-center gap-2 text-sm text-red-300"
                        >
                          <VolumeX size={17} /> Stop voice
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Suggestions */}
          <div>
            <h3 className="text-sm text-slate-400 mb-4 flex items-center gap-2">
              <Command size={16} />
              Try asking
            </h3>

            <div className="flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => processCommand(item)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-full text-sm bg-white/5 border border-white/10 text-slate-300 hover:bg-blue-500/20 hover:border-blue-400 transition disabled:opacity-40"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

        </main>

        {/* History */}
        <section className="mt-8 bg-[#111a2d] border border-white/10 rounded-3xl p-6">

          <div className="flex items-center justify-between mb-5">

            <h3 className="font-semibold flex items-center gap-2">
              <History className="text-blue-400" size={20} />
              Recent Commands
            </h3>

            <button
              onClick={clearHistory}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
            >
              <Trash2 size={16} /> Clear history
            </button>

          </div>

          {history.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">
              No commands yet. Start talking to Mini Alexa!
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 bg-white/5 rounded-xl p-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">
                      {item.command}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {item.answer}
                    </p>
                  </div>

                  <span className="text-xs text-slate-500 whitespace-nowrap flex items-center gap-1">
                    <Clock size={13} /> {item.time}
                  </span>
                </div>
              ))}
            </div>
          )}

        </section>

        <footer className="text-center mt-8 text-xs text-slate-500">
          Mini Alexa Voice Assistant • Built with React, TypeScript & Web Speech API
        </footer>

      </div>
    </div>
  );
}

export default App;