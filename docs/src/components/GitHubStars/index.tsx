import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import type { Props } from '@theme/NavbarItem';

export default function GitHubStars({ className }: Props) {
  const [stars, setStars] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const repo = 'alpic-ai/skybridge';

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const response = await fetch(`https://api.github.com/repos/${repo}`);
        if (response.ok) {
          const data = await response.json();
          setStars(data.stargazers_count);
        }
      } catch (error) {
        console.error('Failed to fetch GitHub stars:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStars();
  }, []);

  return (
    <Link
      href={`https://github.com/${repo}`}
      className="navbar__item navbar__link github-stars-link"
      aria-label={stars ? `GitHub repository with ${stars} stars` : 'GitHub repository'}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="github-stars-icon">⭐</span>
      <span className="github-stars-text">Star</span>
      {loading ? (
        <span className="github-stars-count">...</span>
      ) : stars !== null ? (
        <span className="github-stars-count">{stars.toLocaleString()}</span>
      ) : null}
    </Link>
  );
}

