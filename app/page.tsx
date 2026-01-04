'use client';

import { useState } from 'react';

export default function Home() {
  const [expenses, setExpenses] = useState<Array<{
    id: number;
    description: string;
    amount: number;
    paidBy: string;
  }>>([]);

  const addExpense = () => {
    const description = prompt('What was the expense?');
    const amount = parseFloat(prompt('How much?') || '0');
    const paidBy = prompt('Who paid?');
    
    if (description && amount && paidBy) {
      setExpenses([...expenses, {
        id: Date.now(),
        description,
        amount,
        paidBy
      }]);
    }
  };

  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Travel Split</h1>
      
      <button 
        onClick={addExpense}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg mb-6 hover:bg-blue-600"
      >
        Add Expense
      </button>

      <div className="space-y-3">
        {expenses.map(exp => (
          <div key={exp.id} className="border p-4 rounded-lg">
            <div className="font-semibold">{exp.description}</div>
            <div className="text-sm text-gray-600">
              ${exp.amount.toFixed(2)} paid by {exp.paidBy}
            </div>
          </div>
        ))}
      </div>

      {expenses.length > 0 && (
        <div className="mt-6 text-xl font-bold">
          Total: ${total.toFixed(2)}
        </div>
      )}
    </main>
  );
}