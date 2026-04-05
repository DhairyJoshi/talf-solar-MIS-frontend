import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegister } from '../services/queries';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const registerMutation = useRegister();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    registerMutation.mutate({
      email,
      full_name: fullName,
      role,
      password
    }, {
      onSuccess: () => {
        navigate('/login');
      },
      onError: (err: any) => {
        setError(err.message || 'Registration failed');
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-solar-bg p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-linear-to-tr from-yellow-400 to-orange-600 rounded-full"></div>
          <span className="text-3xl font-bold text-white tracking-wide">Talf Solar <span className="font-light text-solar-accent">MIS</span></span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-solar-card shadow-2xl rounded-lg px-8 pt-6 pb-8 mb-4 border border-solar-border"
        >
          <h2 className="text-xl font-bold text-white mb-6 text-center">Create New Account</h2>

          <div className="mb-4">
            <label className="block text-solar-text text-sm font-bold mb-2">Full Name</label>
            <input
              className="input-field"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-solar-text text-sm font-bold mb-2">Email Address</label>
            <input
              className="input-field"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-solar-text text-sm font-bold mb-2">Password</label>
            <input
              className="input-field"
              type="password"
              placeholder="******************"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-solar-text text-sm font-bold mb-2">System Role</label>
            <select
              className="input-field"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="viewer">Viewer (Read-only)</option>
              <option value="operations">Operations (Data Management)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

          <div className="space-y-4">
            <button
              className="w-full bg-solar-accent hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50"
              type="submit"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Registering...' : 'Register Account'}
            </button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-solar-accent hover:underline">Already have an account? Sign In</Link>
            </div>
          </div>
        </form>
        <p className="text-center text-gray-600 text-xs">
          &copy;{new Date().getFullYear()} Talf Solar India. All rights reserved.
        </p>
      </div>
      <style>{`
        .input-field { width: 100%; background-color: #0D1B2A; border: 1px solid #415A77; border-radius: 4px; padding: 12px; color: white; outline: none; transition: border-color 150ms; }
        .input-field:focus { border-color: #FFD700; }
      `}</style>
    </div>
  );
};

export default RegisterPage;
