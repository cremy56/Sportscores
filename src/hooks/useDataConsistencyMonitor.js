import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useDataConsistencyMonitor(userRole) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Alleen administrators kunnen consistency notifications zien
    if (userRole !== 'administrator') {
      setNotifications([]);
      setLoading(false);
      return;
    }
    
    const q = query(
      collection(db, 'notifications'),
      where('type', '==', 'data_consistency_error'),
      where('read', '==', false)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(newNotifications);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching consistency notifications:', error);
      setLoading(false);
    });
    
    return unsubscribe;
  }, [userRole]);
  
  return { notifications, loading };
}