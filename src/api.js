import { supabase } from './supabaseClient.js';

// --- PRODUK ---
export async function getProducts() {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('Error getProducts:', error);
    return [];
  }
  return data;
}

export async function addProduct(product) {
  const { data, error } = await supabase.from('products').insert([product]).select();
  if (error) throw error;
  return data[0];
}

export async function updateProduct(id, updates) {
  const { data, error } = await supabase.from('products').update(updates).eq('id', id).select();
  if (error) throw error;
  return data[0];
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// --- TRANSAKSI (HISTORY) ---
export async function getTransactions() {
  const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
  if (error) {
    console.error('Error getTransactions:', error);
    return [];
  }
  return data;
}

export async function addTransaction(transaction) {
  const { data, error } = await supabase.from('transactions').insert([transaction]).select();
  if (error) throw error;
  return data[0];
}

// --- PENGELUARAN (EXPENSES) ---
export async function getExpenses() {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (error) {
    console.error('Error getExpenses:', error);
    return [];
  }
  return data;
}

export async function addExpense(expense) {
  const { data, error } = await supabase.from('expenses').insert([expense]).select();
  if (error) throw error;
  return data[0];
}

export async function updateExpense(id, updates) {
  const { data, error } = await supabase.from('expenses').update(updates).eq('id', id).select();
  if (error) throw error;
  return data[0];
}
