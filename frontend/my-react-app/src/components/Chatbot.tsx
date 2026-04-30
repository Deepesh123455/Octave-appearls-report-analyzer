import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Bot, User, Loader2, Minimize2, Trash2 } from 'lucide-react';
import { askChatbot } from '../api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  // Initialize from sessionStorage or default welcome message
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = sessionStorage.getItem('File_Mind');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [
      { role: 'assistant', content: "Hello! I'm FileMind, your AI SCM assistant. How can I help you analyze your inventory today?" }
    ];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    // Persist last 10 messages to sessionStorage
    const historyToSave = messages.slice(-10);
    sessionStorage.setItem('File_Mind', JSON.stringify(historyToSave));
  }, [messages]);

  const clearChat = () => {
    const welcomeMessage: Message[] = [
      { role: 'assistant', content: "Hello! I'm FileMind, your AI SCM assistant. How can I help you analyze your inventory today?" }
    ];
    setMessages(welcomeMessage);
    sessionStorage.removeItem('File_Mind');
    setShowClearConfirm(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {

      const history = messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
      const response = await askChatbot(userMessage, history);

      if (response.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data }]);
      } else {
        throw new Error(response.message || 'Unknown server error.');
      }
    } catch (error: any) {
      console.error('Chatbot Error:', error);
      const errMsg = error?.response?.data?.message || error?.message || 'Unknown error.';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${errMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    const result: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      const isListItem = line.trim().startsWith('- ') || line.trim().startsWith('* ');

      if (isListItem) {
        const itemContent = line.trim().substring(2);
        currentList.push(<li key={`li-${idx}`}>{formatBold(itemContent)}</li>);
      } else {
        if (currentList.length > 0) {
          result.push(<ul key={`ul-${idx}`}>{currentList}</ul>);
          currentList = [];
        }
        if (line.trim()) {
          result.push(<p key={`p-${idx}`}>{formatBold(line)}</p>);
        }
      }
    });

    if (currentList.length > 0) {
      result.push(<ul key="ul-final">{currentList}</ul>);
    }

    return result;
  };

  const formatBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.substring(2, part.length - 2)}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="chatbot-fab"
        >
          <MessageSquare size={20} />
          <span className="fab-label">FileMind</span>
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="chatbot-window"
          >
            {/* Header */}
            <div className="chatbot-header">
              <div className="header-info">
                <div className="bot-avatar">
                  <Bot size={20} />
                  <div className="online-indicator" />
                </div>
                <div>
                  <h3>FileMind</h3>
                  <p>AI Retail Intelligence</p>
                </div>
              </div>
              <div className="header-actions">
                <button
                  className="header-btn clear-btn"
                  onClick={() => setShowClearConfirm(true)}
                  title="Clear Conversation"
                >
                  <Trash2 size={16} />
                </button>
                <button className="header-btn" onClick={() => setIsOpen(false)}>
                  <Minimize2 size={18} />
                </button>
              </div>
            </div>

            {/* Confirmation Overlay */}
            <AnimatePresence>
              {showClearConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="clear-confirm-overlay"
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    className="confirm-card"
                  >
                    <Trash2 size={24} className="confirm-icon" />
                    <h4>Clear Conversation?</h4>
                    <p>This will permanently delete your current chat history.</p>
                    <div className="confirm-actions">
                      <button className="confirm-btn cancel" onClick={() => setShowClearConfirm(false)}>
                        Keep Chat
                      </button>
                      <button className="confirm-btn delete" onClick={clearChat}>
                        Clear All
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="chatbot-messages">
              {messages.map((msg, idx) => (
                <div key={idx} className={`message-wrapper ${msg.role}`}>
                  <div className="message-icon">
                    {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                  </div>
                  <div className="message-content">
                    {renderFormattedContent(msg.content)}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message-wrapper assistant">
                  <div className="message-icon">
                    <Bot size={14} />
                  </div>
                  <div className="message-content loading">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chatbot-input-area">
              <input
                type="text"
                placeholder="Ask about SKU velocity, store stock..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend} disabled={!input.trim() || isLoading}>
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
