'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function TripDetails() {
  const params = useParams();
  const router = useRouter();
  const tripId = Number(params.id);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [trip, setTrip] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  
  // Add member modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    checkUser();
    fetchTripData();
  }, [tripId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchTripData = async () => {
    try {
      setLoading(true);

      // Fetch trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;
      setTrip(tripData);

      // Check if current user is the owner
      const { data: { user } } = await supabase.auth.getUser();
      setIsOwner(tripData.user_id === user?.id);

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('trip_id', tripId);

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: false });

      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);
    } catch (error) {
      console.error('Error fetching trip data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    setAddingMember(true);
    try {
      const { error } = await supabase
        .from('participants')
        .insert([
          {
            trip_id: tripId,
            name: newMemberName.trim()
          }
        ]);

      if (error) throw error;

      setNewMemberName('');
      setShowAddMemberModal(false);
      fetchTripData(); // Refresh data
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member. Please try again.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (participantId: number, participantName: string) => {
    // Check if trying to remove self (owner)
    const ownerName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || '';
    if (participantName === ownerName) {
      alert('You cannot remove yourself as the trip owner. Transfer ownership or delete the trip instead.');
      return;
    }

    // Check if participant has any expenses
    const hasExpenses = expenses.some(exp => exp.paid_by === participantName);
    
    if (hasExpenses) {
      alert(`Cannot remove ${participantName} because they have expenses associated with this trip. Please delete their expenses first.`);
      return;
    }

    if (!confirm(`Are you sure you want to remove ${participantName} from this trip?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      fetchTripData(); // Refresh data
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member. Please try again.');
    }
  };

  const handleDeleteExpense = async (expenseId: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      // Recalculate trip total
      const { data: remainingExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('trip_id', tripId);

      const total = remainingExpenses?.reduce((sum, exp) => {
        return Math.round((sum + parseFloat(exp.amount)) * 100) / 100;
      }, 0) || 0;

      await supabase
        .from('trips')
        .update({ total })
        .eq('id', tripId);

      fetchTripData(); // Refresh data
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense. Please try again.');
    }
  };

  const calculateSettlements = () => {
    const balances: { [key: string]: number } = {};
    
    participants.forEach(p => {
      balances[p.name] = 0;
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const perPersonShare = totalExpenses / participants.length;

    expenses.forEach(expense => {
      const paidBy = expense.paid_by;
      const amount = parseFloat(expense.amount);
      balances[paidBy] = (balances[paidBy] || 0) + amount;
    });

    participants.forEach(p => {
      balances[p.name] -= perPersonShare;
    });

    const creditors: { name: string; amount: number }[] = [];
    const debtors: { name: string; amount: number }[] = [];

    Object.entries(balances).forEach(([name, balance]) => {
      const roundedBalance = Math.round(balance * 100) / 100;
      if (roundedBalance > 0.01) {
        creditors.push({ name, amount: roundedBalance });
      } else if (roundedBalance < -0.01) {
        debtors.push({ name, amount: Math.abs(roundedBalance) });
      }
    });

    const settlementsArray: { from: string; to: string; amount: number }[] = [];
    
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];
      
      const settlementAmount = Math.min(creditor.amount, debtor.amount);
      
      if (settlementAmount > 0.01) {
        settlementsArray.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(settlementAmount * 100) / 100
        });
      }

      creditor.amount -= settlementAmount;
      debtor.amount -= settlementAmount;

      if (creditor.amount < 0.01) i++;
      if (debtor.amount < 0.01) j++;
    }

    return settlementsArray;
  };

  const handleSettleTrip = async () => {
    const calculatedSettlements = calculateSettlements();
    setSettlements(calculatedSettlements);
    setShowSettleModal(true);
  };

  const confirmSettle = async () => {
    setSettling(true);
    try {
      const paymentRecords = settlements.map(settlement => ({
        trip_id: tripId,
        from_person: settlement.from,
        to_person: settlement.to,
        amount: settlement.amount,
        settled: false
      }));

      if (paymentRecords.length > 0) {
        const { error: paymentsError } = await supabase
          .from('payments')
          .insert(paymentRecords);

        if (paymentsError) throw paymentsError;
      }

      const { error: tripError } = await supabase
        .from('trips')
        .update({ settled: true })
        .eq('id', tripId);

      if (tripError) throw tripError;

      setShowSettleModal(false);
      fetchTripData();
      alert('Trip settled successfully!');
    } catch (error) {
      console.error('Error settling trip:', error);
      alert('Failed to settle trip. Please try again.');
    } finally {
      setSettling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-black">Loading trip...</div>
      </div>
    );
  }

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

  const totalPaid = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const participantCount = participants.length || 1;
  const perPersonShare = totalPaid / participantCount;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-black mb-4">Add Member</h2>
            
            <form onSubmit={handleAddMember}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Member Name
                </label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setNewMemberName('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {addingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-black mb-4">Settle Trip</h2>
            
            {settlements.length > 0 ? (
              <>
                <p className="text-gray-600 mb-4">
                  Here's how to settle all expenses:
                </p>
                
                <div className="space-y-3 mb-6">
                  {settlements.map((settlement, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-black">{settlement.from}</span>
                          <span className="text-gray-500">→</span>
                          <span className="font-semibold text-black">{settlement.to}</span>
                        </div>
                        <span className="font-bold text-green-600">
                          ${settlement.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-gray-500 mb-6">
                  Once you confirm, this trip will be marked as settled and payment reminders will be created.
                </p>
              </>
            ) : (
              <div className="text-center py-4 mb-6">
                <div className="text-4xl mb-2">✓</div>
                <p className="text-gray-600">All expenses are already balanced!</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowSettleModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmSettle}
                disabled={settling}
                className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400"
              >
                {settling ? 'Settling...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-black">{trip.name}</h1>
              <p className="text-sm text-gray-500">{trip.date}</p>
            </div>
            {isOwner && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                Owner
              </span>
            )}
          </div>
        </div>

        {/* Trip Summary */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-black">${totalPaid.toFixed(2)}</p>
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
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-lg text-black">Participants</h2>
            {isOwner && !trip.settled && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600"
              >
                + Add Member
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {participants.length > 0 ? (
              participants.map((person) => (
                <div 
                  key={person.id} 
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2"
                >
                  <span>{person.name}</span>
                  {isOwner && !trip.settled && (
                    <button
                      onClick={() => handleRemoveMember(person.id, person.name)}
                      className="text-red-600 hover:text-red-800 font-bold"
                      title="Remove member"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No participants added yet</p>
            )}
          </div>
        </div>

        {/* Expenses List */}
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-lg text-black">Expenses</h2>
            {!trip.settled && (
              <button 
                onClick={() => router.push(`/trips/${tripId}/expenses/new`)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600"
              >
                Add Expense
              </button>
            )}
          </div>
          
          {expenses.length > 0 ? (
            <div className="space-y-3">
              {expenses.map(expense => (
                <div key={expense.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-black">{expense.description}</h3>
                      <p className="text-sm text-gray-500">Paid by {expense.paid_by}</p>
                    </div>
                    <div className="text-right flex items-start gap-2">
                      <div>
                        <p className="font-bold text-lg text-black">${parseFloat(expense.amount).toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{expense.date}</p>
                      </div>
                      {isOwner && !trip.settled && (
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Delete expense"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No expenses yet. Add your first expense!</p>
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar - Balance Summary */}
      <aside className="w-80 bg-white p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="bg-gray-50 rounded-lg p-4">
          <h2 className="font-bold text-lg mb-4 text-black">Balance Summary</h2>
          
          <div className="space-y-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">Total expenses</p>
              <p className="text-xl font-bold text-black">${totalPaid.toFixed(2)}</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">Per person share</p>
              <p className="text-xl font-bold text-black">${perPersonShare.toFixed(2)}</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">Participants</p>
              <p className="text-xl font-bold text-black">{participantCount}</p>
            </div>
          </div>

          {isOwner && (
            <button 
              onClick={handleSettleTrip}
              disabled={trip.settled || expenses.length === 0}
              className="w-full mt-4 bg-green-500 text-white px-4 py-3 rounded-lg font-bold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {trip.settled ? 'Trip Settled' : 'Settle Trip'}
            </button>
          )}

          {trip.settled && (
            <p className="text-center text-sm text-gray-500 mt-2">
              This trip has been settled
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}