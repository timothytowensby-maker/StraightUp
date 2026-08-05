'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import UserProfileSidebar from '@/components/UserProfileSidebar';
import type { NearbyUser } from '@/components/MapView';

// Leaflet cannot run server-side — load MapView only on the client.
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function MapPage() {
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);

  const handleUserClick = useCallback((user: NearbyUser) => {
    setSelectedUser(user);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedUser(null);
  }, []);

  const handleResonate = useCallback(async (moodId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/resonates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ mood_id: moodId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Unable to resonate. Please try again.');
      } else {
        setSelectedUser(null);
      }
    } catch {
      alert('Network error. Please try again.');
    }
  }, []);

  return (
    <>
      <MapView onUserClick={handleUserClick} />
      <UserProfileSidebar
        user={selectedUser}
        onClose={handleClose}
        onResonate={handleResonate}
      />
    </>
  );
}
