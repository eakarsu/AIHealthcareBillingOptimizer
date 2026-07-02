import React, { useEffect, useRef, useState } from 'react';
import { getChatbotHistory, sendChatbotMessage } from '../services/api';
import './ChatbotPage.css';

const suggestions = [
  'What can this app do?',
  'Summarize dashboard metrics',
  'Show latest claims and denials',
  'Add a sample claim',
  'Create patient {"first_name":"Alex","last_name":"Morgan","insurance_provider":"Aetna"}',
  'What integrations are prepared?',
  'Show production gaps',
];

function actionLabel(call) {
  const verb = call.method === 'POST' ? 'Created' : call.method === 'GET' ? 'Viewed' : call.method === 'GUIDE' ? 'Guided' : 'Used';
  return `${verb} ${call.resource || 'App Module'}`;
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    getChatbotHistory()
      .then(res => {
        const history = res.data?.data || [];
        setMessages(history.map(item => ({
          id: item.id,
          role: item.role,
          content: item.message,
          calls: item.metadata?.calls || [],
        })));
      })
      .catch(() => setMessages([]));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const submit = async (event, forcedMessage) => {
    event?.preventDefault();
    const text = (forcedMessage || input).trim();
    if (!text || loading) return;

    setInput('');
    setError('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);

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
    <div className="chatbot-page">
      <div className="chatbot-header">
        <div>
          <h2>App Chatbot</h2>
          <p>Ask in plain English. The assistant works across app modules and can create records using app fields.</p>
        </div>
      </div>

      <div className="chatbot-layout">
        <aside className="chatbot-suggestions">
          <h3>Try Asking</h3>
          {suggestions.map(item => (
            <button key={item} type="button" onClick={(event) => submit(event, item)}>
              {item}
            </button>
          ))}
          <div className="chatbot-note">
            For creates, include JSON fields when you have them. Missing values use safe sample defaults for that app module.
          </div>
        </aside>

        <section className="chatbot-panel">
          <div className="chatbot-messages">
            {messages.length === 0 && (
              <div className="chatbot-empty">
                <h3>Ask what the app can do.</h3>
                <p>Examples: summarize claims, show denials, add a provider, list integrations, or explain production gaps.</p>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`chatbot-message ${message.role}`}>
                <div className="chatbot-bubble">
                  <div className="chatbot-role">{message.role === 'user' ? 'You' : 'Assistant'}</div>
                  <div className="chatbot-content">{message.content}</div>
                  {message.calls?.length > 0 && (
                    <div className="chatbot-calls">
                      {message.calls.map((call, callIndex) => (
                        <span key={`${call.resource || call.path}-${callIndex}`}>{actionLabel(call)}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chatbot-message assistant">
                <div className="chatbot-bubble">
                  <div className="chatbot-role">Assistant</div>
                  <div className="chatbot-content">Using app actions and preparing the answer...</div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <div className="chatbot-error">{error}</div>}

          <form className="chatbot-input-row" onSubmit={submit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about any app module or create a record with JSON..."
              rows={2}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submit(event);
                }
              }}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
