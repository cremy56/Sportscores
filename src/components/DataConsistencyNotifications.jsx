import React from 'react';
import { useDataConsistencyMonitor } from '../hooks/useDataConsistencyMonitor';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export function DataConsistencyNotifications({ userRole }) {
  const { notifications, loading } = useDataConsistencyMonitor(userRole);

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (loading) {
    return <div>Loading notifications...</div>;
  }

  if (notifications.length === 0) {
    return null; // Geen meldingen = geen component
  }

  return (
    <div className="data-consistency-alerts">
      <div className="alert alert-warning">
        <h4>⚠️ Data Consistency Problemen ({notifications.length})</h4>
        {notifications.map(notification => (
          <div key={notification.id} className="notification-item">
            <p><strong>Melding:</strong> {notification.message}</p>
            <p><small>Tijd: {notification.timestamp?.toDate().toLocaleString()}</small></p>
            {notification.error && (
              <p><small>Error: {notification.error}</small></p>
            )}
            <button 
              onClick={() => markAsRead(notification.id)}
              className="btn btn-sm btn-outline-primary"
            >
              Als gelezen markeren
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}