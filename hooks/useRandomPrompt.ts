import { useState } from 'react';

const VIBE_PROMPTS = [
  "What's something you wish people asked you more?",
  "Describe your current vibe in one sentence.",
  "What's on your mind right now?",
  "If your mood was a song, what would it be?",
  "What's your unpopular opinion today?",
  "What's making you laugh lately?",
  "What's something you're curious about?",
  "What's the vibe right now?",
  "How are you REALLY doing?",
  "What would make today better?",
];

export function useRandomPrompt() {
  const [prompt, setPrompt] = useState<string>(
    VIBE_PROMPTS[Math.floor(Math.random() * VIBE_PROMPTS.length)]
  );

  const getNewPrompt = () => {
    let newPrompt = prompt;
    while (newPrompt === prompt) {
      newPrompt = VIBE_PROMPTS[Math.floor(Math.random() * VIBE_PROMPTS.length)];
    }
    setPrompt(newPrompt);
    return newPrompt;
  };

  return { prompt, getNewPrompt };
}
