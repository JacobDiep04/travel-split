'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// Mock database - in a real app, this would be in a database or API
const mockTrips = {
  1: {
    id: 1,
    name: 'NYC Trip',
    date: '2024-01-15',
    total: 450.50,
    settled: false,
    participants: ['You', 'Sarah', 'Mike', 'Emma'],
    expenses: [
      { id: 1, description: 'Hotel', amount: 200, paidBy: 'You', date: '2024-01-15' },
      { id: 2, description: 'Dinner', amount: 120, paidBy: 'Sarah', date: '2024-01-15' },
      { id: 3, description: 'Taxi', amount: 45.50, paidBy: 'Mike', date: '2024-01-16' },
      { id: 4, description: 'Breakfast', amount: 85, paidBy: 'You', date: '2024-01-16' },
    ]
  },
  2: {
    id: 2,
    name: 'Beach Weekend',
    date: '2023-12-20',
    total: 320.00,
    settled: true,
    participants: ['You', 'Alex', 'Jordan'],
    expenses: [
      { id: 1, description: 'Beach House Rental', amount: 180, paidBy: 'You', date: '2023-12-20' },
      { id: 2, description: 'Groceries', amount: 85, paidBy: 'Alex', date: '2023-12-20' },
      { id: 3, description: 'Gas', amount: 55, paidBy: 'Jordan', date: '2023-12-21' },
    ]
  }
};

export default function TripDetails() {
  const params = useParams();
  const router = useRouter();
  const tripId = Number(params.id);

  // Get the trip data based on the ID from the URL
  const trip = mockTrips[tripId as keyof typeof mockTrips];

  // If trip doesn't exist, show error
  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">Trip Not Found</h1>
          <button 
            onClick={() => router.push('/')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Sidebar - Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 sticky top-0 h-screen">
        <h2 className="text-2xl font-bold mb-8 text-blue-500">TravelSplit</h2>
        
        <nav className="space-y-2">
          <button 
            onClick={() => router.push('/')}
            className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 font-semibold flex items-center gap-3 text-black"
          >
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

      {/* Main Content - Trip Details */}
      <main className="flex-1 max-w-2xl border-r border-gray-200">
        {/* Header */}
        <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-gray-200 p-4">
          <button 
            onClick={() => router.back()}
            className="text-blue-500 hover:text-blue-700 mb-2 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-black">{trip.name}</h1>
          <p className="text-sm text-gray-500">{trip.date}</p>
        </div>

        {/* Trip Summary */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-black">${trip.total.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-semibold text-green-600">
                {trip.settled ? '✓ Settled' : 'Active'}
              </p>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-lg mb-3 text-black">Participants</h2>
          <div className="flex flex-wrap gap-2">
            {trip.participants.map((person, index) => (
              <span 
                key={index} 
                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold"
              >
                {person}
              </span>
            ))}
          </div>
        </div>

        {/* Expenses List */}
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-lg text-black">Expenses</h2>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600">
              Add Expense
            </button>
          </div>
          
          <div className="space-y-3">
            {trip.expenses.map(expense => (
              <div key={expense.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-black">{expense.description}</h3>
                    <p className="text-sm text-gray-500">Paid by {expense.paidBy}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-black">${expense.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{expense.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Right Sidebar - Balance Summary */}
      <aside className="w-80 bg-white p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="bg-gray-50 rounded-lg p-4">
          <h2 className="font-bold text-lg mb-4 text-black">Balance Summary</h2>
          
          <div className="space-y-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">You paid</p>
              <p className="text-xl font-bold text-black">
                ${trip.expenses
                  .filter(e => e.paidBy === 'You')
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toFixed(2)}
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">Your share</p>
              <p className="text-xl font-bold text-black">
                ${(trip.total / trip.participants.length).toFixed(2)}
              </p>
            </div>
            
            <div className="bg-white border border-green-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">
                {trip.expenses.filter(e => e.paidBy === 'You').reduce((sum, e) => sum + e.amount, 0) > 
                 (trip.total / trip.participants.length) ? 'You are owed' : 'You owe'}
              </p>
              <p className="text-xl font-bold text-green-600">
                ${Math.abs(
                  trip.expenses.filter(e => e.paidBy === 'You').reduce((sum, e) => sum + e.amount, 0) - 
                  (trip.total / trip.participants.length)
                ).toFixed(2)}
              </p>
            </div>
          </div>

          <button className="w-full mt-4 bg-green-500 text-white px-4 py-3 rounded-lg font-bold hover:bg-green-600">
            Settle Trip
          </button>
        </div>
      </aside>
    </div>
  );
}