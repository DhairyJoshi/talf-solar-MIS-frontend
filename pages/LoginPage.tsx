
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogin } from '../services/queries';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-solar-bg">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 to-orange-600 rounded-full"></div>
            <span className="text-3xl font-bold text-white tracking-wide">Talf Solar <span className="font-light text-solar-accent">MIS</span></span>
        </div>
        
        <form 
          onSubmit={handleSubmit}
          className="bg-solar-card shadow-2xl rounded-lg px-8 pt-6 pb-8 mb-4 border border-solar-border"
        >
          <div className="mb-4">
            <label className="block text-solar-text text-sm font-bold mb-2" htmlFor="username">
              Username
            </label>
            <input
              className="input-field"
              id="username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="mb-6">
            <label className="block text-solar-text text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="input-field"
              id="password"
              type="password"
              placeholder="******************"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {loginMutation.error && <p className="text-red-500 text-xs italic mb-4">{loginMutation.error.message}</p>}
          <div className="flex items-center justify-between">
            <button
              className="w-full bg-solar-accent hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out disabled:opacity-50"
              type="submit"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
          <div className="text-center mt-6">
              <Link to="/register" className="text-sm text-solar-accent hover:underline">Don't have an account? Create one</Link>
          </div>
           <div className="text-center text-xs text-gray-500 mt-6">
             <p>Available users for demo:</p>
             <p>admin / password</p>
             <p>ops / password</p>
             <p>viewer / password</p>
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

export default LoginPage;
