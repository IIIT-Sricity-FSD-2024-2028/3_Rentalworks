import React, { createContext, useContext, useState, useEffect } from 'react';
import { RAW_LISTINGS } from '../data/listingsData';

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const [selectedPG, setSelectedPG] = useState(() => {
    try {
      const stored = sessionStorage.getItem('rb_selected_pg');
      return stored ? JSON.parse(stored) : RAW_LISTINGS[0];
    } catch (_) {
      return RAW_LISTINGS[0];
    }
  });

  const [selectedRoom, setSelectedRoom] = useState(() => {
    try {
      const stored = sessionStorage.getItem('rb_selected_room');
      return stored ? JSON.parse(stored) : RAW_LISTINGS[0].rooms[1]; // default Double Sharing
    } catch (_) {
      return RAW_LISTINGS[0].rooms[1];
    }
  });

  const [selectedRoommate, setSelectedRoommate] = useState(null);
  const [guestLifestyleProfile, setGuestLifestyleProfile] = useState(() => {
    try {
      const stored = sessionStorage.getItem('rb_guest_lifestyle');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });
  const [moveInDate, setMoveInDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [duration, setDuration] = useState('6 Months');
  const [bookingFor, setBookingFor] = useState('self');
  const [friendDetails, setFriendDetails] = useState({ name: '', phone: '', email: '' });
  const [paymentMethod, setPaymentMethod] = useState('upi');

  const [lastConfirmedBooking, setLastConfirmedBooking] = useState(() => {
    try {
      const stored = sessionStorage.getItem('rb_last_confirmed');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });

  const [myBookings, setMyBookings] = useState(() => {
    try {
      const stored = localStorage.getItem('rb_my_bookings');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  const [myTransactions, setMyTransactions] = useState(() => {
    try {
      const stored = localStorage.getItem('rb_my_transactions');
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  useEffect(() => {
    if (selectedPG) sessionStorage.setItem('rb_selected_pg', JSON.stringify(selectedPG));
  }, [selectedPG]);

  useEffect(() => {
    if (selectedRoom) sessionStorage.setItem('rb_selected_room', JSON.stringify(selectedRoom));
  }, [selectedRoom]);

  useEffect(() => {
    if (guestLifestyleProfile) {
      sessionStorage.setItem('rb_guest_lifestyle', JSON.stringify(guestLifestyleProfile));
    }
  }, [guestLifestyleProfile]);

  useEffect(() => {
    if (lastConfirmedBooking) {
      sessionStorage.setItem('rb_last_confirmed', JSON.stringify(lastConfirmedBooking));
    }
  }, [lastConfirmedBooking]);

  useEffect(() => {
    localStorage.setItem('rb_my_bookings', JSON.stringify(myBookings));
  }, [myBookings]);

  useEffect(() => {
    localStorage.setItem('rb_my_transactions', JSON.stringify(myTransactions));
  }, [myTransactions]);

  const addConfirmedBooking = (bookingData, paymentData, credentials) => {
    const confirmedRecord = {
      ...bookingData,
      payment: paymentData,
      credentials,
      createdAt: new Date().toISOString(),
    };

    setLastConfirmedBooking(confirmedRecord);
    setMyBookings(prev => [confirmedRecord, ...prev]);

    if (paymentData) {
      const txnRecord = {
        id: paymentData.transactionId || `TXN-${Date.now().toString().slice(-6)}`,
        bookingId: bookingData.bookingCode || `BK-${bookingData.id}`,
        desc: `Booking: ${bookingData.property} (${bookingData.roomType})`,
        amount: paymentData.amount,
        status: 'Success',
        method: paymentData.method,
        date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
      setMyTransactions(prev => [txnRecord, ...prev]);
    }
  };

  const calculateTotal = () => {
    const rent = Number(selectedRoom?.rent) || 8500;
    const deposit = Number(selectedRoom?.deposit) || 3500;
    const fee = 500;
    return {
      rent,
      deposit,
      fee,
      total: rent + deposit + fee,
    };
  };

  return (
    <BookingContext.Provider
      value={{
        selectedPG,
        setSelectedPG,
        selectedRoom,
        setSelectedRoom,
        selectedRoommate,
        setSelectedRoommate,
        guestLifestyleProfile,
        setGuestLifestyleProfile,
        moveInDate,
        setMoveInDate,
        duration,
        setDuration,
        bookingFor,
        setBookingFor,
        friendDetails,
        setFriendDetails,
        paymentMethod,
        setPaymentMethod,
        lastConfirmedBooking,
        setLastConfirmedBooking,
        myBookings,
        myTransactions,
        addConfirmedBooking,
        calculateTotal,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
