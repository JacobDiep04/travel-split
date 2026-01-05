'use client';

import { useState } from 'react';

export default function Home() {
  const [trips, setTrips] = useState([
    { id: 1, name: 'NYC Trip', date: '2024-01-15', total: 450.50, settled: false },
    { id: 2, name: 'Beach Weekend', date: '2023-12-20', total: 320.00, settled: true },
  ]);

  const [outstandingPayments] = useState([
    { id: 1, person: 'Sarah', amount: 45.50, trip: 'NYC Trip' },
    { id: 2, person: 'Mike', amount: 32.25, trip: 'NYC Trip' },
  ]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Sidebar - Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 sticky top-0 h-screen">
        <h2 className="text-2xl font-bold mb-8 text-blue-500">TravelSplit</h2>
        
        <nav className="space-y-2">
          <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 font-semibold flex items-center gap-3 text-black">
            <span className="text-xl">🏠</span>
            Home
          </button>
          
          <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black">
            <span className="text-xl">🔍</span>
            Explore Trips
          </button>
          
          <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black">
            <span className="text-xl">🔔</span>
            Notifications
          </button>
          
          <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black">
            <span className="text-xl">💬</span>
            Messages
          </button>
          
          <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 flex items-center gap-3 text-black">
            <span className="text-xl">👤</span>
            Profile
          </button>
        </nav>

        <button className="w-full mt-6 bg-blue-500 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-600">
          New Trip
        </button>
      </aside>

      {/* Main Content - Trips Feed */}
      <main className="flex-1 max-w-2xl border-r border-gray-200">
        <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-gray-200 p-4">
          <h1 className="text-xl font-bold text-black">Your Trips</h1>
        </div>

        {/* Active Trips */}
        <div className="border-b border-gray-200 p-4">
          <h2 className="font-bold text-lg mb-3 text-black">Active Trips</h2>
          {trips.filter(trip => !trip.settled).map(trip => (
            <div key={trip.id} className="bg-white border border-gray-200 rounded-lg p-4 mb-3 hover:bg-gray-50 cursor-pointer">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-black">{trip.name}</h3>
                <span className="text-sm text-gray-500">{trip.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-black">Total expenses</span>
                <span className="font-bold text-green-600">${trip.total.toFixed(2)}</span>
              </div>
              <div className="mt-2 text-sm text-blue-500">
                View details →
              </div>
            </div>
          ))}
        </div>

        {/* Previous Trips */}
        <div className="p-4">
          <h2 className="font-bold text-lg mb-3 text-black">Previous Trips</h2>
          {trips.filter(trip => trip.settled).map(trip => (
            <div key={trip.id} className="bg-white border border-gray-200 rounded-lg p-4 mb-3 hover:bg-gray-50 cursor-pointer opacity-75">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-black">{trip.name}</h3>
                  <span className="text-xs text-green-600">✓ Settled</span>
                </div>
                <span className="text-sm text-gray-500">{trip.date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-black">Total expenses</span>
                <span className="font-bold text-black">${trip.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Right Sidebar - Outstanding Payments */}
      <aside className="w-80 bg-white p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="bg-gray-50 rounded-lg p-4">
          <h2 className="font-bold text-lg mb-4 text-black">You Owe</h2>
          
          {outstandingPayments.length > 0 ? (
            <div className="space-y-3">
              {outstandingPayments.map(payment => (
                <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-black">{payment.person}</span>
                    <span className="font-bold text-red-600">${payment.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">{payment.trip}</div>
                  <button className="w-full bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-blue-600">
                    Settle Up
                  </button>
                </div>
              ))}
              
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-black">Total Owed</span>
                  <span className="text-red-600">
                    ${outstandingPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">✓</div>
              <p>All settled up!</p>
            </div>
          )}
        </div>

        {/* People Owe You Section */}
        <div className="bg-gray-50 rounded-lg p-4 mt-4">
          <h2 className="font-bold text-lg mb-4 text-black">Owes You</h2>
          <div className="text-center text-gray-500 py-4">
            <p className="text-sm">No pending payments</p>
          </div>
        </div>
      </aside>
    </div>
  );
}