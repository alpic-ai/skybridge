"use client";

import { useState } from "react";

const VIDEO_ID = "9X8GRGcl5oA";
const POSTER_HI = `https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`;
const POSTER_FALLBACK = `https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`;

export function VideoSection() {
  const [playing, setPlaying] = useState(false);
  const [posterSrc, setPosterSrc] = useState(POSTER_HI);

  return (
    <section className="sb-section" id="video" style={{ paddingTop: 88 }}>
      <div className="sb-wrap">
        <div className="sb-section-header">
          <div className="sb-section-eyebrow">Watch</div>
          <h2 className="sb-section-title">
            See <span className="sb-accent">Skybridge</span> in action
          </h2>
          <p className="sb-section-lede">
            Discover this step-by-step tutorial made by one of our power users.
          </p>
        </div>
        <div className="sb-video">
          <div className="sb-video-frame">
            {playing ? (
              <iframe
                className="sb-video-iframe"
                src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
                title="Skybridge demo"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                className="sb-video-poster"
                aria-label="Play Skybridge demo video"
                onClick={() => setPlaying(true)}
              >
                <img
                  src={posterSrc}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={() => {
                    if (posterSrc !== POSTER_FALLBACK) {
                      setPosterSrc(POSTER_FALLBACK);
                    }
                  }}
                />
                <span className="sb-video-play" aria-hidden="true">
                  <svg viewBox="0 0 68 48" width="68" height="48">
                    <path
                      d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74 0.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
                      fill="#212121"
                      fillOpacity="0.85"
                    />
                    <path d="M27 34V14l18 10-18 10z" fill="#fff" />
                  </svg>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
