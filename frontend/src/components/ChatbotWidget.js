import React, { useEffect, useRef, useState } from 'react';
import { sendChatbotMessage } from '../services/api';
import './ChatbotWidget.css';

const quickPrompts = [
  'Summarize dashboard metrics',
  'Show latest claims',
  'Show denials',
  'What can this app do?',
];

function actionLabel(call) {
  const verb = call.method === 'POST' ? 'Created' : call.method === 'GET' ? 'Viewed' : call.method === 'GUIDE' ? 'Guided' : 'Used';
  return `${verb} ${call.resource || 'App Module'}`;
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ask me about any app module: claims, denials, payments, patients, integrations, gaps, analytics, or creating records.',
      calls: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  const submit = async (event, forcedText) => {
    event?.preventDefault();
    const text = (forcedText || input).trim();
    if (!text || loading) return;

    setOpen(true);
    setInput('');
    setError('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: text, calls: [] }]);

    try {
      const res = await sendChatbotMessage(text);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.answer,
          calls: res.data.calls || [],
        },
      ]);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Chatbot request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className={`chatbot-widget-trigger ${open ? 'is-open' : ''}`}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-label={open ? 'Close app chatbot' : 'Open app chatbot'}
      >
        <span>{open ? 'x' : '?'}</span>
      </button>

      {open && (
        <div className="chatbot-widget-panel">
          <div className="chatbot-widget-header">
            <div>
              <h3>App Chatbot</h3>
              <p>Works across app modules</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chatbot">x</button>
          </div>

          <div className="chatbot-widget-quick">
            {quickPrompts.map(prompt => (
              <button key={prompt} type="button" onClick={(event) => submit(event, prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="chatbot-widget-messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`chatbot-widget-message ${message.role}`}>
                <div className="chatbot-widget-bubble">
                  <div className="chatbot-widget-role">{message.role === 'user' ? 'You' : 'Assistant'}</div>
                  <div className="chatbot-widget-content">{message.content}</div>
                  {message.calls?.length > 0 && (
                    <div className="chatbot-widget-calls">
                      {message.calls.slice(0, 4).map((call, callIndex) => (
                        <span key={`${call.resource || call.path}-${callIndex}`}>{actionLabel(call)}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chatbot-widget-message assistant">
                <div className="chatbot-widget-bubble">
                  <div className="chatbot-widget-role">Assistant</div>
              <div className="chatbot-widget-content">Using app actions...</div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <div className="chatbot-widget-error">{error}</div>}

          <form className="chatbot-widget-input" onSubmit={submit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about the app or create a record with JSON..."
              rows={2}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submit(event);
                }
              }}
            />
            <button type="submit" disabled={loading || !input.trim()}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}
