
import React, { useState, useEffect } from 'react';

interface AvatarProps {
  src: string;
  alt: string;
  name: string;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, name, className = "" }) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [hasError, setHasError] = useState(false);

  // Fallback URL generator (UI Avatars)
  const getFallbackUrl = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
  };

  // Proxy wrapper to bypass Instagram CORS/403
  const getProxiedUrl = (url: string) => {
    if (!url) return getFallbackUrl(name);
    // If it's already a UI Avatar or placeholder, return as is
    if (url.includes('ui-avatars.com') || url.includes('picsum.photos')) return url;
    
    // Use wsrv.nl as a proxy for Instagram images
    // This fetches the image server-side and serves it to us, bypassing browser Referer checks
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  };

  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
    }
  };

  const finalSrc = hasError ? getFallbackUrl(name) : getProxiedUrl(imgSrc);

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={`object-cover ${className}`}
      onError={handleError}
      loading="lazy"
    />
  );
};
