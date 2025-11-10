import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        setTranscript(speechResult);
        processCommand(speechResult);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setResponse('Sorry, I had trouble hearing that.');
      };
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setResponse('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const processCommand = (command: string) => {
    setIsProcessing(true);
    const lowerCommand = command.toLowerCase();
    let responseText = '';

    if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
      responseText = 'Hello! How can I help you today?';
    } else if (lowerCommand.includes('time')) {
      const currentTime = new Date().toLocaleTimeString();
      responseText = `The current time is ${currentTime}`;
    } else if (lowerCommand.includes('date')) {
      const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      responseText = `Today is ${currentDate}`;
    } else if (lowerCommand.includes('weather')) {
      responseText = 'I\'m sorry, I don\'t have access to weather data right now.';
    } else if (lowerCommand.includes('joke')) {
      const jokes = [
        'Why did the scarecrow win an award? Because he was outstanding in his field!',
        'What do you call a bear with no teeth? A gummy bear!',
        'Why don\'t scientists trust atoms? Because they make up everything!'
      ];
      responseText = jokes[Math.floor(Math.random() * jokes.length)];
    } else if (lowerCommand.includes('name')) {
      responseText = 'I am your voice assistant, similar to Alexa but running in your browser!';
    } else {
      responseText = `You said: ${command}. I\'m still learning, so I might not understand everything yet.`;
    }

    setResponse(responseText);
    speak(responseText);
    setIsProcessing(false);
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Voice Assistant</h1>
            <p className="text-slate-300">Click the microphone and speak</p>
          </div>

          <div className="flex justify-center mb-8">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
              className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-red-500 shadow-lg shadow-red-500/50 animate-pulse'
                  : 'bg-blue-500 shadow-lg shadow-blue-500/50 hover:bg-blue-600'
              }`}
            >
              {isListening ? (
                <MicOff className="w-16 h-16 text-white" />
              ) : (
                <Mic className="w-16 h-16 text-white" />
              )}
              {isListening && (
                <span className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"></span>
              )}
            </button>
          </div>

          {isListening && (
            <div className="text-center mb-4">
              <p className="text-white text-lg font-medium">Listening...</p>
            </div>
          )}

          {transcript && (
            <div className="bg-white/5 rounded-2xl p-6 mb-4 border border-white/10">
              <div className="flex items-start gap-3">
                <Mic className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-slate-400 text-sm mb-1">You said:</p>
                  <p className="text-white text-lg">{transcript}</p>
                </div>
              </div>
            </div>
          )}

          {response && (
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <div className="flex items-start gap-3">
                <Volume2 className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-slate-400 text-sm mb-1">Assistant:</p>
                  <p className="text-white text-lg">{response}</p>
                </div>
              </div>
            </div>
          )}

          {!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
              <p className="text-red-300">Speech recognition is not supported in your browser.</p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm mb-3">Try saying:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Hello', 'What time is it?', 'What\'s the date?', 'Tell me a joke', 'What\'s your name?'].map((suggestion) => (
              <span key={suggestion} className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-slate-300 text-sm">
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
