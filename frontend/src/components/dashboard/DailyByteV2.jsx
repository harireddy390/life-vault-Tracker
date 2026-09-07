import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, BookOpen } from 'lucide-react';
import './DailyByteV2.css';

const TOPICS = ['python', 'javascript', 'dsa', 'system-design'];

const TOPIC_LABELS = {
  python:           '🐍 Python',
  javascript:       '🌐 JavaScript',
  dsa:              '🌳 DSA',
  'system-design':  '🏗 System Design',
};

const CONTENT = {
  python: [
    {
      question: 'What does `list(map(lambda x: x**2, range(5)))` return?',
      answer: '[0, 1, 4, 9, 16]',
      explanation: '`map` applies the lambda to each element in `range(5)` (0–4), squaring them. `list()` converts the map object to a list.',
      tryIt: 'print(list(map(lambda x: x**2, range(5))))',
      expected: '[0, 1, 4, 9, 16]',
    },
    {
      question: 'What is the output of `bool([]) or "hello"`?',
      answer: '"hello"',
      explanation: '`bool([])` is `False` (empty list is falsy). `False or "hello"` evaluates to "hello" because Python\'s `or` returns the first truthy value.',
      tryIt: 'print(bool([]) or "hello")',
      expected: 'hello',
    },
  ],
  javascript: [
    {
      question: 'What does `[..."abc"]` evaluate to?',
      answer: '["a", "b", "c"]',
      explanation: 'The spread operator (`...`) on a string iterates over its characters, expanding them into an array.',
      tryIt: 'console.log([..."abc"])',
      expected: '["a", "b", "c"]',
    },
    {
      question: 'What is `typeof null`?',
      answer: '"object"',
      explanation: 'This is a well-known JavaScript bug from the original implementation. `null` is not actually an object, but `typeof null` returns "object" for historical reasons.',
      tryIt: 'console.log(typeof null)',
      expected: '"object"',
    },
  ],
  dsa: [
    {
      question: 'What is the time complexity of binary search?',
      answer: 'O(log n)',
      explanation: 'Binary search divides the search space in half with each comparison. Starting from n elements, after k steps we have n/2^k elements, so k = log₂(n).',
      tryIt: 'def binary_search(arr, target):\n    l, r = 0, len(arr)-1\n    while l <= r:\n        mid = (l+r)//2\n        if arr[mid]==target: return mid\n        elif arr[mid]<target: l=mid+1\n        else: r=mid-1\n    return -1',
      expected: 'O(log n)',
    },
    {
      question: 'What data structure uses FIFO order?',
      answer: 'Queue',
      explanation: 'A Queue (First-In, First-Out) processes elements in the order they arrive. Think of a line at a checkout — first person in, first person out.',
      tryIt: 'from collections import deque\nq = deque()\nq.append(1); q.append(2)\nprint(q.popleft())',
      expected: '1',
    },
  ],
  'system-design': [
    {
      question: 'What is the CAP theorem?',
      answer: 'Consistency, Availability, Partition Tolerance — pick 2',
      explanation: 'CAP theorem states a distributed system can only guarantee two of: Consistency (all nodes see the same data), Availability (every request gets a response), Partition Tolerance (system continues during network splits). Modern systems choose CP (like MongoDB) or AP (like Cassandra).',
      tryIt: '// Think about: why can\'t you have all 3?\n// Network partition forces a choice:\n// - Stay consistent: reject some requests (sacrifice A)\n// - Stay available: return possibly stale data (sacrifice C)',
      expected: 'CP or AP system, depending on use-case',
    },
  ],
};

function todayIndex(arr) {
  return new Date().getDate() % arr.length;
}

export default function DailyByteV2({ topic = 'python', setTopic }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [tryCode, setTryCode] = useState('');
  const [understood, setUnderstood] = useState(false);

  const items = CONTENT[topic] || CONTENT.python;
  const item = items[todayIndex(items)];

  const handleTopicChange = (t) => {
    setTopic(t);
    setShowAnswer(false);
    setTryCode('');
    setUnderstood(false);
  };

  const markUnderstood = () => {
    const key = `lv_byte_streak`;
    const today = new Date().toISOString().slice(0, 10);
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    stored[today] = (stored[today] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(stored));
    setUnderstood(true);
  };

  return (
    <div className="card panel dbv2-card">
      <div className="dbv2-header">
        <p className="panel-eyebrow m-0"><BookOpen size={13} style={{ display: 'inline', marginRight: 4 }} />Daily Byte</p>
        <div className="dbv2-topics">
          {TOPICS.map(t => (
            <button
              key={t}
              className={`dbv2-topic-btn ${topic === t ? 'dbv2-topic-active' : ''}`}
              onClick={() => handleTopicChange(t)}
            >
              {TOPIC_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="dbv2-question">
        <p className="dbv2-q-label">Today's challenge:</p>
        <code className="dbv2-q-text">{item.question}</code>
      </div>

      {/* Reveal accordion */}
      <button
        className="dbv2-reveal-btn"
        onClick={() => setShowAnswer(v => !v)}
        aria-expanded={showAnswer}
      >
        {showAnswer ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        {showAnswer ? 'Hide' : 'Reveal'} Solution & Explanation
      </button>

      {showAnswer && (
        <div className="dbv2-answer">
          <div className="dbv2-answer-val">
            <span className="dbv2-answer-label">Answer:</span>
            <code>{item.answer}</code>
          </div>
          <p className="dbv2-explanation">{item.explanation}</p>
        </div>
      )}

      {/* Try It */}
      <div className="dbv2-try">
        <p className="dbv2-try-label">✏️ Try It</p>
        <textarea
          className="input dbv2-editor"
          value={tryCode || item.tryIt}
          onChange={e => setTryCode(e.target.value)}
          rows={4}
          spellCheck={false}
        />
        <div className="dbv2-expected">
          <span className="dbv2-exp-label">Expected output:</span>
          <code className="dbv2-exp-val">{item.expected}</code>
        </div>
      </div>

      {/* Mark understood */}
      {understood ? (
        <p className="dbv2-done"><CheckCircle size={14} /> Marked as understood! 🎉</p>
      ) : (
        <button className="btn btn-ghost dbv2-understood-btn" onClick={markUnderstood}>
          ✅ Mark as Understood
        </button>
      )}
    </div>
  );
}
