import React, { useState } from 'react';
import alfredAvatar from './assets/alfred-avatar.jpg';

export default function Login({ chatkit }) {
  const [name, setName] = useState('');
  let btnClasses = 'bg-primary text-white py-2 px-5 rounded-full text-lg';

  if (!name) {
    btnClasses += ' opacity-50 cursor-not-allowed';
  }

  const handleFormSubmit = e => {
    e.preventDefault();
    const userId = name.toLowerCase();
    // Create a new user

    chatkit
      .createUser({
        id: userId,
        name,
      })
      .then(() => {
        window.location.href = `?userId=${userId}`;
      })
      .catch(err => {
        if (err.error === 'services/chatkit/user_already_exists') {
          window.location.href = `?userId=${userId}`;
        }
      });
  };

  return (
    <div className="login">
      <img className="alfred-avatar" src={alfredAvatar} alt="Alfred" />
      <h1 className="text-2xl mt-3 mb-4 font-medium">Hi, I'm Alfred.</h1>
      <p className="text-lg">
        I'm your personal assistant. Ask me about the weather and more.
      </p>

      <form className="mt-6 text-center" onSubmit={handleFormSubmit}>
        <div className="mb-4">
          <input
            className="appearance-none border rounded-full py-3 px-4 text-gray-700 text-lg leading-tight focus:outline-none focus:shadow-outline"
            name="name"
            type="text"
            placeholder="Enter your name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>
        <button className={btnClasses} disabled={name ? false : true}>
          Start now
        </button>
      </form>
    </div>
  );
}
