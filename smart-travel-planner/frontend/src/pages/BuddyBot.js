import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Send, Bot, User, Sparkles, 
  Calendar, Hotel, Wallet, CloudSun, FileText, 
  Utensils, MessageSquare 
} from 'lucide-react';
import api from '../utils/api';
import './BuddyBot.css';

const BuddyBot = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const predefinedQuestions = [
    { text: 'Best time to visit Hunza?', icon: Calendar },
    { text: 'Hotels in Swat Valley?', icon: Hotel },
    { text: 'Budget for Skardu trip?', icon: Wallet },
    { text: 'Weather in Fairy Meadows?', icon: CloudSun },
    { text: 'Travel requirements?', icon: FileText },
    { text: 'Local food recommendations?', icon: Utensils }
  ];

  useEffect(() => {
    fetchConversation();
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `**Hello! I'm your TravelBuddy.** I can help you plan your perfect Pakistan trip. Ask me about:
• Destination recommendations
• Accommodation options
• Budget planning
• Weather & Travel tips

*How can I assist you today?*`
      }]);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Improved Message Formatter for "Rich Text" look
  const formatMessage = (content) => {
    if (!content) return { __html: '' };
    
    let formatted = content;
    
    // 1. Headers (Day 1:, Morning:, etc.) -> Bold Gold Text
    formatted = formatted.replace(/(Day \d+:|Morning:|Afternoon:|Evening:|Night:)/g, '<strong class="bb-time-header">$1</strong>');
    
    // 2. Bold Text (**text**) -> Strong
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 3. Lists (• or -) -> Bullets
    formatted = formatted.replace(/^[•-]\s+(.*)$/gm, '<li class="bb-list-item">$1</li>');
    
    // 4. Line breaks
    formatted = formatted.replace(/\n/g, '<br />');

    return { __html: formatted };
  };

  const fetchConversation = async () => {
    try {
      const response = await api.get('/buddy-bot/conversation');
      if (response.data.messages?.length > 0) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const handlePredefinedQuestion = (text) => {
    setInput(text);
    handleSendMessage(text);
  };

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = messageText;
    setInput('');
    setLoading(true);

    // Optimistic UI Update
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await api.post('/buddy-bot/message', { message: userMessage });
      if (response.data?.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting right now. Please try again later." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className="bb-page">
      <div className="bb-overlay" />
      
      <div className="bb-shell">
        {/* HEADER */}
        <header className="bb-header">
          <button onClick={() => navigate('/dashboard')} className="bb-back-btn">
            <ArrowLeft size={18} /> Dashboard
          </button>
          <div className="bb-header-title">
            <h1>TravelBuddy AI</h1>
            <span className="bb-status-badge">
              <span className="bb-status-dot"></span> Online
            </span>
          </div>
        </header>

        <div className="bb-grid">
          {/* SIDEBAR (Quick Actions) */}
          <aside className="bb-sidebar">
            <div className="bb-assistant-card">
              <div className="bb-avatar-large">
                <Bot size={32} />
              </div>
              <h3>AI Concierge</h3>
              <p>Your 24/7 travel planner for Pakistan.</p>
            </div>

            <div className="bb-suggestions">
              <h4>Quick Questions</h4>
              <div className="bb-suggestions-list">
                {predefinedQuestions.map((q, idx) => (
                  <button 
                    key={idx} 
                    className="bb-suggestion-btn"
                    onClick={() => handlePredefinedQuestion(q.text)}
                    disabled={loading}
                  >
                    <q.icon size={16} className="bb-sugg-icon" />
                    <span>{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* CHAT AREA */}
          <main className="bb-chat-window">
            <div className="bb-messages-container">
              {messages.map((msg, index) => (
                <div key={index} className={`bb-message-row ${msg.role === 'user' ? 'bb-row-user' : 'bb-row-bot'}`}>
                  
                  {/* Avatar */}
                  <div className={`bb-message-avatar ${msg.role === 'user' ? 'bb-avatar-user' : 'bb-avatar-bot'}`}>
                    {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                  </div>

                  {/* Bubble */}
                  <div className={`bb-bubble ${msg.role === 'user' ? 'bb-bubble-user' : 'bb-bubble-bot'}`}>
                    <div 
                      className="bb-message-content"
                      dangerouslySetInnerHTML={msg.role === 'assistant' ? formatMessage(msg.content) : { __html: msg.content }}
                    />
                  </div>
                </div>
              ))}

              {/* Loading Indicator */}
              {loading && (
                <div className="bb-message-row bb-row-bot">
                  <div className="bb-message-avatar bb-avatar-bot">
                    <Bot size={18} />
                  </div>
                  <div className="bb-bubble bb-bubble-bot bb-loading-bubble">
                    <div className="bb-typing-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <form onSubmit={handleSend} className="bb-input-area">
              <div className="bb-input-wrapper">
                <div className="bb-input-icon">
                  <Sparkles size={20} />
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about destinations, budgets, or itineraries..."
                  disabled={loading}
                  className="bb-input-field"
                />
                <button type="submit" disabled={loading || !input.trim()} className="bb-send-btn">
                  <Send size={18} />
                </button>
              </div>
            </form>
          </main>
        </div>
      </div>
    </div>
  );
};

export default BuddyBot;