'use client';

import Image from 'next/image';
import { JokePayload, formatJoke, getJokeEmoji } from '@/lib/joke-utils';

interface JokeCardProps {
  joke: JokePayload;
}

const CATEGORY_GIFS: Record<string, string> = {
  Programming: 'https://media.giphy.com/media/fAnEC88LccN7a/giphy.gif',
  Pun: 'https://media.giphy.com/media/3ohs7KViF6rA4aan5u/giphy.gif',
  Misc: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
};

export function JokeCard({ joke }: JokeCardProps) {
  const gif = CATEGORY_GIFS[joke.category];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">{getJokeEmoji(joke.category)} {joke.category}</h2>
        {!joke.safe && <span className="badge">Mature</span>}
      </div>

      {gif && (
        <Image
          src={gif}
          alt="Category illustration"
          width={800}
          height={320}
          loading="lazy"
          className="w-full h-40 object-cover rounded-lg mb-4"
        />
      )}

      {joke.setup ? <p className="text-lg text-vibe-100 mb-3">{formatJoke(joke.setup)}</p> : null}
      {joke.delivery ? <p className="text-2xl font-semibold">{formatJoke(joke.delivery)}</p> : null}
      {!joke.setup && joke.joke ? <p className="text-xl">{formatJoke(joke.joke)}</p> : null}
    </div>
  );
}
